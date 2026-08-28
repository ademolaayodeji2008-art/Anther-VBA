import { SALE_TYPES } from "../../config/fabricOptions.js";

// Shared by SalesOrder, Invoice, and Return line items — mirrors the source's mandatory
// Colour/Pattern/Nature + Sale Type (Yard/Trouser/Bundle) fields on every fabric line.
// stockQty = qty * converter is the quantity actually deducted from/returned to stock;
// converter only means something when saleType is BUNDLE (source: "quantity per bundle"),
// and defaults to 1 for Yard/Trouser so stockQty === qty in those cases.
export const fabricAttributeFields = {
  colour: { type: String, required: true, trim: true },
  pattern: { type: String, required: true, trim: true },
  nature: { type: String, required: true, trim: true },
  saleType: { type: String, enum: SALE_TYPES, required: true },
  converter: { type: Number, default: 1, min: 0.01 },
  stockQty: { type: Number, required: true, min: 0.01 },
};
