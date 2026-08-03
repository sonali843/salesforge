const { prisma } = require("../config/postgres");
const { AppError } = require("../middleware/errorHandler");
const asyncHandler = require("../utils/asyncHandler");
const response = require("../utils/response");
const { getPlan, currentPeriod, checkLimit } = require("../utils/planLimits");
const { dispatchNotification } = require("../services/notificationService");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    return null;
  }
  try {
    return new Razorpay({ key_id, key_secret });
  } catch (err) {
    console.error("Failed to initialize Razorpay SDK:", err);
    return null;
  }
};

const PLAN_PRICING = {
  FREE: { monthly: 0, yearly: 0, features: ["Up to 100 leads", "Basic search tools", "1 team member"] },
  STARTER: { monthly: 29, yearly: 290, features: ["Up to 1,000 leads", "All search tools", "5 team members", "API access"] },
  PRO: { monthly: 99, yearly: 990, features: ["Up to 10,000 leads", "Advanced analytics", "25 team members", "Webhooks", "Priority support"] },
  ENTERPRISE: { monthly: null, yearly: null, features: ["Unlimited leads", "Custom integrations", "Dedicated support", "SLA", "SSO"] },
};

// ---------------------------------------------------------------------------
// Idempotency key generation.
//
// Production payment integrations (Stripe, Razorpay-based platforms, etc.)
// never rely on "check if a row exists, then insert" — that has a race
// condition: two near-simultaneous requests can both pass the check before
// either has written its row, producing duplicates anyway.
//
// Instead we compute a deterministic key for each logical payment attempt and
// let the DATABASE enforce uniqueness via a unique index. The write becomes
// an upsert: "insert this row, or if the key already exists, just return the
// existing one" — atomic, race-proof, no duplicates possible.
// ---------------------------------------------------------------------------
const buildIdempotencyKey = ({ orgId, razorpay_payment_id, razorpay_order_id, reason }) => {
  if (razorpay_payment_id) {
    // Razorpay's own unique ID for this exact attempt — the strongest
    // possible key. Present on nearly all events, including most declines.
    return `pay_${razorpay_payment_id}`;
  }

  // Rare fallback: a failure with no payment_id at all (e.g. rejected before
  // reaching the gateway). Bucket into a small time window so a genuine
  // duplicate *event* firing twice for the same decline collapses into one
  // row, while a real retry (which takes the user several seconds to re-enter
  // card details) naturally lands in a different bucket and gets its own row.
  const bucket = Math.floor(Date.now() / 3000);
  const raw = `${orgId}_${razorpay_order_id || "no_order"}_${reason || "no_reason"}_${bucket}`;
  return `failbucket_${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
};

const getCurrentSubscription = asyncHandler(async (req, res) => {
  const sub = await prisma.subscription.findFirst({
    where: { OR: [{ userId: req.user.id }, { orgId: req.orgId }] },
    orderBy: { createdAt: "desc" },
  });
  const org = await prisma.organization.findUnique({ where: { id: req.orgId } });
  const plan = sub?.plan || org?.plan || "FREE";
  return response.success(res, {
    plan,
    status: sub?.status || org?.status || "TRIALING",
    currentPeriodStart: sub?.currentPeriodStart,
    currentPeriodEnd: sub?.currentPeriodEnd,
    trialEndsAt: sub?.trialEndsAt || org?.trialEndsAt,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd || false,
    pricing: PLAN_PRICING[plan] || PLAN_PRICING.FREE,
    limits: getPlan(plan),
  });
});

const listPlans = asyncHandler(async (req, res) => {
  return response.success(res, Object.entries(PLAN_PRICING).map(([id, info]) => ({
    id,
    ...info,
  })));
});

const activatePlan = async ({ userId, orgId, plan, interval, price, paymentRef, status = "SUCCEEDED" }) => {
  const start = new Date();
  const end = new Date(start);
  if (interval === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);

  const existingByUser = await prisma.subscription.findUnique({ where: { userId } });

  const sub = existingByUser
    ? await prisma.subscription.update({
        where: { userId },
        data: { orgId, plan, status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end, cancelAtPeriodEnd: false },
      })
    : await prisma.subscription.create({
        data: { userId, orgId, plan, status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end },
      });

  await prisma.organization.update({ where: { id: orgId }, data: { plan, status: "ACTIVE" } });

  if (price > 0) {
    // FIX: idempotent write. If verifyPayment is ever called twice for the
    // same razorpay_payment_id (double-fired handler, client retry, etc.),
    // this guarantees only one Payment row is ever created for it.
    const idempotencyKey = paymentRef ? `pay_${paymentRef}` : null;
    if (idempotencyKey) {
      await prisma.payment.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          userId, orgId, amount: price, currency: "INR", status,
          description: `${plan} (${interval})`,
          stripePaymentId: paymentRef,
          idempotencyKey,
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          userId, orgId, amount: price, currency: "INR", status,
          description: `${plan} (${interval})`,
          stripePaymentId: paymentRef,
        },
      });
    }
  }

  await dispatchNotification({
    userId,
    orgId,
    type: "BILLING_UPDATE",
    category: "billing",
    message: `Your workspace has been upgraded to ${plan}.`,
    link: "/app/settings/billing",
  });

  return sub;
};

const createOrder = asyncHandler(async (req, res) => {
  const { plan, interval = "monthly" } = req.body;
  if (!PLAN_PRICING[plan]) throw new AppError("Invalid plan.", 400);
  const price = PLAN_PRICING[plan][interval];

  if (price === null) {
    return response.success(res, { contactSales: true, message: "Our team will reach out to set up Enterprise." });
  }
  if (price === 0) {
    const sub = await activatePlan({ userId: req.user.id, orgId: req.orgId, plan, interval, price: 0, paymentRef: null, status: "SUCCEEDED" });
    return response.success(res, { free: true, subscription: sub });
  }

  const amountPaise = Math.round(price * 100);
  if (amountPaise < 100) {
    throw new AppError("Minimum order amount is 100 paise (₹1).", 400);
  }

  const rzp = getRazorpayInstance();
  if (!rzp) {
    throw new AppError("Razorpay payment gateway is not configured on backend.", 500);
  }

  try {
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `org_${req.orgId}_${Date.now()}`,
      payment_capture: 1,
      notes: { plan, interval, orgId: String(req.orgId), userId: String(req.user.id) },
    });

    return response.success(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
      interval,
    });
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    throw new AppError(`Razorpay order creation failed: ${err.message || "Unknown error"}`, 500);
  }
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, interval = "monthly" } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new AppError("Missing payment verification fields.", 400);
  }
  if (!PLAN_PRICING[plan]) throw new AppError("Invalid plan.", 400);
  const price = PLAN_PRICING[plan][interval];
  if (price === null || price === undefined) throw new AppError("Invalid plan/interval.", 400);

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new AppError("Razorpay key secret is not configured.", 500);
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    await dispatchNotification({
      userId: req.user.id,
      orgId: req.orgId,
      type: "PAYMENT_FAILED",
      category: "billing",
      message: `Payment failed or could not be verified.`,
      link: "/app/settings/billing",
    });
    throw new AppError("Payment verification failed. Signature mismatch.", 400);
  }

  const rzp = getRazorpayInstance();
  let paymentStatus = "captured";

  if (rzp) {
    try {
      const payment = await rzp.payments.fetch(razorpay_payment_id);
      paymentStatus = payment.status;
    } catch (e) {
      console.warn("Could not fetch payment status from Razorpay API, proceeding with signature-verified activation:", e.message || e);
    }
  }

  if (paymentStatus === "captured" || paymentStatus === "authorized") {
    const sub = await activatePlan({ userId: req.user.id, orgId: req.orgId, plan, interval, price, paymentRef: razorpay_payment_id, status: "SUCCEEDED" });
    await dispatchNotification({
      userId: req.user.id, orgId: req.orgId, type: "PAYMENT_RECEIVED", category: "billing",
      message: `Payment of ₹${price} received successfully.`, link: "/app/settings/billing",
    });
    return response.success(res, { subscription: sub, charged: price, status: "SUCCEEDED" });
  }

  if (paymentStatus === "failed") {
    // FIX: idempotent write, same reasoning as recordFailedPayment below.
    const idempotencyKey = buildIdempotencyKey({ orgId: req.orgId, razorpay_payment_id, razorpay_order_id, reason: "verify_failed" });
    await prisma.payment.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        userId: req.user.id, orgId: req.orgId, amount: price, currency: "INR", status: "FAILED",
        description: `${plan} (${interval})`, stripePaymentId: razorpay_payment_id, idempotencyKey,
      },
    });
    await dispatchNotification({
      userId: req.user.id, orgId: req.orgId, type: "PAYMENT_FAILED", category: "billing",
      message: `Payment of ₹${price} failed.`, link: "/app/settings/billing",
    });
    throw new AppError("Payment failed. Please try again.", 400);
  }

  {
    const idempotencyKey = buildIdempotencyKey({ orgId: req.orgId, razorpay_payment_id, razorpay_order_id, reason: "verify_pending" });
    await prisma.payment.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        userId: req.user.id, orgId: req.orgId, amount: price, currency: "INR", status: "PENDING",
        description: `${plan} (${interval})`, stripePaymentId: razorpay_payment_id, idempotencyKey,
      },
    });
  }
  return response.success(res, { status: "PENDING", message: "Payment is still processing." });
});

const cancel = asyncHandler(async (req, res) => {
  const sub = await prisma.subscription.findFirst({ where: { orgId: req.orgId } });
  if (!sub) throw new AppError("No active subscription.", 404);
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true, status: "ACTIVE" },
  });
  return response.success(res, { message: "Subscription will remain active until the current billing period ends." });
});

const listPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where: { orgId: req.orgId },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.payment.count({ where: { orgId: req.orgId } }),
  ]);
  return response.paginated(res, items, total, page, limit);
});

const usage = asyncHandler(async (req, res) => {
  const period = currentPeriod();
  const records = await prisma.usageRecord.findMany({
    where: { orgId: req.orgId, period },
  });
  const plan = (await prisma.organization.findUnique({ where: { id: req.orgId } }))?.plan || "FREE";
  const limits = getPlan(plan);
  const summary = {};
  for (const [resource, limit] of Object.entries(limits)) {
    const used = records
      .filter((r) => r.resource === resource)
      .reduce((sum, r) => sum + r.count, 0);
    const check = checkLimit(plan, resource, used);
    summary[resource] = { used, limit: check.limit, allowed: check.allowed };
  }
  return response.success(res, { period, plan, usage: summary });
});

const createInvoice = asyncHandler(async (req, res) => {
  const { amount = 99 } = req.body;
  const invoice = await prisma.invoice.create({
    data: {
      orgId: req.orgId,
      amount: Number(amount),
      status: "DRAFT",
      dueAt: new Date(Date.now() + 30 * 86400000),
      number: `INV-${Date.now()}`,
    }
  });

  await dispatchNotification({
    userId: req.user.id,
    orgId: req.orgId,
    type: "INVOICE_CREATED",
    category: "billing",
    message: `New invoice #${invoice.number} created for ₹${amount}.`,
    link: "/app/settings/billing",
  });

  return response.created(res, invoice);
});

const clearPaymentHistory = asyncHandler(async (req, res) => {
  const result = await prisma.payment.deleteMany({ where: { orgId: req.orgId } });
  return response.success(res, { deleted: result.count });
});

const recordFailedPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, plan, interval = "monthly", reason, status = "FAILED" } = req.body;
  const normalizedPlan = String(plan || "STARTER").toUpperCase();
  const price = PLAN_PRICING[normalizedPlan] ? (PLAN_PRICING[normalizedPlan][interval] ?? 29) : 29;
  const orderId = razorpay_order_id || razorpay_payment_id || `failed_${Date.now()}`;
  const paymentStatus = status?.toUpperCase() === "PENDING" ? "PENDING" : "FAILED";

  const rzp = getRazorpayInstance();
  if (rzp && razorpay_order_id) {
    try {
      await rzp.orders.fetch(razorpay_order_id);
    } catch (e) {
      console.warn("Could not fetch order details from Razorpay, proceeding to record payment status:", e.message || e);
    }
  }

  // FIX: this is the actual production fix for the duplicate-row bug.
  // Previously this always called prisma.payment.create(), so any repeat
  // call to this endpoint (duplicate Razorpay payment.failed event, a
  // network retry, etc.) silently produced a second identical row.
  //
  // upsert() on a DB-enforced unique idempotencyKey is atomic: if two
  // requests for the same attempt race each other, Postgres itself resolves
  // the conflict — there's no window where both can "pass a check" and both
  // insert, unlike a naive findFirst-then-create approach.
  const idempotencyKey = buildIdempotencyKey({
    orgId: req.orgId,
    razorpay_payment_id,
    razorpay_order_id,
    reason,
  });

  const payment = await prisma.payment.upsert({
    where: { idempotencyKey },
    update: {}, // duplicate event for the same attempt — leave the existing row untouched
    create: {
      userId: req.user.id,
      orgId: req.orgId,
      amount: price,
      currency: "INR",
      status: paymentStatus,
      description: `${normalizedPlan} (${interval})${reason ? " — " + reason : ""}`,
      stripePaymentId: orderId,
      idempotencyKey,
    },
  });

  try {
    await dispatchNotification({
      userId: req.user.id,
      orgId: req.orgId,
      type: paymentStatus === "PENDING" ? "PAYMENT_PENDING" : "PAYMENT_FAILED",
      category: "billing",
      message: `Payment of ₹${price} status: ${paymentStatus.toLowerCase()}${reason ? " (" + reason + ")" : "."}`,
      link: "/app/settings/billing",
    });
  } catch (e) {
    console.warn("Could not dispatch notification for failed payment:", e.message || e);
  }

  return response.success(res, { recorded: true, payment });
});

module.exports = { getCurrentSubscription, listPlans, createOrder, verifyPayment, recordFailedPayment, cancel, listPayments, usage, createInvoice, clearPaymentHistory, PLAN_PRICING };