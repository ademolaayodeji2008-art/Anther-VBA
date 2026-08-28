import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Logo } from "../../components/Logo";

export function SignupPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [bootstrapState, setBootstrapState] = useState("checking"); // checking | open | closed
  const [serverError, setServerError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    api
      .get("/auth/bootstrap-status")
      .then(({ data }) => setBootstrapState(data.signupOpen ? "open" : "closed"))
      .catch(() => setBootstrapState("closed"));
  }, []);

  useEffect(() => {
    if (bootstrapState === "closed") navigate("/login?closed=1", { replace: true });
  }, [bootstrapState, navigate]);

  if (status === "authenticated") return <Navigate to="/dashboard" replace />;

  const onSubmit = async ({ name, email, password }) => {
    setServerError(null);
    try {
      await api.post("/auth/signup", { name, email, password });
      setSubmitted(true);
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Sign up failed");
    }
  };

  if (bootstrapState !== "open") {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 text-center shadow-sm">
          <Logo />
          <h1 className="text-lg font-semibold text-slate-900">Check your email</h1>
          <p className="text-sm text-slate-600">
            We've sent a verification link to your inbox. Verify your email, then sign in.
          </p>
          <Link to="/login" className="inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm"
      >
        <Logo />
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Create your admin account</h1>
          <p className="mt-1 text-sm text-slate-500">
            You're setting up AVIV ERP for the first time — this account gets full access.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Full name</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

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
            {...register("password", { required: "Password is required", minLength: { value: 8, message: "At least 8 characters" } })}
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Confirm password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (v) => v === watch("password") || "Passwords do not match",
            })}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
