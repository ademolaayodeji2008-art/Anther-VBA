import { useList } from "../../api/useResource";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { formatCurrency, formatDate } from "../../utils/format";

const RESOURCE = "invoice-payments";

export function InvoicePaymentsPage() {
  const { data, isLoading } = useList(RESOURCE);

  const columns = [
    { key: "paymentNo", header: "Payment No" },
    {
      key: "invoice",
      header: "Invoice No",
      render: (row) => row.invoice?.invoiceNo ?? "—",
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => row.invoice?.customer?.name ?? "—",
    },
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "amount", header: "Amount", render: (row) => formatCurrency(row.amount) },
    { key: "method", header: "Method" },
    { key: "bank", header: "Bank", render: (row) => row.bank?.name ?? "—" },
    { key: "reference", header: "Reference" },
    { key: "receivedBy", header: "Received By" },
  ];

  return (
    <div>
      <PageHeader title="Invoice Payments" />
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No payments recorded yet." />
    </div>
  );
}
