import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ permission, anyOf }) {
  const { status, hasPermission, hasAnyPermission } = useAuth();

  if (status === "loading") return <div className="p-6 text-slate-500">Loading…</div>;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) {
    return <div className="p-6 text-red-600">You don't have permission to view this page.</div>;
  }
  if (anyOf && !hasAnyPermission(...anyOf)) {
    return <div className="p-6 text-red-600">You don't have permission to view this page.</div>;
  }
  return <Outlet />;
}
