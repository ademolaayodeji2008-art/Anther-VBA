import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import Role from "../src/models/Role.js";
import User from "../src/models/User.js";
import { hashPassword } from "../src/services/authService.js";
import { startTestServer, stopTestServer, httpJson } from "./helpers/testServer.js";

const tokens = {};

async function createUserWithPermissions(name, email, permissions) {
  const role = await Role.create({ name: `${name} Role`, permissions });
  await User.create({
    name,
    email,
    passwordHash: await hashPassword("Password123!"),
    roles: [role._id],
    emailVerified: true,
  });
  const login = await httpJson("POST", "/api/auth/login", { email, password: "Password123!" });
  tokens[name] = login.body.accessToken;
}

function auth(name) {
  return { Authorization: `Bearer ${tokens[name]}` };
}

before(async () => {
  await startTestServer();
  await createUserWithPermissions("sales", "sales@test.local", ["customers:manage"]);
  await createUserWithPermissions("purchasing", "purchasing@test.local", ["vendors:manage"]);
  await createUserWithPermissions("inventory", "inventory@test.local", ["items:manage"]);
  await createUserWithPermissions("financeApprover", "finance@test.local", [
    "bank:manage",
    "bank:view",
  ]);
  await createUserWithPermissions("bankViewer", "bankviewer@test.local", ["bank:view"]);
  await createUserWithPermissions("plain", "plain@test.local", []);
});

after(stopTestServer);

test("customer: manage permission required to create, any authenticated user can list", async () => {
  const denied = await httpJson(
    "POST",
    "/api/customers",
    { name: "Should Fail" },
    auth("plain")
  );
  assert.equal(denied.status, 403);

  const created = await httpJson(
    "POST",
    "/api/customers",
    { name: "Acme Textiles", phone: "0800", address: { state: "Lagos" } },
    auth("sales")
  );
  assert.equal(created.status, 201);
  assert.equal(created.body.name, "Acme Textiles");

  const list = await httpJson("GET", "/api/customers?search=Acme", null, auth("plain"));
  assert.equal(list.status, 200);
  assert.equal(list.body.total, 1);
});

test("vendor: manage permission required to create", async () => {
  const denied = await httpJson("POST", "/api/vendors", { name: "Should Fail" }, auth("plain"));
  assert.equal(denied.status, 403);

  const created = await httpJson(
    "POST",
    "/api/vendors",
    { name: "Fabric Supplies Ltd" },
    auth("purchasing")
  );
  assert.equal(created.status, 201);

  const list = await httpJson("GET", "/api/vendors", null, auth("plain"));
  assert.equal(list.status, 200);
  assert.ok(list.body.items.some((v) => v.name === "Fabric Supplies Ltd"));
});

test("item: create with opening stock, stock ledger reflects it, margin is derived", async () => {
  const created = await httpJson(
    "POST",
    "/api/items",
    { name: "Ankara Yard", costPrice: 1000, sellingPrice: 1500, openingStock: 50 },
    auth("inventory")
  );
  assert.equal(created.status, 201);
  assert.equal(created.body.stockOnHand, 50);

  const fetched = await httpJson("GET", `/api/items/${created.body._id}`, null, auth("plain"));
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.stockOnHand, 50);
  assert.ok(Math.abs(fetched.body.marginPct - 33.33) < 0.1);

  const denied = await httpJson(
    "PATCH",
    `/api/items/${created.body._id}`,
    { sellingPrice: 2000 },
    auth("plain")
  );
  assert.equal(denied.status, 403);

  const updated = await httpJson(
    "PATCH",
    `/api/items/${created.body._id}`,
    { sellingPrice: 2000 },
    auth("inventory")
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.body.stockOnHand, 50);
});

test("bank account: view permission alone can list but not create", async () => {
  const created = await httpJson(
    "POST",
    "/api/bank-accounts",
    { name: "GTBank", accountNo: "0123456789", openingBalance: 100000 },
    auth("financeApprover")
  );
  assert.equal(created.status, 201);

  const listAsViewer = await httpJson("GET", "/api/bank-accounts", null, auth("bankViewer"));
  assert.equal(listAsViewer.status, 200);
  assert.equal(listAsViewer.body.total, 1);

  const createAsViewer = await httpJson(
    "POST",
    "/api/bank-accounts",
    { name: "Zenith", accountNo: "9999999999" },
    auth("bankViewer")
  );
  assert.equal(createAsViewer.status, 403);

  const listDeniedForUnrelated = await httpJson(
    "GET",
    "/api/bank-accounts",
    null,
    auth("plain")
  );
  assert.equal(listDeniedForUnrelated.status, 403);
});
