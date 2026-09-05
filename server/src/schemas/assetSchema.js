import { Schema } from "mongoose";

export const DEPRECIATION_METHODS = ["STRAIGHT_LINE", "REDUCING_BALANCE"];
export const ASSET_CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "OBSOLETE"];
export const ASSET_STATUSES = ["ACTIVE", "DISPOSED", "IN_REPAIR", "LOST"];

function monthsBetween(from, to) {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, to.getDate() >= from.getDate() ? months : months - 1);
}

export const assetSchema = new Schema(
  {
    assetId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    assignedUser: { type: String, trim: true },
    location: { type: String, trim: true },
    serialNo: { type: String, trim: true },
    purchaseDate: { type: Date, required: true },
    supplier: { type: String, trim: true },
    invoiceNo: { type: String, trim: true },
    cost: { type: Number, required: true, min: 0 },
    usefulLifeYears: { type: Number, required: true, min: 1 },
    depreciationMethod: { type: String, enum: DEPRECIATION_METHODS, required: true },
    condition: { type: String, enum: ASSET_CONDITIONS, default: "NEW" },
    status: { type: String, enum: ASSET_STATUSES, default: "ACTIVE" },
    remarks: { type: String, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

assetSchema.methods.depreciationAsOf = function (asOfDate = new Date()) {
  const usefulLifeMonths = this.usefulLifeYears * 12;
  const monthsElapsed = Math.min(monthsBetween(this.purchaseDate, asOfDate), usefulLifeMonths);
  if (this.depreciationMethod === "STRAIGHT_LINE") {
    const monthlyDepreciation = this.cost / usefulLifeMonths;
    const accumulatedDepreciation = monthlyDepreciation * monthsElapsed;
    return { monthlyDepreciation, accumulatedDepreciation, netBookValue: Math.max(0, this.cost - accumulatedDepreciation) };
  }
  const annualRate = 2 / this.usefulLifeYears;
  const monthlyRate = annualRate / 12;
  const netBookValue = Math.max(0, this.cost * Math.pow(1 - monthlyRate, monthsElapsed));
  const accumulatedDepreciation = this.cost - netBookValue;
  const monthlyDepreciation = monthsElapsed > 0 ? this.cost * Math.pow(1 - monthlyRate, monthsElapsed - 1) * monthlyRate : 0;
  return { monthlyDepreciation, accumulatedDepreciation, netBookValue };
};

assetSchema.virtual("netBookValue").get(function () { return this.depreciationAsOf().netBookValue; });
assetSchema.virtual("accumulatedDepreciation").get(function () { return this.depreciationAsOf().accumulatedDepreciation; });
assetSchema.virtual("monthlyDepreciation").get(function () { return this.depreciationAsOf().monthlyDepreciation; });
assetSchema.virtual("fullyDepreciated").get(function () { return this.netBookValue <= 0.01; });
