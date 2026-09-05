import { Router } from "express";
import { z } from "zod";
import { getModels } from "../tenant/tenantDb.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { buildSearchFilter, parsePagination } from "../utils/queryHelpers.js";
import { optionalDate, optionalNumber } from "../utils/zodHelpers.js";

const createSchema = z.object({
  name: z.string().min(1),
  accountNo: z.string().min(1),
  accountName: z.string().optional(),
  openingBalance: optionalNumber(z.coerce.number().min(0)),
  openingBalanceDate: optionalDate(),
});
const updateSchema = createSchema.partial().extend({ status: z.enum(["ACTIVE","INACTIVE"]).optional() });

const router = Router();
router.use(authenticate, requirePermission("bank:view"));

router.get("/", async (req, res, next) => {
  try {
    const { BankAccount } = getModels(req.tenantDb);
    const { search, status } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = { ...buildSearchFilter(["name","accountNo","accountName"], search) };
    if (status) filter.status = status;
    const [items, total] = await Promise.all([BankAccount.find(filter).sort({ name: 1 }).skip(skip).limit(limit), BankAccount.countDocuments(filter)]);
    res.json({ items, total, page, limit });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { BankAccount } = getModels(req.tenantDb);
    const doc = await BankAccount.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Bank account not found" });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post("/", requirePermission("bank:manage"), validate(createSchema), async (req, res, next) => {
  try {
    const { BankAccount } = getModels(req.tenantDb);
    const doc = await BankAccount.create(req.body);
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.patch("/:id", requirePermission("bank:manage"), validate(updateSchema), async (req, res, next) => {
  try {
    const { BankAccount } = getModels(req.tenantDb);
    const doc = await BankAccount.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Bank account not found" });
    res.json(doc);
  } catch (err) { next(err); }
});

router.delete("/:id", requirePermission("bank:manage"), async (req, res, next) => {
  try {
    const { BankAccount } = getModels(req.tenantDb);
    const doc = await BankAccount.findByIdAndUpdate(req.params.id, { status: "INACTIVE" }, { new: true });
    if (!doc) return res.status(404).json({ message: "Bank account not found" });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
