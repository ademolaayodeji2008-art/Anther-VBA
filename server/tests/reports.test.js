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
let denimItemId;
let lowStockItemId;

async function createItem(name, openingStock, extra = {}) {
  const res = await httpJson(
    "POST",
    "/api/items",
    { name, costPrice: 1000, sellingPrice: 1500, openingStock, ...extra },
    auth("inventory")
  );
  return res.body._id;
}

before(async () => {
  await startTestServer();
  await createUserWithPermissions("inventory", "inventory@test.local", ["items:manage"]);
  await createUserWithPermissions("sales", "sales@test.local", ["sales:post", "invoices:manage"]);
  await createUserWithPermissions("purchasing", "purchasing@test.local", ["purchase:post"]);
  await createUserWithPermissions("accountant", "accountant@test.local", ["invoicePayments:record"]);
  await createUserWithPermissions("financeApprover", "finance@test.local", ["bank:manage", "bank:view"]);
  await createUserWithPermissions("viewer", "viewer@test.local", ["reports:view"]);
  await createUserWithPermissions("inventoryOnly", "inventoryonly@test.local", ["inventory:report"]);
  await createUserWithPermissions("plain", "plain@test.local", []);

  const customer = await Customer.create({ name: "Acme Textiles" });
  customerId = customer._id.toString();
  const vendor = await Vendor.create({ name: "Fabric Supplies Ltd" });
  vendorId = vendor._id.toString();

  const bankRes = await httpJson(
    "POST",
    "/api/bank-accounts",
    { name: "GTBank", accountNo: "0033445566", openingBalance: 0 },
    auth("financeApprover")
  );
  bankId = bankRes.body._id;

  denimItemId = await createItem("Denim Fabric", 100);
  lowStockItemId = await createItem("Rare Silk", 2, { lowStockThreshold: 10 });

  // POSTED cash sale: 10 units @ 1500 = 15000
  await httpJson(
    "POST",
    "/api/sales-orders",
    { customer: customerId, items: [{ item: denimItemId, qty: 10, unitPrice: 1500 }], paymentType: "CASH" },
    auth("sales")
  );

  // PENDING sale: should not count toward "today sales" or sales report (status POSTED filter)
  await httpJson(
    "POST",
    "/api/sales-orders",
    {
      customer: customerId,
      items: [{ item: denimItemId, qty: 3, unitPrice: 1500 }],
      paymentType: "CASH",
      status: "PENDING",
    },
    auth("sales")
  );

  // POSTED credit purchase: 20 units @ 1000 = 20000, category "Raw Materials"
  await httpJson(
    "POST",
    "/api/purchase-orders",
    {
      vendor: vendorId,
      items: [{ item: denimItemId, qty: 20, unitPrice: 1000 }],
      category: "Raw Materials",
      paymentType: "CREDIT",
    },
    auth("purchasing")
  );

  // Invoice, partially paid -> outstanding > 0, counts as a receivable
  const invoiceRes = await httpJson(
    "POST",
    "/api/invoices",
    {
      customer: customerId,
      items: [{ item: denimItemId, qty: 5, unitPrice: 1500 }],
      termsDays: 30,
      bank: bankId,
    },
    auth("sales")
  );
  await httpJson(
    "POST",
    "/api/invoice-payments",
    { invoice: invoiceRes.body._id, amount: 3000, method: "CASH" },
    auth("accountant")
  );

  // Overdue, fully-unpaid invoice (backdated, short terms)
  const pastIssueDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  await httpJson(
    "POST",
    "/api/invoices",
    {
      customer: customerId,
      issueDate: pastIssueDate.toISOString(),
      items: [{ item: denimItemId, qty: 2, unitPrice: 1500 }],
      termsDays: 3,
      bank: bankId,
    },
    auth("sales")
  );
});

after(stopTestServer);

test("reports:view permission is required for sales/purchases/expenses/receivables/payables/dashboard", async () => {
  const endpoints = ["/sales", "/purchases", "/expenses", "/receivables", "/payables", "/dashboard"];
  for (const path of endpoints) {
    const res = await httpJson("GET", `/api/reports${path}`, null, auth("plain"));
    assert.equal(res.status, 403, `expected 403 for ${path}`);
  }
});

test("inventory report accepts either reports:view or inventory:report", async () => {
  const viaViewer = await httpJson("GET", "/api/reports/inventory", null, auth("viewer"));
  assert.equal(viaViewer.status, 200);

  const viaInventoryOnly = await httpJson("GET", "/api/reports/inventory", null, auth("inventoryOnly"));
  assert.equal(viaInventoryOnly.status, 200);

  const denied = await httpJson("GET", "/api/reports/inventory", null, auth("plain"));
  assert.equal(denied.status, 403);
});

test("sales report groups by item and supports a detailed (groupBy=none) mode", async () => {
  const grouped = await httpJson("GET", "/api/reports/sales?groupBy=item", null, auth("viewer"));
  assert.equal(grouped.status, 200);
  const denimRow = grouped.body.data.find((r) => r._id === denimItemId);
  assert.ok(denimRow, "expected a row for the denim item");
  assert.equal(denimRow.qty, 10);
  assert.equal(denimRow.subtotal, 15000);
  assert.equal(denimRow.name, "Denim Fabric");

  const detailed = await httpJson("GET", "/api/reports/sales?groupBy=none", null, auth("viewer"));
  assert.equal(detailed.status, 200);
  assert.equal(detailed.body.data.length, 1); // only the POSTED cash sale, not the PENDING one
});

test("purchases report groups by vendor", async () => {
  const res = await httpJson("GET", "/api/reports/purchases?groupBy=vendor", null, auth("viewer"));
  assert.equal(res.status, 200);
  const vendorRow = res.body.data.find((r) => r._id === vendorId);
  assert.ok(vendorRow);
  assert.equal(vendorRow.qty, 20);
  assert.equal(vendorRow.total, 20000);
  assert.equal(vendorRow.name, "Fabric Supplies Ltd");
});

test("expenses report groups by category", async () => {
  const res = await httpJson("GET", "/api/reports/expenses?groupBy=category", null, auth("viewer"));
  assert.equal(res.status, 200);
  const row = res.body.data.find((r) => r._id === "Raw Materials");
  assert.ok(row);
  assert.equal(row.total, 20000);
});

test("receivables report only counts invoices with outstanding balance", async () => {
  const res = await httpJson("GET", "/api/reports/receivables", null, auth("viewer"));
  assert.equal(res.status, 200);
  const row = res.body.data.find((r) => r._id === customerId);
  assert.ok(row);
  // Invoice 1: 7500 - 3000 paid = 4500 outstanding. Invoice 2 (overdue): 3000 outstanding. Total 7500.
  assert.equal(row.outstanding, 7500);
});

test("payables report only counts CREDIT purchase orders", async () => {
  const res = await httpJson("GET", "/api/reports/payables?groupBy=vendor", null, auth("viewer"));
  assert.equal(res.status, 200);
  const row = res.body.data.find((r) => r._id === vendorId);
  assert.ok(row);
  assert.equal(row.total, 20000);
});

test("inventory report's closingStock matches the item's live stockOnHand", async () => {
  const report = await httpJson("GET", "/api/reports/inventory", null, auth("viewer"));
  assert.equal(report.status, 200);
  const row = report.body.data.find((r) => r.item === denimItemId);
  assert.ok(row);

  const itemNow = await httpJson("GET", `/api/items/${denimItemId}`, null, auth("inventory"));
  assert.equal(row.closingStock, itemNow.body.stockOnHand);
  assert.equal(row.purchases, 20);
  assert.equal(row.sales, 17); // 10 (posted sale) + 5 (invoice) + 2 (overdue invoice)
});

test("dashboard summary reflects today's activity, receivables, payables and low stock", async () => {
  const res = await httpJson("GET", "/api/reports/dashboard", null, auth("viewer"));
  assert.equal(res.status, 200);
  assert.equal(res.body.todaySales, 15000);
  assert.equal(res.body.todayPurchases, 20000); // POSTED regardless of paymentType (CREDIT here)
  assert.equal(res.body.receivablesTotal, 7500);
  assert.equal(res.body.payablesTotal, 20000);
  assert.equal(res.body.pendingSalesCount, 1);
  assert.equal(res.body.pendingSalesTotal, 4500);
  assert.ok(res.body.overdueInvoiceCount >= 1);
  assert.ok(res.body.lowStockCount >= 1);
});
