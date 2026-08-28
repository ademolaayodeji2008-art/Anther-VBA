/**
 * Mirrors server/src/config/permissions.js — there's no API endpoint exposing this list, so it's
 * duplicated here the same way other backend enums (voucher sources, return reasons) are.
 */
export const PERMISSIONS_LIST = [
  { value: "users:manage", label: "Manage Users" },
  { value: "roles:manage", label: "Manage Roles" },
  { value: "customers:manage", label: "Manage Customers" },
  { value: "vendors:manage", label: "Manage Vendors" },
  { value: "items:manage", label: "Manage Items" },
  { value: "stock:adjust", label: "Post Stock Adjustments" },
  { value: "inventory:report", label: "View Inventory Report" },
  { value: "sales:post", label: "Post Sales Orders" },
  { value: "purchase:post", label: "Post Purchase Orders" },
  { value: "invoices:manage", label: "Manage Invoices" },
  { value: "invoicePayments:record", label: "Record Invoice Payments" },
  { value: "bank:view", label: "View Bank Ledger" },
  { value: "bank:manage", label: "Manage Bank Accounts" },
  { value: "voucher:raise", label: "Raise Payment Vouchers" },
  { value: "voucher:approve", label: "Approve/Reject Payment Vouchers" },
  { value: "voucher:pay", label: "Pay Payment Vouchers" },
  { value: "assets:manage", label: "Manage Fixed Assets" },
  { value: "returns:post", label: "Post Returns" },
  { value: "returns:reverse", label: "Reverse Returns" },
  { value: "expenses:post", label: "Record Expenses" },
  { value: "reports:view", label: "View Reports & Dashboard" },
];
