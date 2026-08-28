import { Schema, model } from "mongoose";

const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = model("Counter", counterSchema);

/**
 * Atomically increments and returns the next sequence number for a given prefix key.
 * e.g. nextSequence("INV") -> 1, 2, 3...  nextSequence(`PV-${year}-${month}`) for monthly-reset counters.
 */
export async function nextSequence(key, options = {}) {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, ...options }
  );
  return doc.seq;
}

export default Counter;
