import { ApiError } from "./errorHandler.js";

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ApiError(400, result.error.issues.map((i) => i.message).join("; ")));
    }
    req.body = result.data;
    next();
  };
}
