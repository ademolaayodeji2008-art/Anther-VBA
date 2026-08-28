import { useState } from "react";
import { useForm } from "react-hook-form";
import { useList, useCreate, useUpdate, useRemove } from "../../api/useResource";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { useAuth } from "../../context/AuthContext";

const RESOURCE = "customers";

function CustomerForm({ defaultValues, onSubmit, submitting }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          {...register("name", { required: "Name is required" })}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">TIN</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("tin")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Phone</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("phone")} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          {...register("email")}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">State</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("address.state")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">LGA</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("address.lga")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">City</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("address.city")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Street</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("address.street")} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">House No</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("address.houseNo")} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function CustomersPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("customers:manage");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | "create" | customer object

  const { data, isLoading } = useList(RESOURCE, { search });
  const createMutation = useCreate(RESOURCE);
  const updateMutation = useUpdate(RESOURCE);
  const removeMutation = useRemove(RESOURCE);

  const columns = [
    { key: "name", header: "Name" },
    { key: "tin", header: "TIN" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    { key: "active", header: "Status", render: (row) => (row.active ? "Active" : "Inactive") },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            render: (row) => (
              <div className="flex gap-3">
                <button className="text-blue-600 hover:underline" onClick={() => setModal(row)}>
                  Edit
                </button>
                {row.active && (
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => removeMutation.mutate(row._id)}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
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
      <PageHeader
        title="Customers"
        action={canManage && <Button onClick={() => setModal("create")}>Add Customer</Button>}
      />
      <input
        placeholder="Search customers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No customers yet." />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Add Customer" : "Edit Customer"}
      >
        <CustomerForm
          defaultValues={modal && modal !== "create" ? modal : {}}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
}
