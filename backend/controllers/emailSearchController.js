const dns = require("dns").promises;
const { prisma } = require("../config/postgres");
const { createNotification } = require("../services/notificationService");
const { recordAudit } = require("../services/auditService");
const { incrementUsage } = require("../services/usageService");
const { publish } = require("../services/webhookService");
const asyncHandler = require("../utils/asyncHandler");
const response = require("../utils/response");
const { AppError } = require("../middleware/errorHandler");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isDisposable = (domain) => {
  // Lightweight disposable email check (extend in production).
  const list = new Set(["mailinator.com", "guerrillamail.com", "tempmail.io", "10minutemail.com"]);
  return list.has(domain.toLowerCase());
};

const emailSearch = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!emailRegex.test(email)) throw new AppError("A valid email address is required.", 400);
  const domain = email.split("@")[1];

  const [mxRecords, aRecords] = await Promise.allSettled([
    dns.resolveMx(domain),
    dns.resolve4(domain).catch(() => []),
  ]);
  const mx = mxRecords.status === "fulfilled" ? mxRecords.value : [];
  const a = aRecords.status === "fulfilled" ? aRecords.value : [];
  const hasMx = mx.length > 0;
  const hasA = a.length > 0;
  let deliverability = "deliverable";
  if (!hasMx && !hasA) deliverability = "undeliverable";
  else if (!hasMx) deliverability = "no_mx";
  else if (isDisposable(domain)) deliverability = "disposable";

  const record = await prisma.emailSearch.create({
    data: { email, domain, valid: hasMx || hasA, verifiedBy: "dns", userId: req.user.id, orgId: req.orgId },
  });
  await prisma.analyticsEvent.create({
    data: { userId: req.user.id, orgId: req.orgId, type: "EMAIL_SEARCH", resource: "email" },
  });
  await incrementUsage({ userId: req.user.id, orgId: req.orgId, resource: "searches" });
  await createNotification({
    userId: req.user.id,
    type: "EMAIL_SEARCH",
    message: `Email lookup completed for ${email}.`,
    link: "/app/search/email",
    metadata: { deliverability, recordId: record.id },
  });
  await recordAudit({
    userId: req.user.id, orgId: req.orgId,
    action: "search.email", entityType: "EmailSearch", entityId: record.id,
  });
  await publish({ orgId: req.orgId, event: "SEARCH_COMPLETED", payload: { type: "email", email, deliverability } });
  return response.success(res, {
    email,
    domain,
    valid: hasMx || hasA,
    deliverability,
    mxRecordCount: mx.length,
    aRecordCount: a.length,
    disposable: isDisposable(domain),
    searchedAt: record.createdAt,
  });
});

// Derives a best-effort domain from a company name (e.g. "Acme Corp" -> "acmecorp.com").
// This is a heuristic, same approach tools like Hunter.io use when no explicit
// domain is provided: guess, then verify via DNS.
const guessDomainFromCompany = (company) =>
  String(company).toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";

const buildCandidates = (fullName, domain) => {
  const parts = String(fullName).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const candidates = [];
  if (first && last) {
    candidates.push(`${first}.${last}@${domain}`);
    candidates.push(`${first}${last}@${domain}`);
    candidates.push(`${first[0]}${last}@${domain}`);
    candidates.push(`${first}@${domain}`);
  } else if (first) {
    candidates.push(`${first}@${domain}`);
  }
  return candidates;
};

const findEmail = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const company = String(req.body.company || "").trim();
  const jobTitle = String(req.body.jobTitle || "").trim();
  if (!name || !company) throw new AppError("Name and company are required.", 400);

  const domain = guessDomainFromCompany(company);
  const candidates = buildCandidates(name, domain);
  if (candidates.length === 0) throw new AppError("Could not derive an email pattern from the name provided.", 400);

  const [mxRecords, aRecords] = await Promise.allSettled([
    dns.resolveMx(domain),
    dns.resolve4(domain).catch(() => []),
  ]);
  const mx = mxRecords.status === "fulfilled" ? mxRecords.value : [];
  const a = aRecords.status === "fulfilled" ? aRecords.value : [];
  const hasMx = mx.length > 0;
  const hasA = a.length > 0;
  let deliverability = "undeliverable";
  if (!hasMx && !hasA) deliverability = "undeliverable";
  else if (!hasMx) deliverability = "no_mx";
  else if (isDisposable(domain)) deliverability = "disposable";
  else deliverability = "deliverable";

  const topGuess = candidates[0];
  const record = await prisma.emailSearch.create({
    data: { email: topGuess, domain, valid: hasMx || hasA, verifiedBy: "pattern_guess", userId: req.user.id, orgId: req.orgId },
  });
  await prisma.analyticsEvent.create({
    data: { userId: req.user.id, orgId: req.orgId, type: "EMAIL_SEARCH", resource: "email" },
  });
  await incrementUsage({ userId: req.user.id, orgId: req.orgId, resource: "searches" });
  await createNotification({
    userId: req.user.id,
    type: "EMAIL_SEARCH",
    message: `Email guess completed for ${name} at ${company}.`,
    link: "/app/tools/email",
    metadata: { deliverability, recordId: record.id },
  });
  await recordAudit({
    userId: req.user.id, orgId: req.orgId,
    action: "search.email.find", entityType: "EmailSearch", entityId: record.id,
  });
  await publish({ orgId: req.orgId, event: "SEARCH_COMPLETED", payload: { type: "email_find", name, company, deliverability } });

  return response.success(res, {
    name, company, jobTitle,
    domainGuess: domain,
    topGuess,
    candidates,
    deliverability,
    valid: hasMx || hasA,
    searchedAt: record.createdAt,
  });
});

const history = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [items, total] = await Promise.all([
    prisma.emailSearch.findMany({
      where: { orgId: req.orgId },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.emailSearch.count({ where: { orgId: req.orgId } }),
  ]);
  return response.paginated(res, items, total, page, limit);
});

module.exports = { emailSearch, findEmail, history };