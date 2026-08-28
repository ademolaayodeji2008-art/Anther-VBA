import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authenticated | anonymous

  const loadMe = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  }, []);

  useEffect(() => {
    // On first load there's no in-memory access token yet; try a refresh
    // using the httpOnly cookie, then fetch the profile if that succeeds.
    api
      .post("/auth/refresh")
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return loadMe();
      })
      .then(() => setStatus("authenticated"))
      .catch(() => setStatus("anonymous"));
  }, [loadMe]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post("/auth/login", { email, password });
      setAccessToken(data.accessToken);
      // /auth/login's response omits role names (only /auth/me populates them), so reload the
      // full profile rather than settling for the partial user object.
      const fullUser = await loadMe();
      setStatus("authenticated");
      return fullUser;
    },
    [loadMe]
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setAccessToken(null);
    setUser(null);
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
    () => ({ user, status, login, logout, hasPermission, hasAnyPermission }),
    [user, status, login, logout, hasPermission, hasAnyPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
