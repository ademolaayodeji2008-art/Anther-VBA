import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { formatCurrency } from "../../utils/format";
import { downloadCsv } from "../../utils/csv";
import { useReport } from "./useReport";
import { ReportFilters } from "./ReportFilters";

const COLUMNS = [
  { key: "name", header: "Item" },
  { key: "openingStock", header: "Opening Stock" },
  { key: "purchases", header: "Purchases" },
  { key: "sales", header: "Sales" },
  { key: "customerReturns", header: "Customer Returns" },
  { key: "supplierReturns", header: "Supplier Returns" },
  { key: "adjustments", header: "Adjustments" },
  { key: "closingStock", header: "Closing Stock" },
  { key: "costPrice", header: "Cost Price", render: (r) => formatCurrency(r.costPrice) },
  { key: "sellingPrice", header: "Selling Price", render: (r) => formatCurrency(r.sellingPrice) },
];

export function InventoryReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useReport("inventory", { startDate, endDate });

  return (
    <div>
      <PageHeader
        title="Inventory Report"
        action={
          <Button variant="secondary" onClick={() => downloadCsv("inventory-report.csv", COLUMNS, data?.data)}>
            Export CSV
          </Button>
        }
      />
      <ReportFilters startDate={startDate} endDate={endDate} onStartDate={setStartDate} onEndDate={setEndDate} />
      <DataTable
        columns={COLUMNS}
        rows={data?.data}
        loading={isLoading}
        emptyMessage="No items found."
        rowKey={(row) => row.item}
      />
    </div>
  );
}
