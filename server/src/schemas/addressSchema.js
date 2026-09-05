import { Schema } from "mongoose";

export const addressSchema = new Schema(
  {
    state: { type: String, trim: true },
    lga: { type: String, trim: true },
    city: { type: String, trim: true },
    street: { type: String, trim: true },
    houseNo: { type: String, trim: true },
  },
  { _id: false }
);
