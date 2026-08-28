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
  await createUserWithPermissions("inventory", "inventory@test.local", ["items:manage"]);
  await createUserWithPermissions("sales", "sales@test.local", ["sales:post", "returns:post"]);
  await createUserWithPermissions("purchasing", "purchasing@test.local", [
    "purchase:post",
    "returns:post",
  ]);
  await createUserWithPermissions("financeApprover", "finance@test.local", [
    "bank:manage",
    "bank:view",
    "assets:manage",
    "returns:reverse",
  ]);
  await createUserWithPermissions("plain", "plain@test.local", []);

  const customer = await Customer.create({ name: "Acme Textiles" });
  customerId = customer._id.toString();
  const vendor = await Vendor.create({ name: "Fabric Supplies Ltd" });
  vendorId = vendor._id.toString();

  const bankRes = await httpJson(
    "POST",
    "/api/bank-accounts",
    { name: "GTBank", accountNo: "0022334455", openingBalance: 0 },
    auth("financeApprover")
  );
  bankId = bankRes.body._id;
});

after(stopTestServer);

test("assets:manage permission is required to create an asset", async () => {
  const res = await httpJson(
    "POST",
    "/api/assets",
    {
      name: "Sewing Machine",
      purchaseDate: "2025-01-01",
      cost: 240000,
      usefulLifeYears: 5,
      depreciationMethod: "STRAIGHT_LINE",
    },
    auth("plain")
  );
  assert.equal(res.status, 403);
});

test("straight-line depreciation is computed from purchaseDate/cost/usefulLife", async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const res = await httpJson(
    "POST",
    "/api/assets",
    {
      name: "Industrial Sewing Machine",
      purchaseDate: sixMonthsAgo.toISOString(),
      cost: 240000,
      usefulLifeYears: 5,
      depreciationMethod: "STRAIGHT_LINE",
    },
    auth("financeApprover")
  );
  assert.equal(res.status, 201);
  assert.match(res.body.assetId, /^AST-\d{6}$/);

  // monthlyDep = 240000 / (5*12) = 4000; 6 months elapsed => accumulated ~24000
  assert.ok(Math.abs(res.body.monthlyDepreciation - 4000) < 1);
  assert.ok(Math.abs(res.body.accumulatedDepreciation - 24000) < 100);
  assert.ok(Math.abs(res.body.netBookValue - (240000 - 24000)) < 100);
  assert.equal(res.body.fullyDepreciated, false);
});

test("reducing-balance depreciation reduces net book value without erroring", async () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const res = await httpJson(
    "POST",
    "/api/assets",
    {
      name: "Delivery Van",
      purchaseDate: oneYearAgo.toISOString(),
      cost: 5000000,
      usefulLifeYears: 5,
      depreciationMethod: "REDUCING_BALANCE",
    },
    auth("financeApprover")
  );
  assert.equal(res.status, 201);
  assert.ok(res.body.netBookValue < 5000000);
  assert.ok(res.body.netBookValue > 0);
  assert.ok(res.body.accumulatedDepreciation > 0);
});

test("customer return: cannot return more than was sold, stock is restored, and reversal undoes it", async () => {
  const item = await createItem("Ankara Bundle", 100);
  const sale = await httpJson(
    "POST",
    "/api/sales-orders",
    { customer: customerId, items: [{ item, qty: 10, unitPrice: 1500 }], paymentType: "CASH" },
    auth("sales")
  );
  assert.equal(await stockOnHand(item), 90);

  const denied = await httpJson(
    "POST",
    "/api/returns",
    {
      returnType: "CUSTOMER",
      referenceType: "SALES_ORDER",
      referenceId: sale.body._id,
      party: customerId,
      settlementType: "CASH_REFUND",
      items: [{ item, qty: 4, unitPrice: 1500, reason: "DAMAGED" }],
    },
    auth("plain")
  );
  assert.equal(denied.status, 403);

  const firstReturn = await httpJson(
    "POST",
    "/api/returns",
    {
      returnType: "CUSTOMER",
      referenceType: "SALES_ORDER",
      referenceId: sale.body._id,
      party: customerId,
      settlementType: "CASH_REFUND",
      items: [{ item, qty: 4, unitPrice: 1500, reason: "DAMAGED" }],
    },
    auth("sales")
  );
  assert.equal(firstReturn.status, 201);
  assert.match(firstReturn.body.returnNo, /^CRN-\d{6}$/);
  assert.equal(await stockOnHand(item), 94);

  // Only 6 remain returnable (10 sold - 4 already returned); asking for 7 should fail.
  const overReturn = await httpJson(
    "POST",
    "/api/returns",
    {
      returnType: "CUSTOMER",
      referenceType: "SALES_ORDER",
      referenceId: sale.body._id,
      party: customerId,
      settlementType: "CASH_REFUND",
      items: [{ item, qty: 7, unitPrice: 1500, reason: "WRONG_ITEM" }],
    },
    auth("sales")
  );
  assert.equal(overReturn.status, 400);

  const reverseDenied = await httpJson(
    "POST",
    `/api/returns/${firstReturn.body._id}/reverse`,
    { reason: "Mistake" },
    auth("sales")
  );
  assert.equal(reverseDenied.status, 403);

  const reversed = await httpJson(
    "POST",
    `/api/returns/${firstReturn.body._id}/reverse`,
    { reason: "Customer changed their mind, no longer returning" },
    auth("financeApprover")
  );
  assert.equal(reversed.status, 200);
  assert.equal(reversed.body.status, "REVERSED");
  assert.equal(await stockOnHand(item), 90);

  const doubleReverse = await httpJson(
    "POST",
    `/api/returns/${firstReturn.body._id}/reverse`,
    { reason: "Again" },
    auth("financeApprover")
  );
  assert.equal(doubleReverse.status, 400);
});

test("supplier return with BANK_REFUND posts a deposit, and reversal undoes stock + bank together", async () => {
  const item = await createItem("Raw Cotton Bale", 0);
  const purchase = await httpJson(
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
  assert.equal(await stockOnHand(item), 20);

  const before = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );

  const ret = await httpJson(
    "POST",
    "/api/returns",
    {
      returnType: "SUPPLIER",
      referenceType: "PURCHASE_ORDER",
      referenceId: purchase.body._id,
      party: vendorId,
      settlementType: "BANK_REFUND",
      bank: bankId,
      items: [{ item, qty: 5, unitPrice: 1000, reason: "SUPPLIER_ERROR" }],
    },
    auth("purchasing")
  );
  assert.equal(ret.status, 201);
  assert.match(ret.body.returnNo, /^SRN-\d{6}$/);
  assert.equal(await stockOnHand(item), 15);

  const afterPost = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  assert.equal(afterPost.body.balance - before.body.balance, 5000);

  const reversed = await httpJson(
    "POST",
    `/api/returns/${ret.body._id}/reverse`,
    { reason: "Return was rejected by supplier" },
    auth("financeApprover")
  );
  assert.equal(reversed.status, 200);
  assert.equal(await stockOnHand(item), 20);

  const afterReversal = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  assert.equal(afterReversal.body.balance, before.body.balance);
});

test("returnType and referenceType must be compatible", async () => {
  const item = await createItem("Test Fabric", 10);
  const sale = await httpJson(
    "POST",
    "/api/sales-orders",
    { customer: customerId, items: [{ item, qty: 1, unitPrice: 1500 }], paymentType: "CASH" },
    auth("sales")
  );

  const res = await httpJson(
    "POST",
    "/api/returns",
    {
      returnType: "SUPPLIER",
      referenceType: "SALES_ORDER",
      referenceId: sale.body._id,
      party: vendorId,
      settlementType: "CASH_REFUND",
      items: [{ item, qty: 1, unitPrice: 1500, reason: "OTHER" }],
    },
    auth("purchasing")
  );
  assert.equal(res.status, 400);
});
