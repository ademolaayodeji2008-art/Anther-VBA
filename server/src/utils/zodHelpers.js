import { z } from "zod";

// HTML date inputs submit "" (not omitted) when left blank, which z.coerce.date() treats as an
// invalid date rather than "not provided". Normalize blank/null to undefined before coercing.
const blankToUndefined = (v) => (v === "" || v === undefined || v === null ? undefined : v);

export const optionalDate = () => z.preprocess(blankToUndefined, z.coerce.date().optional());

export const requiredDate = (message = "A valid date is required") =>
  z.preprocess(blankToUndefined, z.coerce.date({ required_error: message, invalid_type_error: message }));

// react-hook-form's `valueAsNumber` turns a blank numeric input into NaN, not undefined, which
// z.number() rejects outright even when the field is .optional().
const blankOrNaNToUndefined = (v) => {
  if (v === "" || v === undefined || v === null) return undefined;
  if (typeof v === "number" && Number.isNaN(v)) return undefined;
  return v;
};

export const optionalNumber = (schema = z.coerce.number()) =>
  z.preprocess(blankOrNaNToUndefined, schema.optional());
