const test = require("node:test");
const assert = require("node:assert/strict");
const { mock } = require("node:test");

const { prisma } = require("../config/postgres");

// Mock Firebase Admin modules before requiring pushService
const messaging = require("firebase-admin/messaging");
const appModule = require("firebase-admin/app");

const mockMessagingInstance = {
  sendEachForMulticast: mock.fn(async () => ({
    successCount: 1,
    failureCount: 0,
    responses: [{ success: true }]
  }))
};

Object.defineProperty(appModule, "getApps", {
  value: () => [{ name: "[default]" }],
  writable: true,
  configurable: true
});

Object.defineProperty(messaging, "getMessaging", {
  value: () => mockMessagingInstance,
  writable: true,
  configurable: true
});

// Set up mock prisma methods for the tests
prisma.fcmToken = {
  upsert: mock.fn(async () => ({})),
  findMany: mock.fn(async () => []),
  deleteMany: mock.fn(async () => ({ count: 0 })),
};

prisma.notificationPreference = {
  findMany: mock.fn(async () => []),
};

prisma.notification = {
  create: mock.fn(async () => ({ id: 1 })),
  findFirst: mock.fn(async () => null),
  delete: mock.fn(async () => ({ id: 1 })),
  deleteMany: mock.fn(async () => ({ count: 0 })),
};

const pushController = require("../controllers/pushController");
const notificationController = require("../controllers/notificationController");
const pushService = require("../services/pushService");
const notificationService = require("../services/notificationService");

const mockRes = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  const res = { statusCode: 200, jsonData: null, promise };
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (data) {
    this.jsonData = data;
    resolve(this);
    return this;
  };
  return res;
};

const mockNext = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  const next = mock.fn((err) => { resolve(err); });
  next.promise = promise;
  return next;
};

test("push notification tests", async (t) => {
  await t.test("subscribe - validation fails if token is missing", async () => {
    const req = { body: {}, user: { id: 1 } };
    const res = mockRes();
    const next = mockNext();

    await pushController.subscribe(req, res, next);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.jsonData.success, false);
    assert.strictEqual(res.jsonData.message, "Token is required");
  });

  await t.test("subscribe - successfully saves FCM token", async () => {
    prisma.fcmToken.upsert.mock.resetCalls();
    const req = { body: { token: "mock-fcm-token-123" }, user: { id: 42 } };
    const res = mockRes();
    const next = mockNext();

    await pushController.subscribe(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.strictEqual(res.jsonData.message, "Token saved successfully");

    const calls = prisma.fcmToken.upsert.mock.calls;
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].arguments[0].where.token, "mock-fcm-token-123");
    assert.strictEqual(calls[0].arguments[0].create.userId, 42);
  });

  await t.test("notify - returns 404 when no FCM tokens found for user", async () => {
    prisma.fcmToken.findMany.mock.mockImplementation(async () => []);
    const req = { body: { targetUserId: 99 }, user: { id: 42 } };
    const res = mockRes();
    const next = mockNext();

    await pushController.notify(req, res, next);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.success, false);
    assert.strictEqual(res.jsonData.message, "No FCM tokens found for user");
  });

  await t.test("notify - successfully sends push notification using FCM", async () => {
    prisma.fcmToken.findMany.mock.mockImplementation(async () => [
      { token: "mock-token-abc", userId: 42 }
    ]);
    mockMessagingInstance.sendEachForMulticast.mock.resetCalls();

    const req = { body: { title: "Hello", body: "World" }, user: { id: 42 } };
    const res = mockRes();
    const next = mockNext();

    await pushController.notify(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.ok(res.jsonData.message.includes("Notification sent successfully"));

    const calls = mockMessagingInstance.sendEachForMulticast.mock.calls;
    assert.strictEqual(calls.length, 1);
    assert.deepStrictEqual(calls[0].arguments[0].tokens, ["mock-token-abc"]);
  });

  await t.test("dispatchNotification - respects push preference on (enabled: true)", async () => {
    // Mock user preference as ENABLED
    prisma.notificationPreference.findMany.mock.mockImplementation(async () => [
      { channel: "push", category: "lead", enabled: true }
    ]);
    prisma.fcmToken.findMany.mock.mockImplementation(async () => [
      { token: "mock-token-abc", userId: 10 }
    ]);
    mockMessagingInstance.sendEachForMulticast.mock.resetCalls();

    await notificationService.dispatchNotification({
      userId: 10,
      orgId: 1,
      type: "LEAD_CREATED",
      category: "lead",
      message: "Lead created!"
    });

    // Wait a brief moment as push notification is fire-and-forget (async Promise in controller/service)
    await new Promise((r) => setTimeout(r, 50));

    const calls = mockMessagingInstance.sendEachForMulticast.mock.calls;
    assert.strictEqual(calls.length, 1);
  });

  await t.test("dispatchNotification - respects push preference off (enabled: false)", async () => {
    // Mock user preference as DISABLED
    prisma.notificationPreference.findMany.mock.mockImplementation(async () => [
      { channel: "push", category: "lead", enabled: false }
    ]);
    prisma.fcmToken.findMany.mock.mockImplementation(async () => [
      { token: "mock-token-abc", userId: 10 }
    ]);
    mockMessagingInstance.sendEachForMulticast.mock.resetCalls();

    await notificationService.dispatchNotification({
      userId: 10,
      orgId: 1,
      type: "LEAD_CREATED",
      category: "lead",
      message: "Lead created!"
    });

    await new Promise((r) => setTimeout(r, 50));

    const calls = mockMessagingInstance.sendEachForMulticast.mock.calls;
    assert.strictEqual(calls.length, 0); // Should be skipped!
  });

  await t.test("deleteNotification - returns 404 if notification not found", async () => {
    prisma.notification.findFirst.mock.mockImplementation(async () => null);

    const req = { params: { id: 999 }, user: { id: 10 } };
    const res = mockRes();
    const next = mockNext();

    notificationController.deleteNotification(req, res, next);
    await Promise.race([res.promise, next.promise]);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.success, false);
    assert.strictEqual(res.jsonData.message, "Notification not found.");
  });

  await t.test("deleteNotification - deletes notification successfully", async () => {
    prisma.notification.findFirst.mock.mockImplementation(async () => ({ id: 999, userId: 10 }));
    prisma.notification.delete.mock.resetCalls();

    const req = { params: { id: 999 }, user: { id: 10 } };
    const res = mockRes();
    const next = mockNext();

    notificationController.deleteNotification(req, res, next);
    await Promise.race([res.promise, next.promise]);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.strictEqual(res.jsonData.data.message, "Notification deleted.");
    assert.strictEqual(prisma.notification.delete.mock.calls.length, 1);
  });

  await t.test("deleteAllNotifications - clears all user notifications successfully", async () => {
    prisma.notification.deleteMany.mock.resetCalls();
    prisma.notification.deleteMany.mock.mockImplementation(async () => ({ count: 5 }));

    const req = { user: { id: 10 } };
    const res = mockRes();
    const next = mockNext();

    notificationController.deleteAllNotifications(req, res, next);
    await Promise.race([res.promise, next.promise]);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.strictEqual(res.jsonData.data.message, "All notifications cleared.");
    assert.strictEqual(res.jsonData.data.deletedCount, 5);
    assert.strictEqual(prisma.notification.deleteMany.mock.calls.length, 1);
  });
});
