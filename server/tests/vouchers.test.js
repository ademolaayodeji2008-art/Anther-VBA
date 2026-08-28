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

let bankId;

async function raiseVoucher(overrides = {}) {
  return httpJson(
    "POST",
    "/api/payment-vouchers",
    {
      payee: "Fabric Supplies Ltd",
      source: "DIRECT_PAYMENT",
      items: [{ item: "Office rent", qty: 1, unitAmount: 50000 }],
      ...overrides,
    },
    auth("accountant")
  );
}

before(async () => {
  await startTestServer();
  await createUserWithPermissions("accountant", "accountant@test.local", ["voucher:raise"]);
  await createUserWithPermissions("financeApprover", "finance@test.local", [
    "voucher:approve",
    "voucher:pay",
    "bank:manage",
    "bank:view",
  ]);
  await createUserWithPermissions("plain", "plain@test.local", []);

  const bankRes = await httpJson(
    "POST",
    "/api/bank-accounts",
    { name: "GTBank", accountNo: "0099887766", openingBalance: 0 },
    auth("financeApprover")
  );
  bankId = bankRes.body._id;
});

after(stopTestServer);

test("voucher:raise permission is required to raise a voucher", async () => {
  const res = await httpJson(
    "POST",
    "/api/payment-vouchers",
    {
      payee: "Someone",
      source: "OTHER",
      items: [{ item: "Misc", qty: 1, unitAmount: 100 }],
    },
    auth("plain")
  );
  assert.equal(res.status, 403);
});

test("raising a voucher generates a monthly-numbered id and RAISED history entry", async () => {
  const res = await raiseVoucher();
  assert.equal(res.status, 201);
  const now = new Date();
  const expectedPrefix = `PV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  assert.ok(res.body.voucherNo.startsWith(expectedPrefix));
  assert.equal(res.body.status, "PENDING");
  assert.equal(res.body.totalAmount, 50000);
  assert.equal(res.body.approvalHistory.length, 1);
  assert.equal(res.body.approvalHistory[0].action, "RAISED");
});

test("voucher:approve permission is required to approve or reject", async () => {
  const voucher = await raiseVoucher();
  const approveDenied = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/approve`,
    {},
    auth("plain")
  );
  assert.equal(approveDenied.status, 403);

  const rejectDenied = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/reject`,
    { notes: "no" },
    auth("plain")
  );
  assert.equal(rejectDenied.status, 403);
});

test("a voucher can only be approved once", async () => {
  const voucher = await raiseVoucher();
  const first = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/approve`,
    { notes: "Looks good" },
    auth("financeApprover")
  );
  assert.equal(first.status, 200);
  assert.equal(first.body.status, "APPROVED");

  const second = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/approve`,
    {},
    auth("financeApprover")
  );
  assert.equal(second.status, 400);
});

test("reject requires a reason, and a rejected voucher can be resubmitted", async () => {
  const voucher = await raiseVoucher();

  const noReason = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/reject`,
    {},
    auth("financeApprover")
  );
  assert.equal(noReason.status, 400);

  const rejected = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/reject`,
    { notes: "Wrong account details" },
    auth("financeApprover")
  );
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.status, "REJECTED");

  const resubmitDenied = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/resubmit`,
    { payeeAccountNo: "1234567890" },
    auth("plain")
  );
  assert.equal(resubmitDenied.status, 403);

  const resubmitted = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/resubmit`,
    { payeeAccountNo: "1234567890" },
    auth("accountant")
  );
  assert.equal(resubmitted.status, 200);
  assert.equal(resubmitted.body.status, "PENDING");
  assert.equal(resubmitted.body.payeeAccountNo, "1234567890");

  const doubleResubmit = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/resubmit`,
    {},
    auth("accountant")
  );
  assert.equal(doubleResubmit.status, 400);
});

test("only an approved voucher can be paid, and voucher:pay is required", async () => {
  const voucher = await raiseVoucher();

  const payPending = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/pay`,
    { paymentMethod: "CASH" },
    auth("financeApprover")
  );
  assert.equal(payPending.status, 400);

  await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/approve`,
    {},
    auth("financeApprover")
  );

  const denied = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/pay`,
    { paymentMethod: "CASH" },
    auth("accountant")
  );
  assert.equal(denied.status, 403);
});

test("paying by BANK posts a withdrawal for the total amount", async () => {
  const voucher = await raiseVoucher({
    items: [{ item: "Equipment repair", qty: 2, unitAmount: 15000 }],
  });
  await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/approve`,
    {},
    auth("financeApprover")
  );

  const before = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );

  const paid = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/pay`,
    { paymentMethod: "BANK", bank: bankId, paymentReference: "TRF-001" },
    auth("financeApprover")
  );
  assert.equal(paid.status, 200);
  assert.equal(paid.body.status, "PAID");

  const after = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  assert.equal(before.body.balance - after.body.balance, 30000);

  const alreadyPaid = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/pay`,
    { paymentMethod: "CASH" },
    auth("financeApprover")
  );
  assert.equal(alreadyPaid.status, 400);
});

test("paying by CASH does not touch the bank ledger", async () => {
  const voucher = await raiseVoucher();
  await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/approve`,
    {},
    auth("financeApprover")
  );

  const before = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  const paid = await httpJson(
    "POST",
    `/api/payment-vouchers/${voucher.body._id}/pay`,
    { paymentMethod: "CASH" },
    auth("financeApprover")
  );
  assert.equal(paid.status, 200);

  const after = await httpJson(
    "GET",
    `/api/bank-transactions/balance/${bankId}`,
    null,
    auth("financeApprover")
  );
  assert.equal(after.body.balance, before.body.balance);
});
