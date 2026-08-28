import "dotenv/config";
import { connectDB } from "./db.js";
import User from "../models/User.js";
import { hashPassword } from "../services/authService.js";
import { ensureDefaultRoles, ROLE_DEFINITIONS } from "../services/roleSeedService.js";

async function seed() {
  await connectDB(process.env.MONGO_URI);

  const rolesByName = await ensureDefaultRoles();
  console.log(`Seeded ${ROLE_DEFINITIONS.length} roles.`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@aviv.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: "Super Admin",
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      roles: [rolesByName["Super Admin"]._id],
      emailVerified: true,
    });
    console.log(`Created super admin user: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`Super admin user already exists: ${adminEmail}`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
