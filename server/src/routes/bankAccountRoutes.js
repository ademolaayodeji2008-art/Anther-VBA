import { Router } from "express";
import { z } from "zod";
import BankAccount from "../models/BankAccount.js";
import { createCrudController } from "../utils/crudController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { optionalDate, optionalNumber } from "../utils/zodHelpers.js";

const createSchema = z.object({
  name: z.string().min(1),
  accountNo: z.string().min(1),
  accountName: z.string().optional(),
  openingBalance: optionalNumber(z.coerce.number().min(0)),
  openingBalanceDate: optionalDate(),
});
const updateSchema = createSchema
  .partial()
  .extend({ status: z.enum(["ACTIVE", "INACTIVE"]).optional() });

const ctrl = createCrudController(BankAccount, {
  searchFields: ["name", "accountNo", "accountName"],
  softDelete: { field: "status", value: "INACTIVE" },
  extraFilter: (query) => (query.status ? { status: query.status } : {}),
});

const router = Router();
router.use(authenticate, requirePermission("bank:view"));
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.post("/", requirePermission("bank:manage"), validate(createSchema), ctrl.create);
router.patch("/:id", requirePermission("bank:manage"), validate(updateSchema), ctrl.update);
router.delete("/:id", requirePermission("bank:manage"), ctrl.remove);

export default router;
