"use strict";

const test   = require("node:test");
const assert = require("node:assert/strict");
const http   = require("node:http");
const jwt    = require("jsonwebtoken");

// ── 0. Environment stubs (must be set before any module load) ─────────────────
process.env.NODE_ENV       = "test";
process.env.JWT_SECRET     = "organization-test-secret-key";
process.env.JWT_EXPIRE     = "1h";
process.env.DATABASE_URL   = "postgresql://test:test@localhost/test";
process.env.PORT           = "0"; // OS picks a free port

// ── 1. Mock Prisma before require of config/postgres ──────────────────────
const { mock } = require("node:test");

const prismaStub = {
  $connect:    mock.fn(async () => {}),
  $disconnect: mock.fn(async () => {}),
  $queryRaw:   mock.fn(async () => [{ "?column?": 1 }]),
  user: {
    findUnique: mock.fn(async (args) => {
      const id = args?.where?.id;
      return {
        id: id ? Number(id) : 1,
        name: "Test User",
        email: "test@example.com",
        role: currentRole, // dynamically set role in tests
        organizationId: 1,
        twoFactorEnabled: false,
        lockedUntil: null
      };
    })
  },
  organization: {
    findFirst: mock.fn(async () => null),
    findUnique: mock.fn(async () => null),
    create: mock.fn(async () => ({})),
    update: mock.fn(async () => ({})),
  },
  auditLog: {
    create: mock.fn(async () => ({}))
  }
};

// Default role for the stub user
let currentRole = "OWNER";

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

// Mock Firebase Admin
delete process.env.FIREBASE_PROJECT_ID;
delete process.env.FIREBASE_CLIENT_EMAIL;
delete process.env.FIREBASE_PRIVATE_KEY;

// Load the Express app (all mocks in place)
const app = require("../app");

// ── 2. Helpers ────────────────────────────────────────────────────────────────
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

// Generate JWT token helper
const generateToken = (userId = 1) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET);
};

// ── 3. Test Suites ────────────────────────────────────────────────────────────

test("Organization Features - GET /api/organizations", async (t) => {
  await t.test("should return 401 if unauthorized", async () => {
    const { status, body } = await req("GET", "/api/organizations");
    assert.strictEqual(status, 401);
    assert.strictEqual(body.success, false);
  });

  await t.test("should return list containing the organization if it exists", async () => {
    const token = generateToken();
    const mockOrg = {
      id: 1,
      name: "Acme Corp",
      website: "https://acme.com",
      status: "ACTIVE"
    };

    prismaStub.organization.findFirst.mock.mockImplementationOnce(async () => mockOrg);

    const { status, body } = await req("GET", "/api/organizations", null, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.deepStrictEqual(body.data, [mockOrg]);
  });

  await t.test("should return empty list if organization does not exist", async () => {
    const token = generateToken();
    prismaStub.organization.findFirst.mock.mockImplementationOnce(async () => null);

    const { status, body } = await req("GET", "/api/organizations", null, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.deepStrictEqual(body.data, []);
  });
});

test("Organization Features - GET /api/organizations/:id", async (t) => {
  await t.test("should return 200 with the organization details if matching user organizationId", async () => {
    const token = generateToken();
    const mockOrg = {
      id: 1,
      name: "Acme Corp",
      status: "ACTIVE"
    };

    prismaStub.organization.findFirst.mock.mockImplementationOnce(async () => mockOrg);

    const { status, body } = await req("GET", "/api/organizations/1", null, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.deepStrictEqual(body.data, mockOrg);
  });

  await t.test("should return 404 if requesting a different organization ID than the user organizationId", async () => {
    const token = generateToken();
    const { status, body } = await req("GET", "/api/organizations/2", null, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 404);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Organization not found.");
  });
});

test("Organization Features - POST /api/organizations (Create/Setup)", async (t) => {
  await t.test("should fail if user is not OWNER or ADMIN", async () => {
    currentRole = "MEMBER";
    const token = generateToken();

    const { status, body } = await req("POST", "/api/organizations", { name: "New Org" }, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 403);
    assert.strictEqual(body.success, false);
  });

  await t.test("should allow OWNER or ADMIN to create/update if organization is canceled or does not exist", async () => {
    currentRole = "ADMIN";
    const token = generateToken();

    prismaStub.organization.findUnique.mock.mockImplementationOnce(async () => ({ id: 1, status: "CANCELED" }));
    prismaStub.organization.update.mock.mockImplementationOnce(async (args) => {
      assert.strictEqual(args.where.id, 1);
      assert.strictEqual(args.data.name, "Test Setup Org");
      assert.strictEqual(args.data.status, "ACTIVE");
      return { id: 1, name: "Test Setup Org", status: "ACTIVE" };
    });

    const { status, body } = await req("POST", "/api/organizations", { name: "Test Setup Org" }, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.name, "Test Setup Org");
    assert.strictEqual(body.data.status, "ACTIVE");
  });

  await t.test("should throw 400 if organization is already active", async () => {
    currentRole = "OWNER";
    const token = generateToken();

    prismaStub.organization.findUnique.mock.mockImplementationOnce(async () => ({ id: 1, status: "ACTIVE" }));

    const { status, body } = await req("POST", "/api/organizations", { name: "New Org" }, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 400);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "You already have your organization created. Invite members instead.");
  });
});

test("Organization Features - PATCH /api/organizations/:id (Update)", async (t) => {
  await t.test("should update organization fields if permitted", async () => {
    currentRole = "OWNER";
    const token = generateToken();

    prismaStub.organization.update.mock.mockImplementationOnce(async (args) => {
      assert.strictEqual(args.where.id, 1);
      assert.strictEqual(args.data.website, "https://google.com");
      return { id: 1, name: "Acme Corp", website: "https://google.com", status: "ACTIVE" };
    });

    const { status, body } = await req("PATCH", "/api/organizations/1", { website: "https://google.com" }, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.website, "https://google.com");
  });

  await t.test("should return 404 if updating an organization ID other than the tenant ID", async () => {
    const token = generateToken();
    const { status, body } = await req("PATCH", "/api/organizations/2", { website: "https://google.com" }, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 404);
    assert.strictEqual(body.success, false);
  });
});

test("Organization Features - DELETE /api/organizations/:id (Cancel)", async (t) => {
  await t.test("should forbid members from canceling organization", async () => {
    currentRole = "MEMBER";
    const token = generateToken();

    const { status, body } = await req("DELETE", "/api/organizations/1", null, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 403);
    assert.strictEqual(body.success, false);
  });

  await t.test("should forbid admins from canceling organization (only OWNER)", async () => {
    currentRole = "ADMIN";
    const token = generateToken();

    const { status, body } = await req("DELETE", "/api/organizations/1", null, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 403);
    assert.strictEqual(body.success, false);
  });

  await t.test("should allow OWNER to cancel organization", async () => {
    currentRole = "OWNER";
    const token = generateToken();

    prismaStub.organization.update.mock.mockImplementationOnce(async (args) => {
      assert.strictEqual(args.where.id, 1);
      assert.strictEqual(args.data.status, "CANCELED");
      return { id: 1, name: "Acme Corp", status: "CANCELED" };
    });

    const { status, body } = await req("DELETE", "/api/organizations/1", null, {
      Authorization: `Bearer ${token}`
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.message, "Organization canceled.");
  });
});

// Cleanup
test("Cleanup - Close server", async () => {
  await closeServer();
  Module._load = origLoad;
});
