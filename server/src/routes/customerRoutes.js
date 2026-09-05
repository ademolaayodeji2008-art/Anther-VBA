import { Router } from "express";
import { z } from "zod";
import { createCrudController } from "../utils/crudController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const addressSchema = z.object({ state: z.string().optional(), lga: z.string().optional(), city: z.string().optional(), street: z.string().optional(), houseNo: z.string().optional() }).optional();

const createSchema = z.object({
  name: z.string().min(1), tin: z.string().optional(), phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(), address: addressSchema,
  openingBalance: z.coerce.number().min(0).optional(), openingBalanceDate: z.coerce.date().optional(),
});
const updateSchema = createSchema.partial().extend({ active: z.boolean().optional() });

const ctrl = createCrudController("Customer", {
  searchFields: ["name","tin","phone","email"],
  extraFilter: (query) => (query.active !== undefined ? { active: query.active === "true" } : {}),
});

const router = Router();
router.use(authenticate);
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.post("/", requirePermission("customers:manage"), validate(createSchema), ctrl.create);
router.patch("/:id", requirePermission("customers:manage"), validate(updateSchema), ctrl.update);
router.delete("/:id", requirePermission("customers:manage"), ctrl.remove);

export default router;
