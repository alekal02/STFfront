import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(fileURLToPath(import.meta.url));
const dist = join(raiz, "dist");
let api = (process.env.SAGTRACK_API_URL || process.env.VITE_API_URL || "").trim().replace(/\/$/, "");
if (api.endsWith("/api")) api = api.slice(0, -4);

await mkdir(dist, { recursive: true });
for (const nome of ["index.html", "whatsapp.html"]) {
  await copyFile(join(raiz, nome), join(dist, nome));
}
await writeFile(join(dist, "config.js"), `window.SAGTRACK_API = ${JSON.stringify(api)};\n`, "utf8");
console.log(api ? `API ${api}` : "API no mesmo endereço");
