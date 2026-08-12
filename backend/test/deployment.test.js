"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// deployment.test.js
// Validates all deployment configuration files to prevent build/deploy errors.
// Uses Node's built-in `node:test` + `node:assert` — zero extra deps.
// ─────────────────────────────────────────────────────────────────────────────
const test   = require("node:test");
const assert = require("node:assert/strict");
const fs     = require("node:fs");
const path   = require("node:path");

const ROOT    = path.resolve(__dirname, "../../");
const BACKEND = path.resolve(__dirname, "../");

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — vercel.json
// ─────────────────────────────────────────────────────────────────────────────
test("Deployment — vercel.json exists at project root", () => {
  const p = path.join(ROOT, "vercel.json");
  assert.ok(fs.existsSync(p), "vercel.json must exist at project root");
});

test("Deployment — vercel.json uses config version 2", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  assert.strictEqual(cfg.version, 2, "vercel.json version must be 2");
});

test("Deployment — vercel.json defines outputDirectory pointing to frontend/dist", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  assert.ok(
    cfg.outputDirectory && cfg.outputDirectory.includes("frontend/dist"),
    `outputDirectory must include 'frontend/dist', got: ${cfg.outputDirectory}`
  );
});

test("Deployment — vercel.json has installCommand that installs backend deps", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  assert.ok(
    cfg.installCommand && cfg.installCommand.includes("backend"),
    `installCommand must reference backend, got: ${cfg.installCommand}`
  );
});

test("Deployment — vercel.json buildCommand generates Prisma client before building", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  assert.ok(cfg.buildCommand, "vercel.json must define a buildCommand");
  const hasGenerate = cfg.buildCommand.includes("prisma") || cfg.buildCommand.includes("prisma:generate");
  const hasFrontendBuild = cfg.buildCommand.includes("frontend") || cfg.buildCommand.includes("build:frontend") || cfg.buildCommand.includes("build");
  assert.ok(hasGenerate, `buildCommand must include prisma generate step, got: ${cfg.buildCommand}`);
  assert.ok(hasFrontendBuild, `buildCommand must include frontend build step, got: ${cfg.buildCommand}`);
});

test("Deployment — vercel.json has SPA fallback route to /index.html", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  assert.ok(Array.isArray(cfg.routes), "vercel.json must define a routes array");
  const fallback = cfg.routes.find(r => r.src === "/(.*)" && r.dest === "/index.html");
  assert.ok(fallback, "vercel.json must have catch-all fallback routing to /index.html for React Router");
});

test("Deployment — vercel.json routes API requests to /api/index.js", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  const apiRoute = cfg.routes.find(r => r.src && r.src.includes("api") && r.dest && r.dest.includes("api/index.js"));
  assert.ok(apiRoute, "vercel.json must route /api/* requests to /api/index.js");
});

test("Deployment — vercel.json has static assets route to bypass SPA fallback", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  const staticRoute = cfg.routes.find(r => r.src && (r.src.includes("js") || r.src.includes("css")));
  assert.ok(staticRoute, "vercel.json must have a static assets route (js, css etc.)");
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Prisma schema binaryTargets
// ─────────────────────────────────────────────────────────────────────────────
test("Deployment — Prisma schema exists", () => {
  const p = path.join(BACKEND, "prisma", "schema.prisma");
  assert.ok(fs.existsSync(p), "prisma/schema.prisma must exist");
});

test("Deployment — Prisma schema includes rhel-openssl-3.0.x binaryTarget for Vercel Lambda", () => {
  const schema = fs.readFileSync(path.join(BACKEND, "prisma", "schema.prisma"), "utf8");
  assert.ok(
    schema.includes("rhel-openssl-3.0.x"),
    "schema.prisma binaryTargets must include 'rhel-openssl-3.0.x' for Vercel's Lambda/RHEL environment"
  );
});

test("Deployment — Prisma schema includes native binaryTarget for local development", () => {
  const schema = fs.readFileSync(path.join(BACKEND, "prisma", "schema.prisma"), "utf8");
  assert.ok(
    schema.includes('"native"'),
    "schema.prisma binaryTargets must include 'native' for local development"
  );
});

test("Deployment — Prisma schema datasource uses DATABASE_URL env var", () => {
  const schema = fs.readFileSync(path.join(BACKEND, "prisma", "schema.prisma"), "utf8");
  assert.ok(
    schema.includes('env("DATABASE_URL")'),
    'Prisma datasource url must use env("DATABASE_URL")'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — api/index.js serverless entrypoint
// ─────────────────────────────────────────────────────────────────────────────
test("Deployment — api/index.js exists (Vercel serverless entrypoint)", () => {
  const p = path.join(ROOT, "api", "index.js");
  assert.ok(fs.existsSync(p), "api/index.js must exist as the Vercel serverless function entrypoint");
});

test("Deployment — api/index.js imports from backend/app and exports it", () => {
  const content = fs.readFileSync(path.join(ROOT, "api", "index.js"), "utf8");
  assert.ok(
    content.includes("backend/app") || content.includes("../backend/app"),
    "api/index.js must import the Express app from backend/app"
  );
  assert.ok(
    content.includes("module.exports"),
    "api/index.js must export the app via module.exports for Vercel serverless"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Root package.json build scripts
// ─────────────────────────────────────────────────────────────────────────────
test("Deployment — root package.json exists", () => {
  const p = path.join(ROOT, "package.json");
  assert.ok(fs.existsSync(p), "root package.json must exist");
});

test("Deployment — root package.json build script installs backend and frontend", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const buildScript = pkg.scripts?.build || "";
  const hasBackendInstall = buildScript.includes("backend") || buildScript.includes("install:all");
  assert.ok(
    hasBackendInstall,
    `root build script must install backend dependencies, got: '${buildScript}'`
  );
});

test("Deployment — root package.json build script generates Prisma client", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const buildScript = pkg.scripts?.build || "";
  const hasPrismaGenerate = buildScript.includes("prisma") || buildScript.includes("prisma:generate");
  assert.ok(
    hasPrismaGenerate,
    `root build script must include prisma generate step, got build: '${buildScript}'`
  );
});

test("Deployment — root package.json build script builds frontend", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const buildScript = pkg.scripts?.build || "";
  const hasFrontendBuild = buildScript.includes("frontend") || buildScript.includes("build:frontend") || buildScript.includes("build");
  assert.ok(
    hasFrontendBuild,
    `root build script must include frontend build step, got: '${buildScript}'`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Backend package.json postinstall
// ─────────────────────────────────────────────────────────────────────────────
test("Deployment — backend package.json exists", () => {
  const p = path.join(BACKEND, "package.json");
  assert.ok(fs.existsSync(p), "backend/package.json must exist");
});

test("Deployment — backend package.json has postinstall script to generate Prisma client", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND, "package.json"), "utf8"));
  assert.ok(
    pkg.scripts?.postinstall,
    "backend package.json must have a postinstall script"
  );
  assert.ok(
    pkg.scripts.postinstall.includes("prisma generate"),
    `backend postinstall must run 'prisma generate', got: '${pkg.scripts.postinstall}'`
  );
});

test("Deployment — backend package.json lists @prisma/client as a runtime dependency", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND, "package.json"), "utf8"));
  assert.ok(
    pkg.dependencies?.["@prisma/client"],
    "@prisma/client must be in dependencies (not devDependencies) so it's available at Vercel runtime"
  );
});

test("Deployment — backend package.json lists prisma as a devDependency", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND, "package.json"), "utf8"));
  assert.ok(
    pkg.devDependencies?.prisma,
    "prisma CLI must be in devDependencies for schema management and client generation"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Frontend build output validation
// ─────────────────────────────────────────────────────────────────────────────
test("Deployment — frontend/dist/index.html exists (frontend was built)", () => {
  const p = path.join(ROOT, "frontend", "dist", "index.html");
  assert.ok(fs.existsSync(p), "frontend/dist/index.html must exist — run 'npm run build:frontend' from root");
});

test("Deployment — frontend/dist/assets directory exists with bundled assets", () => {
  const assetsDir = path.join(ROOT, "frontend", "dist", "assets");
  assert.ok(
    fs.existsSync(assetsDir) && fs.statSync(assetsDir).isDirectory(),
    "frontend/dist/assets must exist after a successful frontend build"
  );
  const assets = fs.readdirSync(assetsDir);
  assert.ok(assets.length > 0, "frontend/dist/assets must contain at least one bundled file");
});

test("Deployment — frontend vite.config.js exists and configures build", () => {
  const p = path.join(ROOT, "frontend", "vite.config.js");
  assert.ok(fs.existsSync(p), "frontend/vite.config.js must exist");
  const content = fs.readFileSync(p, "utf8");
  assert.ok(content.includes("defineConfig"), "vite.config.js must use defineConfig");
  assert.ok(content.includes("build"), "vite.config.js must have a build configuration");
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — Backend server entrypoint validation
// ─────────────────────────────────────────────────────────────────────────────
test("Deployment — backend/app.js exports the Express app", () => {
  const content = fs.readFileSync(path.join(BACKEND, "app.js"), "utf8");
  assert.ok(
    content.includes("module.exports = app"),
    "backend/app.js must export the Express app via module.exports"
  );
});

test("Deployment — backend/server.js exists and conditionally starts server", () => {
  const p = path.join(BACKEND, "server.js");
  assert.ok(fs.existsSync(p), "backend/server.js must exist");
  const content = fs.readFileSync(p, "utf8");
  assert.ok(
    content.includes("require.main === module"),
    "server.js must guard app.listen() with require.main === module so Vercel serverless import doesn't bind a port"
  );
});
