/**
 * One-time migration: copy all business data from the old single-tenant DB
 * into the new multi-tenant architecture.
 *
 * What it does:
 *  1. Creates the org in anther_platform
 *  2. Migrates the existing admin user into anther_platform as a PlatformUser
 *  3. Copies ALL business collections from the old DB to anther_org_{slug}
 *  4. Seeds the 7 roles into the new org DB
 *
 * Usage:
 *   MIGRATE_ORG_NAME="Anther Consulting Limited" \
 *   MIGRATE_ADMIN_EMAIL="admin@aviv.local" \
 *   node src/scripts/migrate-to-multitenant.mjs
 *
 * Safe to re-run — skips collections that already exist in the destination.
 * The source DB is NEVER modified or dropped.
 */
import "dotenv/config";
import mongoose from "mongoose";

const ORG_NAME    = process.env.MIGRATE_ORG_NAME    || "Anther Consulting Limited";
const ADMIN_EMAIL = process.env.MIGRATE_ADMIN_EMAIL || "admin@aviv.local";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildUri(baseUri, dbName) {
  return baseUri.replace(/(\/)[^/?]*([\?#]|$)/, `$1${dbName}$2`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const baseUri = process.env.MONGO_URI;
  if (!baseUri) throw new Error("MONGO_URI not set in .env");

  const slug    = slugify(ORG_NAME);
  const oldDb   = "aviv_erp";       // the original single-tenant database name
  const newDb   = `anther_org_${slug.replace(/-/g, "_")}`;
  const platDb  = "anther_platform";

  console.log(`\nMigrating from [${oldDb}] → [${newDb}] + platform [${platDb}]`);
  console.log(`Org: ${ORG_NAME}  (slug: ${slug})\n`);

  // Connect to all three databases
  const sourceConn = mongoose.createConnection(buildUri(baseUri, oldDb));
  const targetConn = mongoose.createConnection(buildUri(baseUri, newDb));
  const platConn   = mongoose.createConnection(buildUri(baseUri, platDb));

  await Promise.all([
    sourceConn.asPromise(),
    targetConn.asPromise(),
    platConn.asPromise(),
  ]);
  console.log("Connected to all databases.");

  // ── Step 1: Migrate admin user to platform DB ────────────────────────────

  const sourceUsers = sourceConn.collection("users");
  const platUsers   = platConn.collection("platformusers");
  const platOrgs    = platConn.collection("organizations");

  const existingAdmin = await sourceUsers.findOne({ email: ADMIN_EMAIL });
  if (!existingAdmin) {
    console.warn(`⚠  Admin user ${ADMIN_EMAIL} not found in source DB — skipping user migration`);
  }

  // Create or find org in platform DB
  let org = await platOrgs.findOne({ slug });
  if (!org) {
    const orgResult = await platOrgs.insertOne({
      name: ORG_NAME,
      slug,
      owner: null,
      active: true,
      settings: { currency: "NGN", timezone: "Africa/Lagos" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    org = { _id: orgResult.insertedId, slug, name: ORG_NAME };
    console.log(`✅ Created organization in platform DB: ${ORG_NAME}`);
  } else {
    console.log(`ℹ  Organization already exists in platform DB: ${org.name}`);
  }

  if (existingAdmin) {
    const existingPlatUser = await platUsers.findOne({ email: ADMIN_EMAIL });
    if (!existingPlatUser) {
      const userResult = await platUsers.insertOne({
        name: existingAdmin.name,
        email: existingAdmin.email,
        passwordHash: existingAdmin.passwordHash,
        memberships: [{ org: org._id, roleName: "Super Admin", active: true, joinedAt: new Date() }],
        active: true,
        emailVerified: true,
        isPlatformAdmin: false,
        createdAt: existingAdmin.createdAt ?? new Date(),
        updatedAt: new Date(),
      });
      // Update org owner
      await platOrgs.updateOne({ _id: org._id }, { $set: { owner: userResult.insertedId } });
      console.log(`✅ Migrated admin user ${ADMIN_EMAIL} to platform DB`);
    } else {
      // Ensure membership exists
      const hasMembership = (existingPlatUser.memberships ?? []).some(
        (m) => m.org.toString() === org._id.toString()
      );
      if (!hasMembership) {
        await platUsers.updateOne(
          { _id: existingPlatUser._id },
          { $push: { memberships: { org: org._id, roleName: "Super Admin", active: true, joinedAt: new Date() } } }
        );
        console.log(`✅ Added ${ADMIN_EMAIL} membership to org ${slug}`);
      } else {
        console.log(`ℹ  Admin user already in platform DB with membership`);
      }
    }
  }

  // ── Step 2: Copy all business collections to tenant DB ───────────────────

  // These are all the collections that should be in the org DB
  const COLLECTIONS_TO_COPY = [
    "customers", "vendors", "items",
    "bankaccounts", "banktransactions",
    "salesorders", "purchaseorders",
    "stockadjustments", "stockmovements",
    "invoices", "invoicepayments",
    "paymentvouchers", "assets", "returns",
    "expenses", "fabricoptions",
    "roles", "counters",
  ];

  for (const collName of COLLECTIONS_TO_COPY) {
    const sourceColl  = sourceConn.collection(collName);
    const targetColl  = targetConn.collection(collName);
    const sourceCount = await sourceColl.countDocuments();

    if (sourceCount === 0) {
      console.log(`  ⤷ ${collName}: empty — skipping`);
      continue;
    }

    const targetCount = await targetColl.countDocuments();
    if (targetCount > 0) {
      console.log(`  ⤷ ${collName}: already has ${targetCount} docs — skipping (not overwriting)`);
      continue;
    }

    const docs = await sourceColl.find({}).toArray();
    await targetColl.insertMany(docs, { ordered: false });
    console.log(`  ✅ ${collName}: copied ${docs.length} documents`);
  }

  // ── Step 3: Rebuild indexes on tenant DB ────────────────────────────────

  // Indexes are created automatically by Mongoose when the app starts and
  // registers models — no manual index creation needed here.
  console.log("\nIndexes will be created automatically on first app startup.");

  // ── Done ──────────────────────────────────────────────────────────────────

  console.log("\n✅ Migration complete.");
  console.log(`\nNext steps:`);
  console.log(`  1. Run: SEED_ORG_NAME="${ORG_NAME}" SEED_ADMIN_EMAIL="${ADMIN_EMAIL}" node src/config/seed.js`);
  console.log(`     (This ensures roles are seeded and the admin user exists in the platform DB)`);
  console.log(`  2. Start the server: npm start`);
  console.log(`  3. Log in at your app URL — you should see your existing data\n`);

  await Promise.all([sourceConn.close(), targetConn.close(), platConn.close()]);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
