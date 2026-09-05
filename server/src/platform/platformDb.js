import mongoose from "mongoose";
import { organizationSchema } from "./schemas/organizationSchema.js";
import { platformUserSchema } from "./schemas/platformUserSchema.js";
import { inviteSchema } from "./schemas/inviteSchema.js";

let _conn = null;

/**
 * Returns the cached platform DB connection.
 * The platform DB (anther_platform) stores only:
 *   Organizations, PlatformUsers, Invites
 * No business data ever lives here.
 *
 * The MONGO_URI may include a database name — we strip it and append
 * "anther_platform" so that: mongodb+srv://...@cluster0.xyz.net/anything?...
 * becomes:                    mongodb+srv://...@cluster0.xyz.net/anther_platform?...
 */
export async function getPlatformDb() {
  if (_conn && _conn.readyState === 1) return _conn;

  const uri = buildDbUri("anther_platform");
  _conn = mongoose.createConnection(uri);
  await _conn.asPromise();
  return _conn;
}

/**
 * Returns model constructors bound to the platform connection.
 * Always use this instead of importing models directly.
 */
export async function getPlatformModels() {
  const conn = await getPlatformDb();

  const Organization =
    conn.models["Organization"] ?? conn.model("Organization", organizationSchema);
  const PlatformUser =
    conn.models["PlatformUser"] ?? conn.model("PlatformUser", platformUserSchema);
  const Invite =
    conn.models["Invite"] ?? conn.model("Invite", inviteSchema);

  return { Organization, PlatformUser, Invite, conn };
}

/**
 * Strips any existing DB name from MONGO_URI and appends the given DB name.
 * Works with both Atlas SRV URIs and plain connection strings.
 *
 * mongodb+srv://user:pass@cluster0.abc.net/?retryWrites=true
 *   → mongodb+srv://user:pass@cluster0.abc.net/anther_platform?retryWrites=true
 *
 * mongodb+srv://user:pass@cluster0.abc.net/my_old_db?retryWrites=true
 *   → mongodb+srv://user:pass@cluster0.abc.net/anther_platform?retryWrites=true
 */
export function buildDbUri(dbName) {
  const base = process.env.MONGO_URI ?? "";
  // Replace /dbname? or /? or trailing / with /newDbName
  return base.replace(/(\/)[^/?]*([\?#]|$)/, `$1${dbName}$2`);
}
