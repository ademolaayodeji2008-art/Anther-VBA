import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [status, setStatus] = useState("loading");
  // When login returns multiple orgs the user must pick one.
  // orgChoice holds { userId, orgs[] } while we wait for selection.
  const [orgChoice, setOrgChoice] = useState(null);

  const loadMe = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  }, []);

  useEffect(() => {
    api.post("/auth/refresh")
      .then(({ data }) => { setAccessToken(data.accessToken); return loadMe(); })
      .then(() => setStatus("authenticated"))
      .catch(() => setStatus("anonymous"));
  }, [loadMe]);

  /**
   * Step 1 — submit credentials.
   * If the server auto-selected an org (single-org user) it returns an accessToken directly.
   * If the user belongs to multiple orgs it returns { requiresOrgSelection, userId, orgs }.
   */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });

    if (data.requiresOrgSelection) {
      // Don't authenticate yet — surface the org picker
      setOrgChoice({ userId: data.userId, orgs: data.orgs });
      return { requiresOrgSelection: true, orgs: data.orgs };
    }

    setAccessToken(data.accessToken);
    await loadMe();
    setStatus("authenticated");
    return { requiresOrgSelection: false };
  }, [loadMe]);

  /**
   * Step 2 (only for multi-org users) — select which org to log into.
   */
  const selectOrg = useCallback(async (orgId) => {
    if (!orgChoice) throw new Error("No pending org selection");
    const { data } = await api.post("/auth/select-org", { userId: orgChoice.userId, orgId });
    setAccessToken(data.accessToken);
    setOrgChoice(null);
    await loadMe();
    setStatus("authenticated");
  }, [orgChoice, loadMe]);

  /**
   * Switch to a different org without re-entering credentials.
   * Calls /auth/select-org with the new orgId.
   */
  const switchOrg = useCallback(async (orgId) => {
    const { data } = await api.post("/auth/select-org", { userId: user?.id, orgId });
    setAccessToken(data.accessToken);
    await loadMe();
    // Force full page reload so all react-query caches are cleared — otherwise data from the
    // previous org leaks into the new org's views until each query re-fetches.
    window.location.href = "/dashboard";
  }, [user, loadMe]);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setAccessToken(null);
    setUser(null);
    setOrgChoice(null);
    setStatus("anonymous");
  }, []);

  const hasPermission = useCallback(
    (permission) => user?.permissions?.includes(permission) ?? false,
    [user]
  );

  const hasAnyPermission = useCallback(
    (...permissions) => permissions.some((p) => user?.permissions?.includes(p)),
    [user]
  );

  const value = useMemo(
    () => ({ user, status, orgChoice, login, selectOrg, switchOrg, logout, hasPermission, hasAnyPermission }),
    [user, status, orgChoice, login, selectOrg, switchOrg, logout, hasPermission, hasAnyPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
