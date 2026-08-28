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
  { value: "vendor", label: "By Vendor" },
  { value: "none", label: "Detailed" },
];

const GROUPED_COLUMNS = [
  { key: "name", header: "Name" },
  { key: "qty", header: "Qty" },
  { key: "total", header: "Total", render: (r) => formatCurrency(r.total) },
];

const DETAIL_COLUMNS = [
  { key: "billNo", header: "Bill No" },
  { key: "date", header: "Date", render: (r) => formatDate(r.date) },
  { key: "vendor", header: "Vendor", render: (r) => r.vendor?.name, csvValue: (r) => r.vendor?.name },
  { key: "paymentType", header: "Payment Type" },
  { key: "status", header: "Status", render: (r) => <Badge status={r.status} /> },
  { key: "total", header: "Total", render: (r) => formatCurrency(r.total) },
];

export function PurchasesReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("item");

  const { data, isLoading } = useReport("purchases", { startDate, endDate, groupBy });
  const columns = groupBy === "none" ? DETAIL_COLUMNS : GROUPED_COLUMNS;

  return (
    <div>
      <PageHeader
        title="Purchases Report"
        action={
          <Button variant="secondary" onClick={() => downloadCsv("purchases-report.csv", columns, data?.data)}>
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
      <DataTable columns={columns} rows={data?.data} loading={isLoading} emptyMessage="No purchases in this range." />
    </div>
  );
}
