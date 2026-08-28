import { useState } from "react";
import { useForm } from "react-hook-form";
import { useList, useCreate, useUpdate } from "../../api/useResource";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { PERMISSIONS_LIST } from "./permissionsList";

const RESOURCE = "roles";

function RoleForm({ defaultValues, onSubmit, submitting }) {
  const { register, handleSubmit } = useForm({
    defaultValues: { ...defaultValues, permissions: defaultValues?.permissions ?? [] },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Role Name</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("name", { required: true })} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("description")} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Permissions</label>
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded border border-slate-200 p-3">
          {PERMISSIONS_LIST.map((p) => (
            <label key={p.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" value={p.value} {...register("permissions")} />
              {p.label}
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function RolesPage() {
  const [modal, setModal] = useState(null);
  const { data, isLoading } = useList(RESOURCE);
  const createMutation = useCreate(RESOURCE);
  const updateMutation = useUpdate(RESOURCE);

  const columns = [
    { key: "name", header: "Role" },
    { key: "description", header: "Description" },
    { key: "permissions", header: "Permissions", render: (row) => row.permissions.length },
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
      await updateMutation.mutateAsync({ id: modal._id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setModal(null);
  };

  return (
    <div>
      <PageHeader title="Roles" action={<Button onClick={() => setModal("create")}>Add Role</Button>} />
      <DataTable columns={columns} rows={data} loading={isLoading} emptyMessage="No roles yet." />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Add Role" : "Edit Role"} wide>
        <RoleForm
          defaultValues={modal && modal !== "create" ? modal : {}}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
}
