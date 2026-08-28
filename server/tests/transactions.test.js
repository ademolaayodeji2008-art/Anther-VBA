import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import Role from "../src/models/Role.js";
import User from "../src/models/User.js";
import Customer from "../src/models/Customer.js";
import Vendor from "../src/models/Vendor.js";
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

let customerId;
let vendorId;
let bankId;

async function createItem(name, openingStock) {
  const res = await httpJson(
    "POST",
    "/api/items",
    { name, costPrice: 1000, sellingPrice: 1500, openingStock },
    auth("inventory")
  );
  return res.body._id;
}

async function stockOnHand(itemId) {
  const res = await httpJson("GET", `/api/items/${itemId}`, null, auth("inventory"));
  return res.body.stockOnHand;
}

before(async () => {
  await startTestServer();
  await createUserWithPermissions("sales", "sales@test.local", ["sales:post"]);
  await createUserWithPermissions("purchasing", "purchasing@test.local", ["purchase:post"]);
  await createUserWithPermissions("inventory", "inventory@test.local", [
    "items:manage",
    "stock:adjust",
  ]);
  await createUserWithPermissions("financeApprover", "finance@test.local", [
    "bank:manage",
    "bank:view",
  ]);
  await createUserWithPermissions("plain", "plain@test.local", []);

  const customer = await Customer.create({ name: "Acme Textiles" });
  customerId = customer._id.toString();
  const vendor = await Vendor.create({ name: "Fabric Supplies Ltd" });
  vendorId = vendor._id.toString();

  const bankRes = await httpJson(
    "POST",
    "/api/bank-accounts",
    { name: "GTBank", accountNo: "0011223344", openingBalance: 500000 },
    auth("financeApprover")
  );
  bankId = bankRes.body._id;
});

after(stopTestServer);

test("sales:post permission is required to create a sales order", async () => {
  const item = await createItem("Denim Fabric", 100);
  const res = await httpJson(
    "POST",
    "/api/sales-orders",
    {
      customer: customerId,
      items: [{ item, qty: 5, unitPrice: 1500 }],
      paymentType: "CASH",
    },
    auth("plain")
  );
  assert.equal(res.status, 403);
});

test("POSTED cash sale decrements stock and posts no bank transaction", async () => {
  const item = await createItem("Ankara Bundle", 100);
  const res = await httpJson(
    "POST",
    "/api/sales-orders",
    {
      customer: customerId,
      items: [{ item, qty: 10, unitPrice: 1500 }],
      paymentType: "CASH",
    },
    auth("sales")
  );
  assert.equal(res.status, 201);
  assert.equal(res.body.receiptNo, "RCT-000001");
  assert.equal(res.body.grandTotal, 15000);
  assert.equal(await stockOnHand(item), 90);
});

test("POSTED bank sale decrements stock and posts a matching deposit", async () => {
  const item = await createItem("Lace Roll", 50);
  const before = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );

  const res = await httpJson(
    "POST",
    "/api/sales-orders",
    {
      customer: customerId,
      items: [{ item, qty: 4, unitPrice: 1500 }],
      paymentType: "BANK",
      bank: bankId,
    },
    auth("sales")
  );
  assert.equal(res.status, 201);
  assert.equal(await stockOnHand(item), 46);

  const after = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  assert.equal(after.body.balance - before.body.balance, 6000);

  const ledger = await httpJson(
    "GET",
    `/api/bank-transactions?bank=${bankId}&type=INCOME`,
    null,
    auth("financeApprover")
  );
  assert.equal(ledger.status, 200);
  const posted = ledger.body.items.find((t) => t.ref === res.body.receiptNo);
  assert.ok(posted, "expected an INCOME transaction referencing the sales receipt");
  assert.equal(posted.deposit, 6000);
});

test("PENDING sale does not move stock or post a bank transaction", async () => {
  const item = await createItem("Silk Yard", 20);
  const res = await httpJson(
    "POST",
    "/api/sales-orders",
    {
      customer: customerId,
      items: [{ item, qty: 5, unitPrice: 1500 }],
      paymentType: "BANK",
      bank: bankId,
      status: "PENDING",
    },
    auth("sales")
  );
  assert.equal(res.status, 201);
  assert.equal(res.body.status, "PENDING");
  assert.equal(await stockOnHand(item), 20);
});

test("CREDIT sale decrements stock but posts no bank transaction", async () => {
  const item = await createItem("Chiffon Roll", 30);
  const res = await httpJson(
    "POST",
    "/api/sales-orders",
    {
      customer: customerId,
      items: [{ item, qty: 3, unitPrice: 1500 }],
      paymentType: "CREDIT",
    },
    auth("sales")
  );
  assert.equal(res.status, 201);
  assert.equal(await stockOnHand(item), 27);
});

test("bank payment type requires a bank id", async () => {
  const item = await createItem("Voile Fabric", 10);
  const res = await httpJson(
    "POST",
    "/api/sales-orders",
    {
      customer: customerId,
      items: [{ item, qty: 1, unitPrice: 1500 }],
      paymentType: "BANK",
    },
    auth("sales")
  );
  assert.equal(res.status, 400);
});

test("POSTED bank purchase increments stock and posts a matching withdrawal", async () => {
  const item = await createItem("Raw Cotton", 0);
  const before = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );

  const res = await httpJson(
    "POST",
    "/api/purchase-orders",
    {
      vendor: vendorId,
      items: [{ item, qty: 20, unitPrice: 1000 }],
      paymentType: "BANK",
      bank: bankId,
    },
    auth("purchasing")
  );
  assert.equal(res.status, 201);
  assert.equal(res.body.billNo, "BILL-000001");
  assert.equal(await stockOnHand(item), 20);

  const after = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  assert.equal(before.body.balance - after.body.balance, 20000);
});

test("purchase:post permission is required to create a purchase order", async () => {
  const item = await createItem("Poly Thread", 0);
  const res = await httpJson(
    "POST",
    "/api/purchase-orders",
    {
      vendor: vendorId,
      items: [{ item, qty: 1, unitPrice: 500 }],
      paymentType: "CASH",
    },
    auth("plain")
  );
  assert.equal(res.status, 403);
});

test("stock adjustment posts and reverses correctly", async () => {
  const item = await createItem("Buttons Pack", 100);

  const denied = await httpJson(
    "POST",
    "/api/stock-adjustments",
    { item, type: "DAMAGED", qty: 10, reason: "Water damage" },
    auth("plain")
  );
  assert.equal(denied.status, 403);

  const posted = await httpJson(
    "POST",
    "/api/stock-adjustments",
    { item, type: "DAMAGED", qty: 10, reason: "Water damage" },
    auth("inventory")
  );
  assert.equal(posted.status, 201);
  assert.equal(posted.body.adjNo, "ADJ-000001");
  assert.equal(await stockOnHand(item), 90);

  const reversed = await httpJson(
    "POST",
    `/api/stock-adjustments/${posted.body._id}/reverse`,
    { reason: "Recount showed no damage" },
    auth("inventory")
  );
  assert.equal(reversed.status, 200);
  assert.equal(await stockOnHand(item), 100);

  const doubleReverse = await httpJson(
    "POST",
    `/api/stock-adjustments/${posted.body._id}/reverse`,
    { reason: "Again" },
    auth("inventory")
  );
  assert.equal(doubleReverse.status, 400);
});

test("manual bank adjustment corrects the ledger and requires bank:manage", async () => {
  const denied = await httpJson(
    "POST",
    "/api/bank-transactions/adjustments",
    { bank: bankId, deposit: 1000, narration: "Interest credit" },
    auth("plain")
  );
  assert.equal(denied.status, 403);

  const before = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  const res = await httpJson(
    "POST",
    "/api/bank-transactions/adjustments",
    { bank: bankId, deposit: 2500, narration: "Interest credit" },
    auth("financeApprover")
  );
  assert.equal(res.status, 201);
  assert.equal(res.body.type, "BANK_ADJUSTMENT");

  const after = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  assert.equal(after.body.balance - before.body.balance, 2500);
});
