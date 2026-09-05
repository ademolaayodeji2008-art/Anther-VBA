import { Schema } from "mongoose";

// FabricOptions stores user-managed additions to the colour/pattern/nature lists
export const fabricOptionsSchema = new Schema(
  {
    type: { type: String, enum: ["colour", "pattern", "nature"], required: true },
    value: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

fabricOptionsSchema.index({ type: 1, value: 1 }, { unique: true });
