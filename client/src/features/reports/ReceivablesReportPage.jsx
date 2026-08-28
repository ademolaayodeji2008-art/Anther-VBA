import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { formatCurrency, formatDate } from "../../utils/format";
import { downloadCsv } from "../../utils/csv";
import { useReport } from "./useReport";
import { ReportFilters } from "./ReportFilters";

const GROUP_BY_OPTIONS = [
  { value: "customer", label: "By Customer" },
  { value: "none", label: "Detailed" },
];

const GROUPED_COLUMNS = [
  { key: "name", header: "Customer" },
  { key: "outstanding", header: "Outstanding", render: (r) => formatCurrency(r.outstanding) },
  { key: "invoiceCount", header: "Invoices" },
];

const DETAIL_COLUMNS = [
  { key: "invoiceNo", header: "Invoice No" },
  { key: "customer", header: "Customer", render: (r) => r.customer?.name, csvValue: (r) => r.customer?.name },
  { key: "dueDate", header: "Due Date", render: (r) => formatDate(r.dueDate) },
  { key: "outstanding", header: "Outstanding", render: (r) => formatCurrency(r.outstanding) },
  { key: "paymentStatus", header: "Payment Status", render: (r) => <Badge status={r.paymentStatus} /> },
];

export function ReceivablesReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("customer");

  const { data, isLoading } = useReport("receivables", { startDate, endDate, groupBy });
  const columns = groupBy === "none" ? DETAIL_COLUMNS : GROUPED_COLUMNS;

  return (
    <div>
      <PageHeader
        title="Receivables Report"
        action={
          <Button variant="secondary" onClick={() => downloadCsv("receivables-report.csv", columns, data?.data)}>
            Export CSV
          </Button>
        }
      />
      <ReportFilters
        startDate={startDate}
        endDate={endDate}
        onStartDate={setStartDate}
        onEndDate={setEndDate}
        groupBy={groupBy}
        onGroupBy={setGroupBy}
        groupByOptions={GROUP_BY_OPTIONS}
      />
      <DataTable
        columns={columns}
        rows={data?.data}
        loading={isLoading}
        emptyMessage="No outstanding invoices in this range."
      />
    </div>
  );
}
