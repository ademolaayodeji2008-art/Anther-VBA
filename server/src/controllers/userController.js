import { z } from "zod";
import { getPlatformModels } from "../platform/platformDb.js";
import { hashPassword } from "../services/authService.js";
import { issueVerificationEmail } from "../services/verificationService.js";

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleName: z.string().default("Viewer"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  roleName: z.string().optional(),
  active: z.boolean().optional(),
});

/**
 * Lists all users who are members of the current org (req.user.orgSlug).
 */
export async function listUsers(req, res, next) {
  try {
    const { PlatformUser, Organization } = await getPlatformModels();
    const org = await Organization.findOne({ slug: req.user.orgSlug });
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const users = await PlatformUser.find({
      "memberships.org": org._id,
      "memberships.active": true,
    }).select("-passwordHash");

    res.json(users.map((u) => {
      const membership = u.memberships.find((m) => m.org.toString() === org._id.toString());
      return { id: u._id, name: u.name, email: u.email, emailVerified: u.emailVerified, active: u.active, roleName: membership?.roleName, joinedAt: membership?.joinedAt };
    }));
  } catch (err) { next(err); }
}

/**
 * Creates a new user and adds them to the current org.
 * Sends a verification email.
 */
export async function createUser(req, res, next) {
  try {
    const { name, email, password, roleName } = req.body;
    const { PlatformUser, Organization } = await getPlatformModels();

    const org = await Organization.findOne({ slug: req.user.orgSlug });
    if (!org) return res.status(404).json({ message: "Organization not found" });

    // Check if user already exists on the platform
    let user = await PlatformUser.findOne({ email });
    if (user) {
      // Add membership to this org if not already a member
      const alreadyMember = user.memberships.some((m) => m.org.toString() === org._id.toString());
      if (alreadyMember) return res.status(409).json({ message: "User is already a member of this organization." });
      user.memberships.push({ org: org._id, roleName: roleName ?? "Viewer", active: true });
      await user.save();
      return res.status(201).json({ id: user._id, name: user.name, email: user.email, roleName });
    }

    // Create new platform user
    user = await PlatformUser.create({
      name, email,
      passwordHash: await hashPassword(password),
      memberships: [{ org: org._id, roleName: roleName ?? "Viewer", active: true }],
      emailVerified: false,
    });

    let emailError;
    try { await issueVerificationEmail(user, PlatformUser); } catch (e) { emailError = e.message; }

    res.status(201).json({ id: user._id, name: user.name, email: user.email, roleName, ...(emailError && { emailError }) });
  } catch (err) { next(err); }
}

/**
 * Updates a user's role or active status within the current org.
 */
export async function updateUser(req, res, next) {
  try {
    const { PlatformUser, Organization } = await getPlatformModels();
    const org = await Organization.findOne({ slug: req.user.orgSlug });
    const user = await PlatformUser.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const membershipIdx = user.memberships.findIndex((m) => m.org.toString() === org._id.toString());
    if (membershipIdx === -1) return res.status(404).json({ message: "User is not a member of this org" });

    if (req.body.roleName) user.memberships[membershipIdx].roleName = req.body.roleName;
    if (req.body.active !== undefined) user.memberships[membershipIdx].active = req.body.active;
    if (req.body.name) user.name = req.body.name;

    user.markModified("memberships");
    await user.save();
    res.json({ id: user._id, name: user.name, email: user.email, roleName: user.memberships[membershipIdx].roleName });
  } catch (err) { next(err); }
}
