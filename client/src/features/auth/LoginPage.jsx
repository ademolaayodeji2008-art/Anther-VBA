import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../../components/Logo";

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  if (status === "authenticated") return <Navigate to="/dashboard" replace />;

  const onSubmit = async ({ email, password }) => {
    setServerError(null);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm"
      >
        <Logo />
        <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>

        {searchParams.get("closed") === "1" && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Signup is closed — ask your administrator for an invite.
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-sm text-slate-500">
          New here?{" "}
          <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700">
            Get started
          </Link>
        </p>
      </form>
    </div>
  );
}
