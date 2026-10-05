import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(fileURLToPath(import.meta.url));
const dist = join(raiz, "dist");
let api = (process.env.SAGTRACK_API_URL || process.env.VITE_API_URL || "https://sagtrack-backend.onrender.com").trim().replace(/\/$/, "");
if (api.endsWith("/api")) api = api.slice(0, -4);

await mkdir(dist, { recursive: true });
await copyFile(join(raiz, "index.html"), join(dist, "index.html"));
await writeFile(join(dist, "config.js"), `window.SAGTRACK_API = ${JSON.stringify(api)};\n`, "utf8");
console.log(`API ${api}`);
