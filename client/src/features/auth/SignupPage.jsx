import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Logo } from "../../components/Logo";

export function SignupPage() {
  const { status } = useAuth();
  const [serverError, setServerError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  if (status === "authenticated") return <Navigate to="/dashboard" replace />;

  const onSubmit = async ({ name, email, password, orgName }) => {
    setServerError(null);
    try {
      await api.post("/auth/signup", { name, email, password, orgName });
      setSubmitted(true);
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Sign up failed");
    }
  };

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

  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm"
      >
        <Logo />
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set up your organization and get full access to the ERP.
          </p>
        </div>

        {/* Organization name — new field */}
        <div>
          <label className="block text-sm font-medium text-slate-700">Organization name</label>
          <input
            className={inputClass}
            placeholder="e.g. Acme Fabrics Ltd"
            {...register("orgName", { required: "Organization name is required", minLength: { value: 2, message: "At least 2 characters" } })}
          />
          {errors.orgName && <p className="mt-1 text-sm text-red-600">{errors.orgName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Your full name</label>
          <input
            className={inputClass}
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            className={inputClass}
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            className={inputClass}
            {...register("password", { required: "Password is required", minLength: { value: 8, message: "At least 8 characters" } })}
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Confirm password</label>
          <input
            type="password"
            className={inputClass}
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (v) => v === watch("password") || "Passwords do not match",
            })}
          />
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
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
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
