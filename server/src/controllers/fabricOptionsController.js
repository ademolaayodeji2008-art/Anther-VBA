import { COLOURS, PATTERNS, NATURES, SALE_TYPES } from "../config/fabricOptions.js";

export function getFabricOptions(req, res) {
  res.json({ colours: COLOURS, patterns: PATTERNS, natures: NATURES, saleTypes: SALE_TYPES });
}
