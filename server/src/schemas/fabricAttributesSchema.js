import { SALE_TYPES } from "../config/fabricOptions.js";

export const fabricAttributeFields = {
  colour: { type: String, required: true, trim: true },
  pattern: { type: String, required: true, trim: true },
  nature: { type: String, required: true, trim: true },
  saleType: { type: String, enum: SALE_TYPES, required: true },
  converter: { type: Number, default: 1, min: 0.01 },
  stockQty: { type: Number, required: true, min: 0.01 },
};
