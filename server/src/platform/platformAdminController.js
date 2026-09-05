import { getPlatformModels } from "./platformDb.js";
import { parsePagination } from "../utils/queryHelpers.js";

/** GET /api/platform-admin/orgs — list all organizations */
export async function listOrgs(req, res, next) {
  try {
    const { Organization, PlatformUser } = await getPlatformModels();
    const { limit, skip, page } = parsePagination(req.query);

    const [orgs, total] = await Promise.all([
      Organization.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Organization.countDocuments(),
    ]);

    // Enrich with user count per org
    const enriched = await Promise.all(
      orgs.map(async (org) => {
        const userCount = await PlatformUser.countDocuments({
          "memberships.org": org._id,
          "memberships.active": true,
        });
        return { ...org.toObject(), userCount };
      })
    );

    res.json({ items: enriched, total, page, limit });
  } catch (err) {
    next(err);
  }
}

/** GET /api/platform-admin/orgs/:id — single org detail */
export async function getOrg(req, res, next) {
  try {
    const { Organization, PlatformUser } = await getPlatformModels();
    const org = await Organization.findById(req.params.id).populate("owner", "name email");
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const users = await PlatformUser.find({
      "memberships.org": org._id,
      "memberships.active": true,
    }).select("name email emailVerified active memberships createdAt");

    res.json({ org, users });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/platform-admin/orgs/:id/suspend */
export async function suspendOrg(req, res, next) {
  try {
    const { Organization } = await getPlatformModels();
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      {
        active: false,
        suspensionReason: req.body.reason ?? "Suspended by platform admin",
        suspendedAt: new Date(),
        suspendedBy: req.platformUser._id,
      },
      { new: true }
    );
    if (!org) return res.status(404).json({ message: "Organization not found" });
    res.json(org);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/platform-admin/orgs/:id/activate */
export async function activateOrg(req, res, next) {
  try {
    const { Organization } = await getPlatformModels();
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { active: true, $unset: { suspensionReason: 1, suspendedAt: 1, suspendedBy: 1 } },
      { new: true }
    );
    if (!org) return res.status(404).json({ message: "Organization not found" });
    res.json(org);
  } catch (err) {
    next(err);
  }
}

/** GET /api/platform-admin/users — list all platform users */
export async function listUsers(req, res, next) {
  try {
    const { PlatformUser, Organization } = await getPlatformModels();
    const { limit, skip, page } = parsePagination(req.query);

    const [users, total] = await Promise.all([
      PlatformUser.find().select("-passwordHash").sort({ createdAt: -1 }).skip(skip).limit(limit),
      PlatformUser.countDocuments(),
    ]);

    // Populate org names
    const allOrgIds = [...new Set(users.flatMap((u) => u.memberships.map((m) => m.org.toString())))];
    const orgs = await Organization.find({ _id: { $in: allOrgIds } }).select("name slug");
    const orgMap = new Map(orgs.map((o) => [o._id.toString(), o]));

    const enriched = users.map((u) => ({
      ...u.toObject(),
      memberships: u.memberships.map((m) => ({
        ...m.toObject(),
        orgName: orgMap.get(m.org.toString())?.name,
        orgSlug: orgMap.get(m.org.toString())?.slug,
      })),
    }));

    res.json({ items: enriched, total, page, limit });
  } catch (err) {
    next(err);
  }
}

/** GET /api/platform-admin/stats — platform-level counts */
export async function platformStats(req, res, next) {
  try {
    const { Organization, PlatformUser } = await getPlatformModels();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalOrgs, activeOrgs, totalUsers, newOrgsThisMonth, newUsersThisMonth] =
      await Promise.all([
        Organization.countDocuments(),
        Organization.countDocuments({ active: true }),
        PlatformUser.countDocuments(),
        Organization.countDocuments({ createdAt: { $gte: startOfMonth } }),
        PlatformUser.countDocuments({ createdAt: { $gte: startOfMonth } }),
      ]);

    res.json({ totalOrgs, activeOrgs, totalUsers, newOrgsThisMonth, newUsersThisMonth });
  } catch (err) {
    next(err);
  }
}
