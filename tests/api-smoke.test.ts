import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import test, { after, before } from "node:test";

const PORT = 3210;
const BASE_URL = `http://127.0.0.1:${PORT}`;
let server: ChildProcessWithoutNullStreams | undefined;
let serverOutput = "";

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 60_000) {
    try {
      const response = await fetch(BASE_URL);
      if (response.status < 500) return;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Timed out waiting for Next.js test server.\n${serverOutput.slice(-4000)}`);
}

before(async () => {
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || "file:./api-smoke.db",
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "api-smoke-secret",
        NEXTAUTH_URL: BASE_URL,
        AUTH_TRUST_HOST: "true",
      },
    }
  );

  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  await waitForServer();
});

after(() => {
  if (!server || server.killed) return;
  server.kill("SIGTERM");
});

test("protected API routes return JSON 401 responses when unauthenticated", async () => {
  const checks: Array<{ path: string; init?: RequestInit }> = [
    { path: "/api/sync" },
    { path: "/api/sync", init: { method: "POST", body: "{}" } },
    { path: "/api/generate-wod", init: { method: "POST", body: "{}" } },
    { path: "/api/generate-swap", init: { method: "POST", body: "{}" } },
    { path: "/api/coach", init: { method: "POST", body: "{}" } },
  ];

  for (const check of checks) {
    const response = await fetch(`${BASE_URL}${check.path}`, {
      headers: { "Content-Type": "application/json" },
      ...check.init,
    });
    assert.equal(response.status, 401, check.path);
    assert.match(response.headers.get("content-type") || "", /application\/json/, check.path);
    assert.deepEqual(await response.json(), { error: "Unauthorized" }, check.path);
  }
});

test("demo cookie allows protected app pages without a login session", async () => {
  const blocked = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
  assert.ok([302, 307, 308].includes(blocked.status));
  assert.match(blocked.headers.get("location") || "", /\/login/);

  const allowed = await fetch(`${BASE_URL}/dashboard`, {
    redirect: "manual",
    headers: { cookie: "forge-demo=1" },
  });
  assert.equal(allowed.status, 200);
  assert.match(await allowed.text(), /FORGE/);
});
