export function formatSequence(prefix, seq, width = 6) {
  return `${prefix}-${String(seq).padStart(width, "0")}`;
}
