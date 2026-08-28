import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { Logo } from "../../components/Logo";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const email = searchParams.get("email");
    const token = searchParams.get("token");
    if (!email || !token) {
      setStatus("error");
      setMessage("This verification link is missing required information.");
      return;
    }

    api
      .post("/auth/verify-email", { email, token })
      .then(({ data }) => {
        setStatus("success");
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message ?? "Verification failed.");
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 text-center shadow-sm">
        <Logo />
        <h1 className="text-lg font-semibold text-slate-900">Email verification</h1>
        {status === "verifying" && <p className="text-slate-500">Verifying your email…</p>}
        {status === "success" && <p className="text-green-700">{message}</p>}
        {status === "error" && <p className="text-red-600">{message}</p>}
        {status !== "verifying" && (
          <Link to="/login" className="inline-block text-sm text-slate-700 underline">
            Go to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
