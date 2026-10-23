import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import type { AddressInfo } from "node:net";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export type FixtureServer = {
  url: string;
  close: () => Promise<void>;
};

export async function serveFixture(rootDir: string): Promise<FixtureServer> {
  const root = resolve(rootDir);

  const server: Server = createServer((req, res) => {
    void (async () => {
      const requestPath = req.url?.split("?")[0] ?? "/";
      const relative = requestPath === "/" ? "index.html" : requestPath.slice(1);
      const filePath = resolve(join(root, relative));
      if (filePath !== root && !filePath.startsWith(`${root}\\`) && !filePath.startsWith(`${root}/`)) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }

      try {
        const body = await readFile(normalize(filePath));
        res.setHeader(
          "Content-Type",
          MIME[extname(filePath)] ?? "application/octet-stream",
        );
        res.end(body);
      } catch {
        res.statusCode = 404;
        res.end("Not found");
      }
    })();
  });

  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", () => resolveListen());
  });

  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${String(address.port)}`,
    close: () =>
      new Promise((resolveClose, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolveClose();
        });
      }),
  };
}
