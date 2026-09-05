import { Schema } from "mongoose";

export const itemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isVatable: { type: Boolean, default: false },
    packConverter: { type: Number, default: 1, min: 1 },
    costPrice: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

itemSchema.virtual("marginPct").get(function () {
  if (!this.sellingPrice) return 0;
  return ((this.sellingPrice - this.costPrice) / this.sellingPrice) * 100;
});
