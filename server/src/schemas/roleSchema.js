import { Schema } from "mongoose";

export const roleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    permissions: [{ type: String, required: true }],
  },
  { timestamps: true }
);
