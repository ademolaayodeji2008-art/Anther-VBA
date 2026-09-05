import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { StatCard } from "../../components/StatCard";
import { Modal } from "../../components/Modal";
import { Building2, Users, TrendingUp, ShieldCheck } from "lucide-react";
import { formatDate } from "../../utils/format";

function useAdminQuery(key, url) {
  return useQuery({ queryKey: ["platform-admin", key], queryFn: async () => (await api.get(url)).data });
}

function StatsBar() {
  const { data } = useAdminQuery("stats", "/platform-admin/stats");
  if (!data) return null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="Total Organizations" value={data.totalOrgs} icon={Building2} />
      <StatCard label="Active Orgs" value={data.activeOrgs} tone="success" icon={ShieldCheck} />
      <StatCard label="Total Users" value={data.totalUsers} icon={Users} />
      <StatCard label="New This Month" value={data.newOrgsThisMonth} tone="warning" icon={TrendingUp} />
    </div>
  );
}

function OrgActions({ org, onClose }) {
  const qc = useQueryClient();
  const suspend = useMutation({
    mutationFn: (reason) => api.patch(`/platform-admin/orgs/${org._id}/suspend`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform-admin"] }); onClose(); },
  });
  const activate = useMutation({
    mutationFn: () => api.patch(`/platform-admin/orgs/${org._id}/activate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform-admin"] }); onClose(); },
  });
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <p><span className="text-slate-500">Org:</span> <strong>{org.name}</strong> ({org.slug})</p>
        <p><span className="text-slate-500">Status:</span> <strong className={org.active ? "text-green-600" : "text-red-600"}>{org.active ? "Active" : "Suspended"}</strong></p>
        <p><span className="text-slate-500">Users:</span> {org.userCount}</p>
        <p><span className="text-slate-500">Created:</span> {formatDate(org.createdAt)}</p>
        {org.suspensionReason && <p><span className="text-slate-500">Suspension reason:</span> {org.suspensionReason}</p>}
      </div>

      {org.active ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Suspension reason</label>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for suspension…"
          />
          <button
            onClick={() => suspend.mutate(reason || "Suspended by platform admin")}
            disabled={suspend.isPending}
            className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {suspend.isPending ? "Suspending…" : "Suspend Organization"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => activate.mutate()}
          disabled={activate.isPending}
          className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {activate.isPending ? "Activating…" : "Activate Organization"}
        </button>
      )}
    </div>
  );
}

function OrgsTab() {
  const { data, isLoading } = useAdminQuery("orgs", "/platform-admin/orgs");
  const [selected, setSelected] = useState(null);

  const columns = [
    { key: "name", header: "Organization" },
    { key: "slug", header: "Slug" },
    { key: "active", header: "Status", render: (r) => <Badge status={r.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "userCount", header: "Users" },
    { key: "createdAt", header: "Created", render: (r) => formatDate(r.createdAt) },
    { key: "actions", header: "", render: (r) => (
      <button className="text-sm text-blue-600 hover:underline" onClick={() => setSelected(r)}>Manage</button>
    )},
  ];

  return (
    <>
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No organizations yet." />
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Manage — ${selected?.name ?? ""}`}>
        {selected && <OrgActions org={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </>
  );
}

function UsersTab() {
  const { data, isLoading } = useAdminQuery("users", "/platform-admin/users");

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "emailVerified", header: "Verified", render: (r) => <Badge status={r.emailVerified ? "ACTIVE" : "INACTIVE"} /> },
    { key: "orgs", header: "Organizations", render: (r) => r.memberships?.map((m) => m.orgName).filter(Boolean).join(", ") || "—" },
    { key: "createdAt", header: "Joined", render: (r) => formatDate(r.createdAt) },
  ];

  return <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No users yet." />;
}

export function PlatformAdminPage() {
  const [tab, setTab] = useState("orgs");

  return (
    <div>
      <PageHeader title="Platform Administration" />

      <StatsBar />

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {["orgs", "users"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "orgs" ? "Organizations" : "Users"}
          </button>
        ))}
      </div>

      {tab === "orgs" && <OrgsTab />}
      {tab === "users" && <UsersTab />}
    </div>
  );
}
