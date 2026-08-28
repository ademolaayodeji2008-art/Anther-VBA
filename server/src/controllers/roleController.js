import { z } from "zod";
import Role from "../models/Role.js";

export const roleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string().min(1)).default([]),
});

export async function listRoles(req, res, next) {
  try {
    res.json(await Role.find().sort({ name: 1 }));
  } catch (err) {
    next(err);
  }
}

export async function createRole(req, res, next) {
  try {
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (err) {
    next(err);
  }
}

export async function updateRole(req, res, next) {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(role);
  } catch (err) {
    next(err);
  }
}
