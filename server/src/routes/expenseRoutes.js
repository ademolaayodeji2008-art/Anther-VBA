import { Router } from "express";
import {
  listExpenses,
  getExpense,
  createExpenseHandler,
  updateExpenseHandler,
  deleteExpenseHandler,
  listExpenseCategories,
  createExpenseSchema,
  updateExpenseSchema,
} from "../controllers/expenseController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);

router.get("/", listExpenses);
router.get("/categories", listExpenseCategories);
router.get("/:id", getExpense);
router.post(
  "/",
  requirePermission("expenses:post"),
  validate(createExpenseSchema),
  createExpenseHandler
);
router.patch(
  "/:id",
  requirePermission("expenses:post"),
  validate(updateExpenseSchema),
  updateExpenseHandler
);
router.delete("/:id", requirePermission("expenses:post"), deleteExpenseHandler);

export default router;
