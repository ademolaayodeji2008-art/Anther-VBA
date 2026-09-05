import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";
import { VerifyEmailPage } from "./features/auth/VerifyEmailPage";
import { SelectOrgPage } from "./features/auth/SelectOrgPage";
import { LandingPage } from "./features/landing/LandingPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { CustomersPage } from "./features/customers/CustomersPage";
import { VendorsPage } from "./features/vendors/VendorsPage";
import { ItemsPage } from "./features/items/ItemsPage";
import { BankAccountsPage } from "./features/bankAccounts/BankAccountsPage";
import { SalesOrdersPage } from "./features/salesOrders/SalesOrdersPage";
import { PurchaseOrdersPage } from "./features/purchaseOrders/PurchaseOrdersPage";
import { StockAdjustmentsPage } from "./features/stockAdjustments/StockAdjustmentsPage";
import { BankTransactionsPage } from "./features/bankTransactions/BankTransactionsPage";
import { InvoicesPage } from "./features/invoices/InvoicesPage";
import { InvoicePaymentsPage } from "./features/invoicePayments/InvoicePaymentsPage";
import { PaymentVouchersPage } from "./features/paymentVouchers/PaymentVouchersPage";
import { AssetsPage } from "./features/assets/AssetsPage";
import { ReturnsPage } from "./features/returns/ReturnsPage";
import { SalesReportPage } from "./features/reports/SalesReportPage";
import { PurchasesReportPage } from "./features/reports/PurchasesReportPage";
import { ExpensesReportPage } from "./features/reports/ExpensesReportPage";
import { ReceivablesReportPage } from "./features/reports/ReceivablesReportPage";
import { PayablesReportPage } from "./features/reports/PayablesReportPage";
import { InventoryReportPage } from "./features/reports/InventoryReportPage";
import { UsersPage } from "./features/admin/UsersPage";
import { RolesPage } from "./features/admin/RolesPage";
import { ExpensesPage } from "./features/expenses/ExpensesPage";
import { PlatformAdminPage } from "./features/platformAdmin/PlatformAdminPage";

// Central failure surface: without this, a rejected create/update mutation just leaves its modal
// open with no visible feedback — the user has no way to know why nothing happened.
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      window.alert(error?.response?.data?.message ?? "Something went wrong. Please try again.");
    },
  }),
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/select-org" element={<SelectOrgPage />} />
            <Route path="/platform-admin" element={<PlatformAdminPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/items" element={<ItemsPage />} />
                <Route path="/sales-orders" element={<SalesOrdersPage />} />
                <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/invoice-payments" element={<InvoicePaymentsPage />} />
                <Route path="/payment-vouchers" element={<PaymentVouchersPage />} />
                <Route path="/assets" element={<AssetsPage />} />
                <Route path="/returns" element={<ReturnsPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />

                <Route element={<ProtectedRoute permission="bank:view" />}>
                  <Route path="/bank-accounts" element={<BankAccountsPage />} />
                  <Route path="/bank-transactions" element={<BankTransactionsPage />} />
                </Route>
                <Route element={<ProtectedRoute permission="stock:adjust" />}>
                  <Route path="/stock-adjustments" element={<StockAdjustmentsPage />} />
                </Route>

                <Route element={<ProtectedRoute permission="reports:view" />}>
                  <Route path="/reports/sales" element={<SalesReportPage />} />
                  <Route path="/reports/purchases" element={<PurchasesReportPage />} />
                  <Route path="/reports/expenses" element={<ExpensesReportPage />} />
                  <Route path="/reports/receivables" element={<ReceivablesReportPage />} />
                  <Route path="/reports/payables" element={<PayablesReportPage />} />
                </Route>
                <Route element={<ProtectedRoute anyOf={["reports:view", "inventory:report"]} />}>
                  <Route path="/reports/inventory" element={<InventoryReportPage />} />
                </Route>

                <Route element={<ProtectedRoute permission="users:manage" />}>
                  <Route path="/admin/users" element={<UsersPage />} />
                </Route>
                <Route element={<ProtectedRoute permission="roles:manage" />}>
                  <Route path="/admin/roles" element={<RolesPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
