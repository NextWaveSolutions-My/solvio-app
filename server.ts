import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { parse } from "node:url";

import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

function loadLocalEnv() {
  const envFiles = [
    `.env.${dev ? "development" : "production"}.local`,
    ".env.local",
    `.env.${dev ? "development" : "production"}`,
    ".env",
  ];

  envFiles.forEach((fileName) => {
    const filePath = path.join(process.cwd(), fileName);

    if (!fs.existsSync(filePath)) {
      return;
    }

    const contents = fs.readFileSync(filePath, "utf8");
    contents.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  });
}

async function bootstrap() {
  loadLocalEnv();

  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();
  const { initializeSocketServer } = await import("./lib/socket/server");
  const { resumeStrandedCrawls } = await import("./lib/ai/web-source-index");

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl).catch((error) => {
      console.error("Failed to handle request:", error);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  initializeSocketServer(httpServer);

  httpServer.listen(port, hostname, () => {
    console.log(
      `> Ready on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`
    );
    // Reconnect to any Firecrawl crawls that were in-flight before the last
    // shutdown. Fire-and-forget — runs in the background while requests serve.
    void resumeStrandedCrawls().catch((error) => {
      console.error("Failed to resume stranded crawls:", error);
    });
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
