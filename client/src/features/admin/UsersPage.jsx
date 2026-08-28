import { useState } from "react";
import { useForm } from "react-hook-form";
import { useList, useCreate, useUpdate } from "../../api/useResource";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";

const RESOURCE = "users";

function UserForm({ defaultValues, roles, onSubmit, submitting, isEdit }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      ...defaultValues,
      roles: defaultValues?.roles?.map((r) => r._id ?? r) ?? [],
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("name", { required: true })} />
      </div>
      {!isEdit && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input type="email" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("email", { required: true })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Temporary Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              {...register("password", { required: true, minLength: 8 })}
            />
            <p className="mt-1 text-xs text-slate-500">
              A verification email will be sent — the user can't sign in until they verify.
            </p>
          </div>
        </>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Roles</label>
        <div className="space-y-1 rounded border border-slate-200 p-3">
          {roles?.map((r) => (
            <label key={r._id} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" value={r._id} {...register("roles")} />
              {r.name}
            </label>
          ))}
        </div>
      </div>
      {isEdit && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register("active")} />
          Active
        </label>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function UsersPage() {
  const [modal, setModal] = useState(null);
  const { data, isLoading } = useList(RESOURCE);
  const { data: rolesData } = useList("roles");
  const createMutation = useCreate(RESOURCE);
  const updateMutation = useUpdate(RESOURCE);

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "roles", header: "Roles", render: (row) => row.roles?.map((r) => r.name).join(", ") },
    { key: "emailVerified", header: "Verified", render: (row) => (row.emailVerified ? "Yes" : "No") },
    { key: "active", header: "Status", render: (row) => (row.active ? "Active" : "Inactive") },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <button className="text-blue-600 hover:underline" onClick={() => setModal(row)}>
          Edit
        </button>
      ),
    },
  ];

  const handleSubmit = async (values) => {
    if (modal && modal !== "create") {
      await updateMutation.mutateAsync({ id: modal._id, name: values.name, roles: values.roles, active: values.active });
    } else {
      await createMutation.mutateAsync(values);
    }
    setModal(null);
  };

  return (
    <div>
      <PageHeader title="Users" action={<Button onClick={() => setModal("create")}>Add User</Button>} />
      <DataTable columns={columns} rows={data} loading={isLoading} emptyMessage="No users yet." />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Add User" : "Edit User"}>
        <UserForm
          defaultValues={modal && modal !== "create" ? modal : {}}
          roles={rolesData}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending || updateMutation.isPending}
          isEdit={modal && modal !== "create"}
        />
      </Modal>
    </div>
  );
}
