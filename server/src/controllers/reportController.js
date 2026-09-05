import * as reportService from "../services/reportService.js";
import { parseDateRange } from "../utils/queryHelpers.js";

export async function getSalesReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.salesReport(req.tenantDb, { start, end, groupBy: req.query.groupBy ?? "item", status: req.query.status ?? "POSTED" });
    res.json({ start, end, groupBy: req.query.groupBy ?? "item", data });
  } catch (err) { next(err); }
}

export async function getPurchasesReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.purchasesReport(req.tenantDb, { start, end, groupBy: req.query.groupBy ?? "item", status: req.query.status ?? "POSTED" });
    res.json({ start, end, groupBy: req.query.groupBy ?? "item", data });
  } catch (err) { next(err); }
}

export async function getExpensesReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.expensesReport(req.tenantDb, { start, end, groupBy: req.query.groupBy ?? "category" });
    res.json({ start, end, groupBy: req.query.groupBy ?? "category", data });
  } catch (err) { next(err); }
}

export async function getReceivablesReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.receivablesReport(req.tenantDb, { start, end, groupBy: req.query.groupBy ?? "customer" });
    res.json({ start, end, groupBy: req.query.groupBy ?? "customer", data });
  } catch (err) { next(err); }
}

export async function getPayablesReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.payablesReport(req.tenantDb, { start, end, groupBy: req.query.groupBy ?? "vendor" });
    res.json({ start, end, groupBy: req.query.groupBy ?? "vendor", data });
  } catch (err) { next(err); }
}

export async function getInventoryReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.inventoryReport(req.tenantDb, { start, end });
    res.json({ start, end, data });
  } catch (err) { next(err); }
}

export async function getDashboard(req, res, next) {
  try {
    const data = await reportService.dashboardSummary(req.tenantDb);
    res.json(data);
  } catch (err) { next(err); }
}
