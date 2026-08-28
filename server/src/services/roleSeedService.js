import Role from "../models/Role.js";
import { PERMISSIONS, ALL_PERMISSIONS } from "../config/permissions.js";

export const ROLE_DEFINITIONS = [
  { name: "Super Admin", description: "Full system access", permissions: ALL_PERMISSIONS },
  {
    name: "Sales",
    description: "Customers, sales entry, invoicing, customer returns",
    permissions: [
      PERMISSIONS.customersManage,
      PERMISSIONS.salesPost,
      PERMISSIONS.invoicesManage,
      PERMISSIONS.returnsPost,
    ],
  },
  {
    name: "Purchasing",
    description: "Vendors, purchase/expense entry, supplier returns",
    permissions: [PERMISSIONS.vendorsManage, PERMISSIONS.purchasePost, PERMISSIONS.returnsPost, PERMISSIONS.expensesPost],
  },
  {
    name: "Inventory Manager",
    description: "Item master, stock adjustments, inventory reports",
    permissions: [PERMISSIONS.itemsManage, PERMISSIONS.stockAdjust, PERMISSIONS.inventoryReport],
  },
  {
    name: "Accountant",
    description: "Raise payment vouchers, record invoice payments, view bank ledger",
    permissions: [
      PERMISSIONS.voucherRaise,
      PERMISSIONS.invoicePaymentsRecord,
      PERMISSIONS.bankView,
    ],
  },
  {
    name: "Finance Approver",
    description:
      "Approve/pay vouchers, bank master, stock-adjustment approval, fixed assets, return reversals",
    permissions: [
      PERMISSIONS.voucherApprove,
      PERMISSIONS.voucherPay,
      PERMISSIONS.bankManage,
      PERMISSIONS.bankView,
      PERMISSIONS.stockAdjust,
      PERMISSIONS.assetsManage,
      PERMISSIONS.returnsReverse,
    ],
  },
  {
    name: "Viewer",
    description: "Read-only reports access",
    permissions: [PERMISSIONS.reportsView, PERMISSIONS.inventoryReport],
  },
];

/** Upserts the standard role set and returns a { [roleName]: RoleDoc } map. Idempotent. */
export async function ensureDefaultRoles() {
  const rolesByName = {};
  for (const def of ROLE_DEFINITIONS) {
    rolesByName[def.name] = await Role.findOneAndUpdate(
      { name: def.name },
      { $set: def },
      { upsert: true, new: true }
    );
  }
  return rolesByName;
}
