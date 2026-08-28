import { z } from "zod";
import Expense from "../models/Expense.js";
import { createExpense, updateExpense, deleteExpense } from "../services/expenseService.js";
import { parsePagination, buildSearchFilter, parseDateRange } from "../utils/queryHelpers.js";
import { optionalDate, requiredDate, optionalNumber } from "../utils/zodHelpers.js";

export const createExpenseSchema = z.object({
  date: requiredDate("Expense date is required"),
  particulars: z.string().min(1, "Particulars are required"),
  category: z.string().min(1, "Category is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  bank: z.string().optional(),
  amount: z.number().positive("Amount must be greater than zero"),
  remarks: z.string().optional(),
  sourceVoucher: z.string().optional(),
  isFixedAsset: z.boolean().optional(),
});

export const updateExpenseSchema = z.object({
  date: optionalDate(),
  particulars: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  remarks: z.string().optional(),
  isFixedAsset: z.boolean().optional(),
});

export async function listExpenses(req, res, next) {
  try {
    const { category, paymentMethod, startDate, endDate, search } = req.query;
    const { limit, skip, page } = parsePagination(req.query);

    const filter = {};
    if (category) filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      const { start, end } = parseDateRange(req.query);
      filter.date = { $gte: start, $lte: end };
    }
    if (search) {
      const searchFilter = buildSearchFilter(["particulars", "expenseNo", "category", "remarks"], search);
      Object.assign(filter, searchFilter);
    }

    const [items, total] = await Promise.all([
      Expense.find(filter)
        .populate("bank", "name")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getExpense(req, res, next) {
  try {
    const expense = await Expense.findById(req.params.id).populate("bank", "name");
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

export async function createExpenseHandler(req, res, next) {
  try {
    const expense = await createExpense(req.body, { postedBy: req.user.id });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

export async function updateExpenseHandler(req, res, next) {
  try {
    const expense = await updateExpense(req.params.id, req.body, { updatedBy: req.user.id });
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

export async function deleteExpenseHandler(req, res, next) {
  try {
    const result = await deleteExpense(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** Returns all distinct category values in the Expense collection — used to populate the
 *  category dropdown on the client without hardcoding values, matching VBA's dynamic columns. */
export async function listExpenseCategories(req, res, next) {
  try {
    const categories = await Expense.distinct("category");
    res.json(categories.sort());
  } catch (err) {
    next(err);
  }
}
