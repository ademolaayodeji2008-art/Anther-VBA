export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function normalize(err) {
  // Duplicate key (unique index violation) — surfaces as a raw driver error otherwise.
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? "value";
    return { status: 409, message: `A record with this ${field} already exists.` };
  }
  // Mongoose schema validation failure.
  if (err.name === "ValidationError") {
    return { status: 400, message: Object.values(err.errors).map((e) => e.message).join("; ") };
  }
  // Malformed ObjectId in a route param, e.g. GET /customers/not-an-id.
  if (err.name === "CastError") {
    return { status: 400, message: `Invalid ${err.path}: ${err.value}` };
  }
  return { status: err.status ?? 500, message: err.message ?? "Internal server error" };
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const { status, message } = normalize(err);
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ message });
}
