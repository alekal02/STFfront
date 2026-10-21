import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "index.html"), "utf8");
const inicio = html.indexOf("function placaDaRota");
const fim = html.indexOf("function pintarTabelaVivo");
assert.ok(inicio > 0 && fim > inicio, "funções de exibição ausentes");
const api = new Function(`${html.slice(inicio, fim)}\nreturn { placaDaRota, textoApoio, setorDaRota };`)();

const dn65 = {
  codigo: "65DN",
  rota: "65DN",
  percentual: 90.1,
  placa: "SDE-5I26",
  placa_principal: "SDE-5I26",
  placas_apoio: ["RBM-2G21"],
  apoio: "RBM-2G21",
  cobertura_sobreposta: "",
};
assert.equal(api.placaDaRota(dn65), "SDE-5I26");
assert.equal(api.textoApoio(dn65), "RBM-2G21");
assert.equal(api.setorDaRota(dn65), "65DN");
assert.equal(dn65.percentual, 90.1);

const dn66 = {
  codigo: "66DN",
  rota: "Setor 66 noturno",
  percentual: 95,
  placa_principal: "SDE-6B76",
  placas_apoio: ["SDF-5G66", "RBK-7H47", "SDN-8J06"],
  apoio: "SDF-5G66, RBK-7H47, SDN-8J06",
  cobertura_sobreposta: "RBM-2G21, SDN-8F66",
};
assert.equal(api.placaDaRota(dn66), "SDE-6B76");
assert.equal(api.textoApoio(dn66), "SDF-5G66, RBK-7H47, SDN-8J06");
assert.equal(api.textoApoio(dn66).includes("RBM-2G21"), false);
assert.equal(api.setorDaRota(dn66), "Setor 66 noturno");

assert.equal(api.textoApoio({ apoio: "Sem apoio identificado", placas_apoio: [] }), "Sem apoio identificado");
assert.equal(api.placaDaRota({ placa: "SDE-5I26", percentual: 60.3 }), "SDE-5I26");
assert.equal(api.textoApoio({ placa: "SDE-5I26" }), "—");

assert.match(html, /textoPct\(r\.percentual\)/);
assert.doesNotMatch(html.slice(inicio, fim), /km|haversine|percentual \+/);

console.log("painel-cobertura ok");
