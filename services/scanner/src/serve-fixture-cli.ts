import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { serveFixture } from "./fixture-server.js";

const name = process.argv[2] ?? "bad-site";
const root = fileURLToPath(new URL("../fixtures", import.meta.url));
const fixture = await serveFixture(join(root, name));
console.log(fixture.url);
console.error(`Serving ${name}. Press Ctrl+C to stop.`);
