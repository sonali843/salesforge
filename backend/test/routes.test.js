"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// routes.test.js
// Separate test cases for EVERY route group registered in app.js.
// Uses Node's built-in `node:test` + `node:assert` — zero extra deps.
// All external I/O (Prisma, Redis, Firebase) is mocked BEFORE app is loaded.
// ─────────────────────────────────────────────────────────────────────────────
const test   = require("node:test");
const assert = require("node:assert/strict");
const http   = require("node:http");

// ── 0. Environment stubs (must be set before any module load) ─────────────────
process.env.NODE_ENV       = "test";
process.env.JWT_SECRET     = "routes-test-secret-key";
process.env.JWT_EXPIRE     = "1h";
process.env.DATABASE_URL   = "postgresql://test:test@localhost/test";
process.env.REDIS_URL      = "redis://localhost:6379";
process.env.PORT           = "0"; // OS picks a free port

// ── 1. Mock Prisma before ANY require of config/postgres ──────────────────────
const { mock } = require("node:test");

// Stub every Prisma model method used by routes/middleware
const prismaStub = {
  $connect:    mock.fn(async () => {}),
  $disconnect: mock.fn(async () => {}),
  $queryRaw:   mock.fn(async () => [{ "?column?": 1 }]),
  user:  {
    findUnique: mock.fn(async (args) => {
      const id = args?.where?.id;
      return {
        id: id ? Number(id) : 1,
        name: "Test User",
        email: "test@example.com",
        role: "ADMIN",
        organizationId: 1,
        twoFactorEnabled: false,
        lockedUntil: null
      };
    }),
    findMany: mock.fn(async () => []),
    create: mock.fn(async () => ({})),
    update: mock.fn(async () => ({})),
    delete: mock.fn(async () => ({})),
    count: mock.fn(async () => 0)
  },
  lead:  { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})), count: mock.fn(async () => 0) },
  deal:  { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})), count: mock.fn(async () => 0) },
  organization: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})), count: mock.fn(async () => 0) },
  contact: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})), count: mock.fn(async () => 0) },
  activity: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})), count: mock.fn(async () => 0) },
  notification: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})), deleteMany: mock.fn(async () => ({ count: 0 })), count: mock.fn(async () => 0), findFirst: mock.fn(async () => null) },
  fcmToken: { findMany: mock.fn(async () => []), upsert: mock.fn(async () => ({})), deleteMany: mock.fn(async () => ({ count: 0 })) },
  notificationPreference: { findMany: mock.fn(async () => []), upsert: mock.fn(async () => ({})) },
  apiKey: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  session: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})), deleteMany: mock.fn(async () => ({ count: 0 })) },
  auditLog: { findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), count: mock.fn(async () => 0) },
  team: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  template: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  sequence: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  workflow: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  quote: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  product: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  report: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  ticket: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  campaign: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  survey: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  contract: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  document: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  billing: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})) },
  webhook: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  playbook: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  customField: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  healthScore: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})) },
  kbArticle: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  quota: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  commission: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  territory: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  call: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  integration: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  changelog: { findMany: mock.fn(async () => []), create: mock.fn(async () => ({})) },
  changelogEntry: {
    findMany:    mock.fn(async () => [{ id: 1, version: "1.0.0", title: "Test", body: "Body", type: "feature", published: true, createdAt: new Date() }]),
    createMany:  mock.fn(async () => ({ count: 6 })),
    create:      mock.fn(async () => ({})),
  },
  onboarding: { findUnique: mock.fn(async () => null), upsert: mock.fn(async () => ({})) },
  usageRecord: { findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), aggregate: mock.fn(async () => ({ _sum: {} })) },
  savedSearch: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  tag: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})), upsert: mock.fn(async () => ({})) },
  comment: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  leadNote: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  leadTask: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  leadActivity: { findMany: mock.fn(async () => []), create: mock.fn(async () => ({})) },
  priceBook: { findUnique: mock.fn(async () => null), findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  forecast: { findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), upsert: mock.fn(async () => ({})) },
  calendarEvent: { findMany: mock.fn(async () => []), create: mock.fn(async () => ({})), update: mock.fn(async () => ({})), delete: mock.fn(async () => ({})) },
  winLoss: { findMany: mock.fn(async () => []), create: mock.fn(async () => ({})) },
  csvImport: { findMany: mock.fn(async () => []), create: mock.fn(async () => ({})) },
  emailTracking: { findMany: mock.fn(async () => []), create: mock.fn(async () => ({})) },
  gdprRequest: { findMany: mock.fn(async () => []), create: mock.fn(async () => ({})) },
  subscription: { findUnique: mock.fn(async () => null), upsert: mock.fn(async () => ({})) },
};

// Patch the module cache so every require("../config/postgres") gets the stub
const Module = require("node:module");
const origLoad = Module._load.bind(Module);
Module._load = function(request, parent, isMain) {
  const normalized = request.replace(/\\/g, "/");
  if (normalized.endsWith("config/postgres")) {
    return { prisma: prismaStub, connectPostgres: async () => {} };
  }
  if (normalized.endsWith("config/redis")) {
    return { redisClient: { isOpen: false }, connectRedis: async () => {} };
  }
  if (normalized === "redis") {
    return {
      createClient: () => ({
        isOpen: false,
        connect: async () => {},
        on: () => {},
      })
    };
  }
  return origLoad(request, parent, isMain);
};


// ── 3. Mock Firebase Admin ────────────────────────────────────────────────────
// Unset Firebase env vars so firebase.js takes the safe "warn + skip" path
delete process.env.FIREBASE_PROJECT_ID;
delete process.env.FIREBASE_CLIENT_EMAIL;
delete process.env.FIREBASE_PRIVATE_KEY;

// ── 4. Load the Express app (all mocks in place) ──────────────────────────────
const app = require("../app");

// ── 5. Helpers ────────────────────────────────────────────────────────────────
let _server  = null;
let _baseUrl = null;

const getServer = () => new Promise((resolve) => {
  if (_server) return resolve({ server: _server, baseUrl: _baseUrl });
  const s = http.createServer(app);
  s.listen(0, "127.0.0.1", () => {
    _server  = s;
    _baseUrl = `http://127.0.0.1:${s.address().port}`;
    resolve({ server: s, baseUrl: _baseUrl });
  });
});

/**
 * Minimal HTTP request helper — returns { status, body }
 */
const req = async (method, path, body, headers = {}) => {
  const { baseUrl } = await getServer();
  return new Promise((resolve, reject) => {
    const url  = new URL(path, baseUrl);
    const data = body ? JSON.stringify(body) : undefined;
    const opts = {
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + url.search,
      method,
      headers: {
        "Content-Type":  "application/json",
        "Accept":        "application/json",
        ...headers,
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };
    const request = http.request(opts, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    request.on("error", reject);
    if (data) request.write(data);
    request.end();
  });
};

const closeServer = () => new Promise((resolve) => {
  if (_server) _server.close(resolve);
  else resolve();
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Root & Health endpoints
// ─────────────────────────────────────────────────────────────────────────────
test("Route GET / — root endpoint returns API info with success:true", async () => {
  const { status, body } = await req("GET", "/");
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.name, "SalesForge API");
  assert.ok(body.version,   "version field must be present");
  assert.ok(body.timestamp, "timestamp field must be present");
});

test("Route GET /api/health — health check returns ok with database:connected", async () => {
  prismaStub.$queryRaw.mock.mockImplementationOnce(async () => [{ "?column?": 1 }]);
  const { status, body } = await req("GET", "/api/health");
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.status, "ok");
  assert.strictEqual(body.database, "connected");
  assert.ok(body.dbMs !== undefined, "dbMs field must be present");
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — 404 fallback
// ─────────────────────────────────────────────────────────────────────────────
test("Route unknown path — GET returns 404 with success:false", async () => {
  const { status, body } = await req("GET", "/api/nonexistent-route-xyz");
  assert.strictEqual(status, 404);
  assert.strictEqual(body.success, false);
  assert.ok(body.message, "404 response must include message");
});

test("Route unknown nested path — DELETE returns 404 with success:false", async () => {
  const { status, body } = await req("DELETE", "/api/abc/def/ghi/jkl");
  assert.strictEqual(status, 404);
  assert.strictEqual(body.success, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Auth routes (public — no JWT required)
// ─────────────────────────────────────────────────────────────────────────────
test("Route POST /api/auth/login — reachable; empty body returns validation error", async () => {
  const { status, body } = await req("POST", "/api/auth/login", {});
  assert.ok([400, 422].includes(status), `Expected 400/422, got ${status}`);
  assert.strictEqual(body.success, false);
});

test("Route POST /api/auth/register — reachable; empty body returns validation error", async () => {
  const { status, body } = await req("POST", "/api/auth/register", {});
  assert.ok([400, 422].includes(status), `Expected 400/422, got ${status}`);
  assert.strictEqual(body.success, false);
});

test("Route POST /api/auth/forgot-password — reachable; invalid body returns error", async () => {
  const { status, body } = await req("POST", "/api/auth/forgot-password", {});
  assert.ok([400, 404, 422].includes(status), `Expected 400/404/422, got ${status}`);
  assert.strictEqual(body.success, false);
});

test("Route POST /api/auth/logout — reachable without JWT (allows clearing stale state)", async () => {
  const { status } = await req("POST", "/api/auth/logout");
  assert.ok([200, 204, 400].includes(status), `Expected 200/204/400, got ${status}`);
});

test("Route GET /api/auth/me — protected; returns 401 without JWT", async () => {
  const { status, body } = await req("GET", "/api/auth/me");
  assert.strictEqual(status, 401);
  assert.strictEqual(body.success, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — JWT guard: invalid / malformed tokens
// ─────────────────────────────────────────────────────────────────────────────
test("Route GET /api/leads — invalid JWT token returns 401 JWT_INVALID", async () => {
  const { status, body } = await req("GET", "/api/leads", undefined, {
    Authorization: "Bearer this.is.not.a.valid.jwt",
  });
  assert.strictEqual(status, 401);
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.code, "JWT_INVALID");
});

test("Route GET /api/leads — Basic auth scheme (no Bearer) returns 401", async () => {
  const { status, body } = await req("GET", "/api/leads", undefined, {
    Authorization: "Basic dXNlcjpwYXNz",
  });
  assert.strictEqual(status, 401);
  assert.strictEqual(body.success, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Protected routes: 401 without token (one per route group)
// ─────────────────────────────────────────────────────────────────────────────
const protectedRoutes = [
  ["GET",    "/api/leads"],
  ["GET",    "/api/leads/stats"],
  ["GET",    "/api/leads/123"],
  ["POST",   "/api/leads"],
  ["PATCH",  "/api/leads/1"],
  ["DELETE", "/api/leads/1"],
  ["GET",    "/api/deals"],
  ["GET",    "/api/contacts"],
  ["GET",    "/api/organizations"],
  ["GET",    "/api/team"],
  ["GET",    "/api/users"],
  ["GET",    "/api/billing"],
  ["GET",    "/api/analytics"],
  ["GET",    "/api/notifications"],
  ["GET",    "/api/api-keys"],
  ["GET",    "/api/webhooks"],
  ["GET",    "/api/templates"],
  ["GET",    "/api/sequences"],
  ["GET",    "/api/workflows"],
  ["GET",    "/api/reports"],
  ["GET",    "/api/quotes"],
  ["GET",    "/api/products"],
  ["GET",    "/api/playbooks"],
  ["GET",    "/api/territories"],
  ["GET",    "/api/quotas"],
  ["GET",    "/api/commissions"],
  ["GET",    "/api/calls"],
  ["GET",    "/api/documents"],
  ["GET",    "/api/contracts"],
  ["GET",    "/api/tickets"],
  ["GET",    "/api/surveys"],
  ["GET",    "/api/campaigns"],
  ["GET",    "/api/kb"],
  ["GET",    "/api/health-scores"],
  ["GET",    "/api/activities"],
  ["GET",    "/api/calendar"],
  ["GET",    "/api/integrations"],
  ["GET",    "/api/custom-fields"],
  ["GET",    "/api/sessions"],
  ["GET",    "/api/usage"],
  ["GET",    "/api/audit"],
  ["GET",    "/api/search"],
  ["GET",    "/api/onboarding"],
  ["GET",    "/api/notification-preferences"],
  ["GET",    "/api/admin/dashboard"],
  ["GET",    "/api/admin/users"],
  ["GET",    "/api/saved-searches"],
  ["GET",    "/api/tags"],
  ["GET",    "/api/forecasts"],
  ["GET",    "/api/intel"],
  ["GET",    "/api/price-books"],
  ["GET",    "/api/win-loss"],
  ["POST",   "/api/push/subscribe"],
  ["GET",    "/api/sse/stream"],
  ["POST",   "/api/email-search"],
  ["POST",   "/api/domain-search"],
  ["POST",   "/api/social-search"],
  ["GET",    "/api/2fa"],
];

for (const [method, path] of protectedRoutes) {
  test(`Route ${method} ${path} — protected; returns 401 without JWT`, async () => {
    const { status, body } = await req(method, path);
    assert.strictEqual(
      status,
      401,
      `Expected 401 for ${method} ${path}, got ${status}: ${JSON.stringify(body)}`
    );
    assert.strictEqual(body.success, false);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — CORS preflight
// ─────────────────────────────────────────────────────────────────────────────
test("Route OPTIONS /api/auth/login — CORS preflight returns 200 or 204", async () => {
  const { status } = await req("OPTIONS", "/api/auth/login", undefined, {
    Origin: "http://localhost:5173",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "Content-Type,Authorization",
  });
  assert.ok(
    [200, 204].includes(status),
    `Expected 200 or 204 for CORS preflight, got ${status}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — Public routes (no JWT required)
// ─────────────────────────────────────────────────────────────────────────────
test("Route GET /api/metrics — public route returns 200 with metrics data", async () => {
  const { status, body } = await req("GET", "/api/metrics");
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
  assert.ok(body.data, "metrics data payload must be present");
});

test("Route GET /api/metrics/status — public route returns 200 with service info", async () => {
  const { status, body } = await req("GET", "/api/metrics/status");
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
});

test("Route GET /api/changelog — public route (optionalAuth) returns 200 with entries", async () => {
  const { status, body } = await req("GET", "/api/changelog");
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
  assert.ok(Array.isArray(body.data), "changelog data must be an array");
});

test("Route POST /api/admin/login — public endpoint reachable; empty body returns error", async () => {
  const { status, body } = await req("POST", "/api/admin/login", {});
  assert.ok([400, 401, 422, 500].includes(status), `Expected 400/401/422/500, got ${status}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8 — Vercel SPA Routing Configuration (fixes 404 refresh error)
// ─────────────────────────────────────────────────────────────────────────────
test("Vercel Routing — vercel.json contains correct SPA fallback rules to prevent 404 on refresh", () => {
  const fs = require("fs");
  const path = require("path");
  const vercelJsonPath = path.resolve(__dirname, "../../vercel.json");
  
  assert.ok(fs.existsSync(vercelJsonPath), "vercel.json must exist at project root");
  
  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, "utf8"));
  assert.strictEqual(vercelConfig.version, 2, "vercel.json should use configuration version 2");
  assert.ok(Array.isArray(vercelConfig.routes), "vercel.json must define a 'routes' array");
  
  // Verify that there is an API rule, a static assets rule, and a fallback rule
  const apiRoute = vercelConfig.routes.find(r => r.src && r.src.includes("api"));
  const staticRoute = vercelConfig.routes.find(r => r.src && (r.src.includes("js") || r.src.includes("css")));
  const fallbackRoute = vercelConfig.routes.find(r => r.src === "/(.*)" && r.dest === "/index.html");
  
  assert.ok(apiRoute, "vercel.json must have a routing rule directing api requests to /api/index.js");
  assert.ok(staticRoute, "vercel.json must have a routing rule to serve static assets directly");
  assert.ok(fallbackRoute, "vercel.json must have a catch-all fallback rule mapping all other traffic to /index.html to support React Router refresh");
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 9 — Notification Categories Tests (leads, deals, teams, billing, system)
// ─────────────────────────────────────────────────────────────────────────────
test("Notification Categories — tests for leads, deals, teams, billing, and system categories via test-email endpoint", async (t) => {
  const jwt = require("jsonwebtoken");
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET || "routes-test-secret-key");
  const authHeaders = { Authorization: `Bearer ${token}` };

  const categories = ["lead", "deal", "team", "billing", "system"];

  for (const cat of categories) {
    await t.test(`Category: ${cat} — triggers notification successfully`, async () => {
      const { status, body } = await req("POST", "/api/notifications/test-email", {
        category: cat,
        title: `Test ${cat}`,
        message: `Hello ${cat} notification system`
      }, authHeaders);

      assert.strictEqual(status, 200, `Expected 200 for category ${cat}, got ${status}: ${JSON.stringify(body)}`);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data?.sent, true);
      assert.strictEqual(body.data?.recipient, "test@example.com");
    });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────────────────────────────────────
test("Cleanup: close test HTTP server and restore Module._load", async () => {
  await closeServer();
  Module._load = origLoad;
});
