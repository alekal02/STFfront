import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "index.html"), "utf8");
const inicio = html.indexOf("function semAcentoVivo");
const fim = html.indexOf("async function atualizarTrilhas");
assert.ok(inicio > 0 && fim > inicio, "trecho do mapa ao vivo ausente");
const trecho = html.slice(inicio, fim);

function grupo() {
  const layers = [];
  return {
    layers,
    clearLayers() { layers.length = 0; },
    eachLayer(fn) { layers.forEach(fn); },
  };
}

function camada(tipo) {
  const eventos = {};
  const layer = {
    tipo,
    on(nome, fn) { eventos[nome] = fn; return layer; },
    bindPopup() { return layer; },
    bindTooltip() { return layer; },
    addTo(destino) { destino.layers.push(layer); return layer; },
    getElement() { return { style: {} }; },
    getBounds() { return { isValid() { return true; } }; },
    openPopup() {},
    fire(nome) { if (eventos[nome]) eventos[nome]({ originalEvent: {} }); },
  };
  return layer;
}

const folha = { dataset: {}, clientWidth: 0, clientHeight: 0 };
const vivoGrupoAreas = grupo();
const vivoGrupoDificil = grupo();
const api = new Function(
  "vivoGrupoAreas",
  "vivoGrupoDificil",
  "folha",
  "L",
  "window",
  `let vivoAreaFoco = "";
   let vivoAreaEnquadrar = false;
   let vivoMapa = { closePopup() {}, stop() {}, fitBounds() {} };
   let vivoAreasNoQuadro = "";
   function horaCurta() { return ""; }
   function ligarPopupVeiculo() {}
   function enquadrarAreas() {}
   function textoPct(valor) { return String(valor); }
   function $(id) { return id === "vivo-folha" ? folha : null; }
   ${trecho}
   return {
     desenharDificil,
     limparCamadaDificil,
     carregarDificil,
     areaEstaProgramada,
     foco: () => vivoAreaFoco,
     setFoco: (id) => { vivoAreaFoco = id; },
   };`
)(vivoGrupoAreas, vivoGrupoDificil, folha, {
  polyline: () => camada("linha"),
  polygon: () => camada("poligono"),
  circleMarker: () => camada("ponto"),
  DomEvent: { stopPropagation() {} },
}, globalThis);

const anel = [[-16.8, -49.3], [-16.8, -49.2], [-16.9, -49.2], [-16.9, -49.3], [-16.8, -49.3]];
function area(id, nome, programada) {
  return { id, nome, frequencia: "QUI", programada, poligonos: [anel], percentual: programada ? 12.5 : null };
}
const sex = [
  area("CHACARA SAO PEDRO|-16.81000|-49.25000", "CHACARA SAO PEDRO", true),
  area("CHACARA SAO PEDRO|-16.82000|-49.26000", "CHACARA SAO PEDRO", true),
  area("SERRA DOURADA|-16.83000|-49.27000", "SERRA DOURADA", true),
  area("SANTA LUZIA|-16.84000|-49.28000", "SANTA LUZIA/ROSA DO SUL", true),
  area("GIRASSOIS|-16.85000|-49.29000", "GIRASSOIS", true),
  area("TERRA DO SOL|-16.86000|-49.30000", "TERRA DO SOL", false),
  area("ALTO|-16.87000|-49.31000", "ALTO DA BOA VISTA", false),
];
const terra = area("TERRA DO SOL|-16.86000|-49.30000", "TERRA DO SOL", true);
const sab = [
  area("ALTO|-16.87000|-49.31000", "ALTO DA BOA VISTA", true),
  area("MADRE|-16.88000|-49.32000", "MADRE GERMANA", true),
  area("QUINTA|-16.89000|-49.33000", "QUINTA DA BOA VISTA", true),
  area("IPES|-16.90000|-49.34000", "JARDIM DOS IPES", true),
  area("BURITI|-16.91000|-49.35000", "BURITI SERENO", true),
  terra,
].map((item, indice) => (indice === 5 ? { ...item, programada: false } : item));

function pacote(data, turno, areas, extra) {
  return {
    data,
    turno,
    areas,
    resumo: {},
    veiculos: [{
      codigo: "CBT018",
      placa: "SCN-4B49",
      situacao: "Difícil acesso",
      area_id: extra && extra.area_id,
      lat: extra && extra.lat,
      lon: extra && extra.lon,
      trechos_por_area: extra && extra.linhas || {},
      eventos: extra && extra.eventos || [],
      isolados: [],
      poligonos: [],
    }],
  };
}

function idsVisiveis() {
  return vivoGrupoAreas.layers.map((layer) => layer._areaId);
}

api.desenharDificil(pacote("2026-10-21", "diurno", sex.map((item) => ({ ...item, programada: false })), {
  area_id: "TERRA DO SOL|-16.86000|-49.30000",
  linhas: { "TERRA DO SOL|-16.86000|-49.30000": [[[-16.85, -49.25], [-16.851, -49.251]]] },
  eventos: [{ tipo: "entrada", area_id: "TERRA DO SOL|-16.86000|-49.30000", lat: -16.85, lon: -49.25 }],
}));
assert.deepEqual(idsVisiveis(), []);
assert.equal(vivoGrupoDificil.layers.some((layer) => layer.tipo === "linha"), false);
assert.equal(folha.dataset.areasFiltro, "programadas");
assert.equal(folha.dataset.areasPoligonos, "0");

api.desenharDificil(pacote("2026-10-22", "diurno", [terra, ...sex.filter((item) => item.nome !== "TERRA DO SOL").map((item) => ({ ...item, programada: false }))], {
  linhas: { [terra.id]: [[[-16.85, -49.25], [-16.851, -49.251]]] },
}));
assert.deepEqual(idsVisiveis(), [terra.id]);
assert.equal(vivoGrupoDificil.layers.some((layer) => layer.tipo === "linha"), false);

const sexta = pacote("2026-10-23", "diurno", sex, {
  linhas: { [sex[0].id]: [[[-16.81, -49.25], [-16.811, -49.251]]] },
});
api.desenharDificil(sexta);
assert.deepEqual(idsVisiveis().slice().sort(), sex.filter((item) => item.programada).map((item) => item.id).sort());
assert.equal(idsVisiveis().filter((id) => id.startsWith("CHACARA SAO PEDRO|")).length, 2);
assert.equal(idsVisiveis().includes(terra.id), false);

const escolhida = vivoGrupoAreas.layers.find((layer) => layer._areaId === sex[0].id);
escolhida.fire("click");
await new Promise((resolver) => setTimeout(resolver, 0));
assert.equal(api.foco(), sex[0].id);
assert.equal(vivoGrupoDificil.layers.filter((layer) => layer.tipo === "linha").length, 1);
assert.equal(idsVisiveis().includes("ALTO|-16.87000|-49.31000"), false);

api.setFoco(terra.id);
api.desenharDificil(pacote("2026-10-24", "diurno", sab));
assert.equal(api.foco(), "");
assert.deepEqual(idsVisiveis().slice().sort(), sab.filter((item) => item.programada).map((item) => item.id).sort());
assert.equal(idsVisiveis().includes(terra.id), false);
assert.equal(vivoGrupoDificil.layers.some((layer) => layer.tipo === "linha"), false);

api.desenharDificil(pacote("2026-10-22", "noturno", [terra, ...sex].map((item) => ({ ...item, programada: false }))));
assert.deepEqual(idsVisiveis(), []);
assert.equal(vivoGrupoAreas.layers.length, 0);

api.desenharDificil(pacote("2026-10-22", "diurno", [terra]));
assert.deepEqual(idsVisiveis(), [terra.id]);
api.limparCamadaDificil();
assert.deepEqual(idsVisiveis(), []);
assert.equal(vivoGrupoDificil.layers.length, 0);
assert.equal(globalThis.vivoDificil, null);

assert.equal(api.areaEstaProgramada({ programada: false, frequencia: "QUI" }, { data: "2026-10-22", turno: "diurno" }), false);
assert.equal(api.areaEstaProgramada({ frequencia: "QUI" }, { data: "2026-10-21", turno: "diurno" }), false);
assert.equal(api.areaEstaProgramada({ frequencia: "QUI" }, { data: "2026-10-22", turno: "diurno" }), true);
assert.equal(api.areaEstaProgramada({ frequencia: "SEG/SEX - DIURNO" }, { data: "2026-10-23", turno: "noturno" }), false);

const pedidos = [];
globalThis.fetch = async (url) => {
  pedidos.push(url);
  const consulta = new URL(url, "http://local").searchParams;
  const data = consulta.get("data");
  const turno = consulta.get("turno");
  const areas = data === "2026-10-22"
    ? [{ ...terra, programada: true }]
    : sex.map((item) => ({ ...item, programada: false }));
  return { ok: true, json: async () => ({ data, turno, areas, veiculos: [], resumo: {} }) };
};
const primeiro = api.carregarDificil("2026-10-22", "diurno");
const segundo = api.carregarDificil("2026-10-21", "diurno");
await primeiro;
await segundo;
assert.equal(idsVisiveis().includes(terra.id), false);
assert.equal(folha.dataset.areasPoligonos, "0");
assert.equal(pedidos.length, 2);
assert.equal(trecho.includes("vivoMostrarTodasAreas"), false);
assert.equal(trecho.includes("fora_programacao"), false);
assert.match(html, /if \(!programada\) return/);
assert.match(html, /vivoDificilSeq \+= 1/);
assert.match(html, /limparCamadaDificil\(\)/);
