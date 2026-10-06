import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "index.html"), "utf8");
const bloco = html.match(/\/\* virada-vivo \*\/([\s\S]*?)\/\* \/virada-vivo \*\//);
if (!bloco) throw new Error("Bloco da virada não encontrado.");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(bloco[1], ctx);

const { turnoOperacional, decidirViradaAoVivo } = ctx;

function brt(iso) {
  return new Date(iso);
}

function igual(nome, obtido, esperado) {
  const texto = JSON.stringify(obtido);
  const alvo = JSON.stringify(esperado);
  if (texto !== alvo) throw new Error(nome + " obteve " + texto + " esperado " + alvo);
}

const t1859 = brt("2026-10-06T21:59:00Z");
const t1900 = brt("2026-10-06T22:00:00Z");
const t0559 = brt("2026-10-07T08:59:00Z");
const t0600 = brt("2026-10-07T09:00:00Z");
const t2359 = brt("2026-10-07T02:59:00Z");
const t0000 = brt("2026-10-07T03:00:00Z");

igual("18:59", turnoOperacional(t1859), { data: "2026-10-06", turno: "diurno" });
igual("19:00", turnoOperacional(t1900), { data: "2026-10-06", turno: "noturno" });
igual("05:59", turnoOperacional(t0559), { data: "2026-10-06", turno: "noturno" });
igual("06:00", turnoOperacional(t0600), { data: "2026-10-07", turno: "diurno" });

const dia = turnoOperacional(t1859);
igual(
  "18:59?19:00",
  decidirViradaAoVivo(dia, t1900, true),
  { trocar: true, data: "2026-10-06", turno: "noturno" },
);

const noite = turnoOperacional(t0559);
igual(
  "05:59?06:00",
  decidirViradaAoVivo(noite, t0600, true),
  { trocar: true, data: "2026-10-07", turno: "diurno" },
);

igual(
  "meia-noite permanece no noturno",
  decidirViradaAoVivo(turnoOperacional(t2359), t0000, true),
  { trocar: false, data: "2026-10-06", turno: "noturno" },
);

const historico = { data: "2026-10-04", turno: "diurno" };
igual("histórico 19:00", decidirViradaAoVivo(historico, t1900, false), { trocar: false, data: "2026-10-04", turno: "diurno" });
igual("histórico 06:00", decidirViradaAoVivo(historico, t0600, false), { trocar: false, data: "2026-10-04", turno: "diurno" });

if (!html.includes("const virou = aplicarTurnoOperacional();")) {
  throw new Error("A leitura do Ao Vivo não aplica a virada antes de buscar o turno.");
}
if (!html.includes("vivoAcompanhar = selecaoConfereOperacional();")) {
  throw new Error("A escolha manual não desliga o acompanhamento.");
}

console.log("ok");
