import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { formatCurrency } from "../../utils/format";
import { downloadCsv } from "../../utils/csv";
import { useReport } from "./useReport";
import { ReportFilters } from "./ReportFilters";

const GROUP_BY_OPTIONS = [
  { value: "category", label: "By Category" },
  { value: "paymentMethod", label: "By Payment Method" },
  { value: "none", label: "Detailed" },
];

const GROUPED_COLUMNS = [
  { key: "name", header: "Group", render: (r) => r.name ?? r._id ?? "Uncategorized" },
  { key: "total", header: "Total", render: (r) => formatCurrency(r.total) },
  { key: "count", header: "Count" },
];

const DETAIL_COLUMNS = [
  { key: "expenseNo", header: "Expense No" },
  { key: "date", header: "Date", render: (r) => new Date(r.date).toLocaleDateString() },
  { key: "particulars", header: "Particulars" },
  { key: "category", header: "Category" },
  { key: "paymentMethod", header: "Method" },
  { key: "amount", header: "Amount", render: (r) => formatCurrency(r.amount) },
];

export function ExpensesReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("category");

  const { data, isLoading } = useReport("expenses", { startDate, endDate, groupBy });
  const columns = groupBy === "none" ? DETAIL_COLUMNS : GROUPED_COLUMNS;

  return (
    <div>
      <PageHeader
        title="Expenses Report"
        action={
          <Button variant="secondary" onClick={() => downloadCsv("expenses-report.csv", columns, data?.data)}>
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
      <DataTable columns={columns} rows={data?.data} loading={isLoading} emptyMessage="No expenses in this range." />
    </div>
  );
}
