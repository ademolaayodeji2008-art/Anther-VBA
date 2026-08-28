import { Router } from "express";
import { z } from "zod";
import Vendor from "../models/Vendor.js";
import { createCrudController } from "../utils/crudController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const addressSchema = z
  .object({
    state: z.string().optional(),
    lga: z.string().optional(),
    city: z.string().optional(),
    street: z.string().optional(),
    houseNo: z.string().optional(),
  })
  .optional();

const createSchema = z.object({
  name: z.string().min(1),
  tin: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  address: addressSchema,
});
const updateSchema = createSchema.partial().extend({ active: z.boolean().optional() });

const ctrl = createCrudController(Vendor, {
  searchFields: ["name", "tin", "phone", "email"],
  extraFilter: (query) => (query.active !== undefined ? { active: query.active === "true" } : {}),
});

const router = Router();
router.use(authenticate);
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.post("/", requirePermission("vendors:manage"), validate(createSchema), ctrl.create);
router.patch("/:id", requirePermission("vendors:manage"), validate(updateSchema), ctrl.update);
router.delete("/:id", requirePermission("vendors:manage"), ctrl.remove);

export default router;
