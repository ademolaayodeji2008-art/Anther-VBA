import User from "../models/User.js";

/** Loads a user with roles populated and returns it alongside a flattened, deduped permission list. */
export async function loadUserWithPermissions(userId) {
  const user = await User.findById(userId).populate("roles");
  if (!user) return null;
  const permissions = [...new Set(user.roles.flatMap((role) => role.permissions))];
  return { user, permissions };
}
