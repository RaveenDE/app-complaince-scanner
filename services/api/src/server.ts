import { createServer } from "node:http";
import { resolve } from "node:path";
import { loadLocalEnv } from "./env.js";
import { allowPrivateFromEnv, handleRequest } from "./app.js";
import { runPipeline } from "./pipeline.js";
import { LocalScanStore } from "./storage-local.js";

loadLocalEnv();

const port = Number(process.env.PORT ?? 8787);
const dataDir = resolve(process.env.ACS_DATA_DIR ?? ".data");
const allowPrivate = allowPrivateFromEnv();
const store = new LocalScanStore(dataDir);

const runner = {
  start(scanId: string): void {
    void runPipeline(scanId, store, { allowPrivateAddresses: allowPrivate });
  },
};

const server = createServer((req, res) => {
  void (async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${String(port)}`);
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp =
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ??
      req.socket.remoteAddress ??
      "127.0.0.1";

    const response = await handleRequest(
      {
        method: req.method ?? "GET",
        path: url.pathname,
        body: Buffer.concat(chunks).toString("utf8"),
        headers: Object.fromEntries(
          Object.entries(req.headers).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(",") : value,
          ]),
        ),
        clientIp,
      },
      store,
      runner,
      { allowPrivateAddresses: allowPrivate },
    );

    res.statusCode = response.status;
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }
    res.end(response.body);
  })();
});

server.listen(port, () => {
  console.error(`API listening on http://127.0.0.1:${String(port)}`);
  console.error(`Data directory: ${dataDir}`);
  if (allowPrivate) {
    console.error(
      "ACS_ALLOW_PRIVATE_ADDRESSES=true (test/local only; never set this in production).",
    );
  }
  console.error(
    process.env.OPENAI_API_KEY?.trim()
      ? "Explain: OpenAI (OPENAI_API_KEY is set)."
      : "Explain: template fallback (no OPENAI_API_KEY).",
  );
});
