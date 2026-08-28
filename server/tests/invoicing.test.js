import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import Role from "../src/models/Role.js";
import User from "../src/models/User.js";
import Customer from "../src/models/Customer.js";
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
  await createUserWithPermissions("sales", "sales@test.local", ["invoices:manage"]);
  await createUserWithPermissions("accountant", "accountant@test.local", [
    "invoicePayments:record",
  ]);
  await createUserWithPermissions("inventory", "inventory@test.local", ["items:manage"]);
  await createUserWithPermissions("financeApprover", "finance@test.local", [
    "bank:manage",
    "bank:view",
  ]);
  await createUserWithPermissions("plain", "plain@test.local", []);

  const customer = await Customer.create({ name: "Acme Textiles" });
  customerId = customer._id.toString();

  const bankRes = await httpJson(
    "POST",
    "/api/bank-accounts",
    { name: "GTBank", accountNo: "0055667788", openingBalance: 0 },
    auth("financeApprover")
  );
  bankId = bankRes.body._id;
});

after(stopTestServer);

test("invoices:manage permission required to create an invoice", async () => {
  const item = await createItem("Silk Fabric", 50);
  const res = await httpJson(
    "POST",
    "/api/invoices",
    {
      customer: customerId,
      items: [{ item, qty: 5, unitPrice: 1500 }],
      termsDays: 30,
      bank: bankId,
    },
    auth("plain")
  );
  assert.equal(res.status, 403);
});

test("creating an invoice decrements stock and computes dueDate/status/numbering", async () => {
  const item = await createItem("Cotton Roll", 50);
  const res = await httpJson(
    "POST",
    "/api/invoices",
    {
      customer: customerId,
      items: [{ item, qty: 10, unitPrice: 1500, vat: 750 }],
      termsDays: 30,
      bank: bankId,
    },
    auth("sales")
  );
  assert.equal(res.status, 201);
  assert.equal(res.body.invoiceNo, "INV-000001");
  assert.equal(res.body.poNo, "PO-000001");
  assert.equal(res.body.subtotal, 15000);
  assert.equal(res.body.vatTotal, 750);
  assert.equal(res.body.grandTotal, 15750);
  assert.equal(res.body.outstanding, 15750);
  assert.equal(res.body.paymentStatus, "UNPAID");
  assert.equal(res.body.invoiceStatus, "NOT_YET_DUE");

  const daysUntilDue = Math.round(
    (new Date(res.body.dueDate) - new Date(res.body.issueDate)) / (1000 * 60 * 60 * 24)
  );
  assert.equal(daysUntilDue, 30);
  assert.equal(await stockOnHand(item), 40);
});

test("an invoice past its due date with no payment reports OVERDUE", async () => {
  const item = await createItem("Wool Fabric", 20);
  const pastIssueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
  const res = await httpJson(
    "POST",
    "/api/invoices",
    {
      customer: customerId,
      issueDate: pastIssueDate.toISOString(),
      items: [{ item, qty: 2, unitPrice: 1500 }],
      termsDays: 3,
      bank: bankId,
    },
    auth("sales")
  );
  assert.equal(res.status, 201);
  assert.equal(res.body.invoiceStatus, "OVERDUE");
  return res.body._id;
});

test("invoicePayments:record permission is required to record a payment", async () => {
  const item = await createItem("Poly Fabric", 20);
  const invoiceRes = await httpJson(
    "POST",
    "/api/invoices",
    {
      customer: customerId,
      items: [{ item, qty: 2, unitPrice: 1500 }],
      termsDays: 30,
      bank: bankId,
    },
    auth("sales")
  );

  const res = await httpJson(
    "POST",
    "/api/invoice-payments",
    { invoice: invoiceRes.body._id, amount: 1000, method: "CASH" },
    auth("plain")
  );
  assert.equal(res.status, 403);
});

test("partial then full BANK payment updates status, outstanding, and posts to the bank ledger", async () => {
  const item = await createItem("Linen Fabric", 20);
  const invoiceRes = await httpJson(
    "POST",
    "/api/invoices",
    {
      customer: customerId,
      items: [{ item, qty: 2, unitPrice: 1500 }],
      termsDays: 30,
      bank: bankId,
    },
    auth("sales")
  );
  const invoiceId = invoiceRes.body._id;
  assert.equal(invoiceRes.body.grandTotal, 3000);

  const before = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );

  const partial = await httpJson(
    "POST",
    "/api/invoice-payments",
    { invoice: invoiceId, amount: 1000, method: "BANK", bank: bankId, receivedBy: "Cashier A" },
    auth("accountant")
  );
  assert.equal(partial.status, 201);
  assert.equal(partial.body.paymentNo, "PAY-000001");

  const afterPartial = await httpJson("GET", `/api/invoices/${invoiceId}`, null, auth("plain"));
  assert.equal(afterPartial.body.paymentStatus, "PARTIALLY_PAID");
  assert.equal(afterPartial.body.outstanding, 2000);
  assert.equal(afterPartial.body.invoiceStatus, "NOT_YET_DUE");

  const overpay = await httpJson(
    "POST",
    "/api/invoice-payments",
    { invoice: invoiceId, amount: 5000, method: "CASH" },
    auth("accountant")
  );
  assert.equal(overpay.status, 400);

  const final = await httpJson(
    "POST",
    "/api/invoice-payments",
    { invoice: invoiceId, amount: 2000, method: "BANK", bank: bankId },
    auth("accountant")
  );
  assert.equal(final.status, 201);

  const afterFull = await httpJson("GET", `/api/invoices/${invoiceId}`, null, auth("plain"));
  assert.equal(afterFull.body.paymentStatus, "PAID");
  assert.equal(afterFull.body.outstanding, 0);
  assert.equal(afterFull.body.invoiceStatus, "PAID");

  const alreadyPaid = await httpJson(
    "POST",
    "/api/invoice-payments",
    { invoice: invoiceId, amount: 1, method: "CASH" },
    auth("accountant")
  );
  assert.equal(alreadyPaid.status, 400);

  const after = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  assert.equal(after.body.balance - before.body.balance, 3000);
});

test("CASH payment does not touch the bank ledger", async () => {
  const item = await createItem("Velvet Fabric", 20);
  const invoiceRes = await httpJson(
    "POST",
    "/api/invoices",
    {
      customer: customerId,
      items: [{ item, qty: 1, unitPrice: 1500 }],
      termsDays: 30,
      bank: bankId,
    },
    auth("sales")
  );

  const before = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  const res = await httpJson(
    "POST",
    "/api/invoice-payments",
    { invoice: invoiceRes.body._id, amount: 1500, method: "CASH" },
    auth("accountant")
  );
  assert.equal(res.status, 201);

  const after = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  assert.equal(after.body.balance, before.body.balance);
});
