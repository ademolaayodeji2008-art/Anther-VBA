export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount ?? 0);
}

export function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString();
}
