/**
 * Platform seed script.
 * Usage:
 *   node src/config/seed.js
 *   SEED_ORG_NAME="Acme Ltd" SEED_ADMIN_EMAIL="admin@acme.com" node src/config/seed.js
 *
 * Creates:
 *   - One organization in anther_platform
 *   - One Super Admin user in anther_platform
 *   - All 7 roles seeded into the org's tenant DB
 */
import "dotenv/config";
import { getPlatformDb, getPlatformModels } from "../platform/platformDb.js";
import { getTenantDb } from "../tenant/tenantDb.js";
import { ensureOrgRoles } from "../services/roleSeedService.js";
import { hashPassword } from "../services/authService.js";

const ORG_NAME      = process.env.SEED_ORG_NAME      || "Default Organization";
const ADMIN_EMAIL   = process.env.SEED_ADMIN_EMAIL    || "admin@aviv.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

async function seed() {
  await getPlatformDb(); // establishes platform connection
  const { Organization, PlatformUser } = await getPlatformModels();

  // ── 1. Create or find the organization ──────────────────────────────────
  let slug = ORG_NAME.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  let org = await Organization.findOne({ slug });

  if (!org) {
    org = await Organization.create({
      name: ORG_NAME,
      slug,
      owner: null, // set after user created
      active: true,
    });
    console.log(`Created organization: ${org.name} (slug: ${org.slug})`);
  } else {
    console.log(`Using existing organization: ${org.name} (slug: ${org.slug})`);
  }

  // ── 2. Seed roles into the org's tenant DB ──────────────────────────────
  const tenantDb = await getTenantDb(org.slug);
  const rolesByName = await ensureOrgRoles(tenantDb);
  console.log(`Seeded ${Object.keys(rolesByName).length} roles into ${org.slug}`);

  // ── 3. Create or find the admin user ────────────────────────────────────
  let user = await PlatformUser.findOne({ email: ADMIN_EMAIL });

  if (!user) {
    user = await PlatformUser.create({
      name: "Super Admin",
      email: ADMIN_EMAIL,
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      memberships: [{ org: org._id, roleName: "Super Admin", active: true }],
      emailVerified: true,
      isPlatformAdmin: false,
    });
    console.log(`Created admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    // Ensure membership exists
    const hasMembership = user.memberships.some((m) => m.org.toString() === org._id.toString());
    if (!hasMembership) {
      user.memberships.push({ org: org._id, roleName: "Super Admin", active: true });
      await user.save();
      console.log(`Added ${ADMIN_EMAIL} to org ${org.slug}`);
    } else {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    }
  }

  // ── 4. Set org owner if not set ──────────────────────────────────────────
  if (!org.owner) {
    org.owner = user._id;
    await org.save();
  }

  console.log("\nSeed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
