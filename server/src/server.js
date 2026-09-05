import "dotenv/config";
import { createApp } from "./app.js";
import { getPlatformDb } from "./platform/platformDb.js";

const PORT = process.env.PORT ?? 4000;

async function main() {
  // Connect to platform DB first — this is the only required startup connection.
  // Tenant DBs are connected on-demand when the first request for each org arrives.
  await getPlatformDb();
  console.log("Platform DB connected");

  const app = createApp();
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
