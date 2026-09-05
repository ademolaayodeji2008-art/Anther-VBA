import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../../components/Logo";
import { Building2 } from "lucide-react";

export function SelectOrgPage() {
  const { orgChoice, selectOrg } = useAuth();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(null);
  const [error, setError] = useState(null);

  // If they landed here without going through login, send them back
  if (!orgChoice) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleSelect = async (orgId) => {
    setError(null);
    setSelecting(orgId);
    try {
      await selectOrg(orgId);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? "Could not select organization");
      setSelecting(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-sm">
        <Logo />
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Choose an organization</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your account belongs to multiple organizations. Which one do you want to open?
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          {orgChoice.orgs.map((org) => (
            <button
              key={org._id}
              onClick={() => handleSelect(org._id)}
              disabled={!!selecting}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <Building2 size={18} />
              </div>
              <div>
                <p className="font-medium text-slate-900">{org.businessName || org.name}</p>
                {org.businessName && org.businessName !== org.name && (
                  <p className="text-xs text-slate-400">{org.name}</p>
                )}
              </div>
              {selecting === org._id && (
                <span className="ml-auto text-sm text-brand-600">Opening…</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
