// Verification-only helper (deleted after use): spins up a disposable in-memory MongoDB
// replica set and starts the real server against it, to smoke-test the app in a browser
// without touching the real Atlas cluster (unreachable from this sandbox anyway).
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn } from "node:child_process";

const replSet = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  instanceOpts: [{ launchTimeout: 60000 }],
});
const uri = replSet.getUri();
console.log("MEMORY_MONGO_URI=" + uri);

const child = spawn(process.execPath, ["src/server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    MONGO_URI: uri,
    JWT_ACCESS_SECRET: "verify-access-secret",
    JWT_REFRESH_SECRET: "verify-refresh-secret",
    CLIENT_ORIGIN: "http://localhost:5173",
    NODE_ENV: "development",
  },
  stdio: "inherit",
});

process.on("SIGTERM", async () => {
  child.kill();
  await replSet.stop();
  process.exit(0);
});
