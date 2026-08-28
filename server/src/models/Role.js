import { Schema, model } from "mongoose";

const roleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    permissions: [{ type: String, required: true }],
  },
  { timestamps: true }
);

export default model("Role", roleSchema);
