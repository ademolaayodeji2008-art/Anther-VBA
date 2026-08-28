import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const { PORT = 4000, MONGO_URI } = process.env;

async function main() {
  await connectDB(MONGO_URI);
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
