import { PERMISSIONS, ALL_PERMISSIONS } from "../config/permissions.js";
import { getModels } from "../tenant/tenantDb.js";

const ROLE_DEFINITIONS = [
  {
    name: "Super Admin",
    description: "Full access to everything",
    permissions: ALL_PERMISSIONS,
  },
  {
    name: "Sales",
    description: "Customers, sales orders, invoices, returns",
    permissions: [
      PERMISSIONS.customersManage, PERMISSIONS.salesPost,
      PERMISSIONS.invoicesManage, PERMISSIONS.invoicePaymentsRecord, PERMISSIONS.returnsPost,
    ],
  },
  {
    name: "Purchasing",
    description: "Vendors, purchase orders, expenses, supplier returns",
    permissions: [
      PERMISSIONS.vendorsManage, PERMISSIONS.purchasePost,
      PERMISSIONS.returnsPost, PERMISSIONS.expensesPost,
    ],
  },
  {
    name: "Inventory Manager",
    description: "Items, stock adjustments, inventory report",
    permissions: [PERMISSIONS.itemsManage, PERMISSIONS.stockAdjust, PERMISSIONS.inventoryReport],
  },
  {
    name: "Accountant",
    description: "Payment vouchers, invoice payments, bank view",
    permissions: [
      PERMISSIONS.voucherRaise, PERMISSIONS.invoicePaymentsRecord, PERMISSIONS.bankView,
    ],
  },
  {
    name: "Finance Approver",
    description: "Approves vouchers, manages bank, assets, returns reversal",
    permissions: [
      PERMISSIONS.voucherApprove, PERMISSIONS.voucherPay,
      PERMISSIONS.bankManage, PERMISSIONS.bankView,
      PERMISSIONS.stockAdjust, PERMISSIONS.assetsManage, PERMISSIONS.returnsReverse,
    ],
  },
  {
    name: "Viewer",
    description: "Read-only access to reports",
    permissions: [PERMISSIONS.reportsView, PERMISSIONS.inventoryReport],
  },
];

/**
 * Seeds (or updates) the 7 fixed roles into the given tenant connection's Role collection.
 * Safe to call multiple times — uses upsert on role name.
 *
 * @param {import("mongoose").Connection} tenantDb
 */
export async function ensureOrgRoles(tenantDb) {
  const { Role } = getModels(tenantDb);
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
