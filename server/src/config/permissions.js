/** Master permission list for the ERP. Grouped by resource; each role is a subset of these. */
export const PERMISSIONS = {
  usersManage: "users:manage",
  rolesManage: "roles:manage",

  customersManage: "customers:manage",
  vendorsManage: "vendors:manage",

  itemsManage: "items:manage",
  stockAdjust: "stock:adjust",
  inventoryReport: "inventory:report",

  salesPost: "sales:post",
  purchasePost: "purchase:post",

  invoicesManage: "invoices:manage",
  invoicePaymentsRecord: "invoicePayments:record",

  bankView: "bank:view",
  bankManage: "bank:manage",

  voucherRaise: "voucher:raise",
  voucherApprove: "voucher:approve",
  voucherPay: "voucher:pay",

  assetsManage: "assets:manage",
  returnsPost: "returns:post",
  returnsReverse: "returns:reverse",

  expensesPost: "expenses:post",

  reportsView: "reports:view",
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
