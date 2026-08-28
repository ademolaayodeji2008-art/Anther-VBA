import { z } from "zod";
import User from "../models/User.js";
import { hashPassword } from "../services/authService.js";
import { issueVerificationEmail } from "../services/verificationService.js";

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roles: z.array(z.string()).default([]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  roles: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    active: user.active,
    emailVerified: user.emailVerified,
  };
}

export async function listUsers(req, res, next) {
  try {
    const users = await User.find().populate("roles", "name").sort({ name: 1 });
    res.json(users.map(toPublicUser));
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, roles } = req.body;
    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash, roles });
    await user.populate("roles", "name");

    let emailSendError;
    try {
      await issueVerificationEmail(user);
    } catch (mailErr) {
      emailSendError = mailErr.message;
    }

    res.status(201).json({ ...toPublicUser(user), ...(emailSendError && { emailSendError }) });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("roles", "name");
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
}
