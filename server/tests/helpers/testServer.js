import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import http from "node:http";
import { createApp } from "../../src/app.js";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.CLIENT_ORIGIN ??= "http://localhost:5173";
process.env.APP_URL ??= "http://localhost:5173";

let mongod;
let server;
let baseUrl;

// A single-node replica set (not a plain standalone) is required so mongoose sessions/transactions
// work in tests — sales/purchase/adjustment posting all use multi-document transactions.
export async function startTestServer() {
  mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    // The default 10s launch timeout is too tight for replica-set initiation on a slow disk.
    instanceOpts: [{ launchTimeout: 60000 }],
  });
  await mongoose.connect(mongod.getUri());

  const app = createApp();
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  return baseUrl;
}

export async function stopTestServer() {
  await mongoose.disconnect();
  await mongod.stop();
  server.close();
}

export function httpJson(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${baseUrl}${path}`,
      { method, headers: { "Content-Type": "application/json", ...headers } },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: chunks ? JSON.parse(chunks) : null,
            setCookie: res.headers["set-cookie"],
          })
        );
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}
