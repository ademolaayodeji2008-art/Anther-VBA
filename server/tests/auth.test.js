import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import Role from "../src/models/Role.js";
import User from "../src/models/User.js";
import { hashPassword } from "../src/services/authService.js";
import { issueVerificationEmail } from "../src/services/verificationService.js";
import { startTestServer, stopTestServer, httpJson } from "./helpers/testServer.js";

before(async () => {
  await startTestServer();

  const role = await Role.create({
    name: "Super Admin",
    permissions: ["users:manage", "roles:manage"],
  });
  await User.create({
    name: "Test Admin",
    email: "admin@test.local",
    passwordHash: await hashPassword("Password123!"),
    roles: [role._id],
    emailVerified: true,
  });
});

after(stopTestServer);

test("login succeeds with correct credentials and returns permissions", async () => {
  const res = await httpJson("POST", "/api/auth/login", {
    email: "admin@test.local",
    password: "Password123!",
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken);
  assert.deepEqual(res.body.user.permissions.sort(), ["roles:manage", "users:manage"]);
});

test("login fails with wrong password", async () => {
  const res = await httpJson("POST", "/api/auth/login", {
    email: "admin@test.local",
    password: "wrong",
  });
  assert.equal(res.status, 401);
});

test("protected route rejects missing token", async () => {
  const res = await httpJson("GET", "/api/users");
  assert.equal(res.status, 401);
});

test("refresh cookie issues a new access token", async () => {
  const login = await httpJson("POST", "/api/auth/login", {
    email: "admin@test.local",
    password: "Password123!",
  });
  const cookie = login.setCookie[0].split(";")[0];
  const res = await httpJson("POST", "/api/auth/refresh", null, { Cookie: cookie });
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken);
});

test("login is blocked until the email is verified", async () => {
  await User.create({
    name: "Unverified User",
    email: "unverified@test.local",
    passwordHash: await hashPassword("Password123!"),
    roles: [],
    emailVerified: false,
  });

  const res = await httpJson("POST", "/api/auth/login", {
    email: "unverified@test.local",
    password: "Password123!",
  });
  assert.equal(res.status, 403);
});

test("verify-email activates the account and allows login afterward", async () => {
  const user = await User.create({
    name: "Pending User",
    email: "pending@test.local",
    passwordHash: await hashPassword("Password123!"),
    roles: [],
    emailVerified: false,
  });

  const info = await issueVerificationEmail(user);
  const sentMail = JSON.parse(info.message);
  const token = new URL(sentMail.html.match(/href="([^"]+)"/)[1]).searchParams.get("token");

  const badAttempt = await httpJson("POST", "/api/auth/verify-email", {
    email: "pending@test.local",
    token: "not-the-real-token",
  });
  assert.equal(badAttempt.status, 400);

  const verifyRes = await httpJson("POST", "/api/auth/verify-email", {
    email: "pending@test.local",
    token,
  });
  assert.equal(verifyRes.status, 200);

  const loginRes = await httpJson("POST", "/api/auth/login", {
    email: "pending@test.local",
    password: "Password123!",
  });
  assert.equal(loginRes.status, 200);
});
