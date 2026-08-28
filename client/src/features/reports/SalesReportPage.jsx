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
  { value: "item", label: "By Product" },
  { value: "customer", label: "By Customer" },
  { value: "colour", label: "By Colour" },
  { value: "pattern", label: "By Pattern" },
  { value: "nature", label: "By Nature" },
  { value: "none", label: "Detailed" },
];

const GROUPED_COLUMNS = [
  { key: "name", header: "Name" },
  { key: "qty", header: "Qty" },
  { key: "subtotal", header: "Subtotal", render: (r) => formatCurrency(r.subtotal) },
  { key: "vatTotal", header: "VAT", render: (r) => formatCurrency(r.vatTotal) },
];

const DETAIL_COLUMNS = [
  { key: "receiptNo", header: "Receipt No" },
  { key: "date", header: "Date", render: (r) => formatDate(r.date) },
  { key: "customer", header: "Customer", render: (r) => r.customer?.name, csvValue: (r) => r.customer?.name },
  { key: "paymentType", header: "Payment Type" },
  { key: "status", header: "Status", render: (r) => <Badge status={r.status} /> },
  { key: "grandTotal", header: "Grand Total", render: (r) => formatCurrency(r.grandTotal) },
];

export function SalesReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("item");

  const { data, isLoading } = useReport("sales", { startDate, endDate, groupBy });
  const columns = groupBy === "none" ? DETAIL_COLUMNS : GROUPED_COLUMNS;

  return (
    <div>
      <PageHeader
        title="Sales Report"
        action={
          <Button variant="secondary" onClick={() => downloadCsv("sales-report.csv", columns, data?.data)}>
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
      <DataTable columns={columns} rows={data?.data} loading={isLoading} emptyMessage="No sales in this range." />
    </div>
  );
}
