import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import itemRoutes from "./routes/itemRoutes.js";
import bankAccountRoutes from "./routes/bankAccountRoutes.js";
import salesOrderRoutes from "./routes/salesOrderRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import stockAdjustmentRoutes from "./routes/stockAdjustmentRoutes.js";
import bankTransactionRoutes from "./routes/bankTransactionRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import invoicePaymentRoutes from "./routes/invoicePaymentRoutes.js";
import paymentVoucherRoutes from "./routes/paymentVoucherRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";
import returnRoutes from "./routes/returnRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import fabricOptionsRoutes from "./routes/fabricOptionsRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/roles", roleRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/vendors", vendorRoutes);
  app.use("/api/items", itemRoutes);
  app.use("/api/bank-accounts", bankAccountRoutes);
  app.use("/api/sales-orders", salesOrderRoutes);
  app.use("/api/purchase-orders", purchaseOrderRoutes);
  app.use("/api/stock-adjustments", stockAdjustmentRoutes);
  app.use("/api/bank-transactions", bankTransactionRoutes);
  app.use("/api/invoices", invoiceRoutes);
  app.use("/api/invoice-payments", invoicePaymentRoutes);
  app.use("/api/payment-vouchers", paymentVoucherRoutes);
  app.use("/api/assets", assetRoutes);
  app.use("/api/returns", returnRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/fabric-options", fabricOptionsRoutes);
  app.use("/api/expenses", expenseRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
