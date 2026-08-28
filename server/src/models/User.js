import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    roles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    active: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export default model("User", userSchema);
