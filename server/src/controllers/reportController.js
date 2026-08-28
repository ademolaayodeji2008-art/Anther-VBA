import * as reportService from "../services/reportService.js";
import { parseDateRange } from "../utils/queryHelpers.js";

export async function getSalesReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const groupBy = req.query.groupBy ?? "item";
    const data = await reportService.salesReport({
      start,
      end,
      groupBy,
      status: req.query.status ?? "POSTED",
    });
    res.json({ start, end, groupBy, data });
  } catch (err) {
    next(err);
  }
}

export async function getPurchasesReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const groupBy = req.query.groupBy ?? "item";
    const data = await reportService.purchasesReport({
      start,
      end,
      groupBy,
      status: req.query.status ?? "POSTED",
    });
    res.json({ start, end, groupBy, data });
  } catch (err) {
    next(err);
  }
}

export async function getExpensesReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const groupBy = req.query.groupBy ?? "category";
    const data = await reportService.expensesReport({ start, end, groupBy });
    res.json({ start, end, groupBy, data });
  } catch (err) {
    next(err);
  }
}

export async function getReceivablesReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const groupBy = req.query.groupBy ?? "customer";
    const data = await reportService.receivablesReport({ start, end, groupBy });
    res.json({ start, end, groupBy, data });
  } catch (err) {
    next(err);
  }
}

export async function getPayablesReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const groupBy = req.query.groupBy ?? "vendor";
    const data = await reportService.payablesReport({ start, end, groupBy });
    res.json({ start, end, groupBy, data });
  } catch (err) {
    next(err);
  }
}

export async function getInventoryReport(req, res, next) {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.inventoryReport({ start, end });
    res.json({ start, end, data });
  } catch (err) {
    next(err);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const data = await reportService.dashboardSummary();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
