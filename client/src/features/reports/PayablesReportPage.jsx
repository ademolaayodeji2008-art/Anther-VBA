import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { formatCurrency, formatDate } from "../../utils/format";
import { downloadCsv } from "../../utils/csv";
import { useReport } from "./useReport";
import { ReportFilters } from "./ReportFilters";

const GROUP_BY_OPTIONS = [
  { value: "vendor", label: "By Vendor" },
  { value: "none", label: "Detailed" },
];

const GROUPED_COLUMNS = [
  { key: "name", header: "Vendor" },
  { key: "total", header: "Total (Credit Purchases)", render: (r) => formatCurrency(r.total) },
  { key: "count", header: "Count" },
];

const DETAIL_COLUMNS = [
  { key: "billNo", header: "Bill No" },
  { key: "vendor", header: "Vendor", render: (r) => r.vendor?.name, csvValue: (r) => r.vendor?.name },
  { key: "date", header: "Date", render: (r) => formatDate(r.date) },
  { key: "total", header: "Total", render: (r) => formatCurrency(r.total) },
];

export function PayablesReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("vendor");

  const { data, isLoading } = useReport("payables", { startDate, endDate, groupBy });
  const columns = groupBy === "none" ? DETAIL_COLUMNS : GROUPED_COLUMNS;

  return (
    <div>
      <PageHeader
        title="Payables Report"
        action={
          <Button variant="secondary" onClick={() => downloadCsv("payables-report.csv", columns, data?.data)}>
            Export CSV
          </Button>
        }
      />
      <p className="mb-3 text-sm text-slate-500">
        Total of credit-basis purchases in range — not a running outstanding balance net of vendor
        payments (Payment Vouchers don't post against a specific purchase order's balance).
      </p>
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
        emptyMessage="No credit purchases in this range."
      />
    </div>
  );
}
