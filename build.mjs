import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(fileURLToPath(import.meta.url));
const dist = join(raiz, "dist");
let api = (process.env.SAGTRACK_API_URL || process.env.VITE_API_URL || "").trim().replace(/\/$/, "");
if (api.endsWith("/api")) api = api.slice(0, -4);
const mapbox = (process.env.MAPBOX_ACCESS_TOKEN || process.env.SAGTRACK_MAPBOX_TOKEN || "").trim();

await mkdir(dist, { recursive: true });
for (const nome of ["index.html", "whatsapp.html"]) {
  await copyFile(join(raiz, nome), join(dist, nome));
}
await writeFile(
  join(dist, "config.js"),
  `window.SAGTRACK_API = ${JSON.stringify(api)};\nwindow.SAGTRACK_MAPBOX_TOKEN = ${JSON.stringify(mapbox)};\n`,
  "utf8",
);
console.log(api ? `API ${api}` : "API no mesmo endereço");
console.log(mapbox ? "Mapbox tiles ativos" : "Mapbox sem token — fallback OSM");
