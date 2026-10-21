import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "index.html"), "utf8");
const funcoes = html.slice(html.indexOf("function normPlaca"), html.indexOf("function pintarTabelaVivo"));
const chave = html.slice(html.indexOf("function chaveDestaque"), html.indexOf("function desenharTrechosOficiais"));
assert.ok(funcoes.includes("function placasEfetivas"), "placas efetivas ausentes");
assert.ok(chave.includes("function chaveDestaque"), "chave do destaque ausente");
const api = new Function(`${funcoes}\n${chave}\nreturn { normPlaca, placasEfetivas, veiculosParaDestaque, chaveDestaque };`)();

const rotaA = {
  codigo: "65DN",
  percentual: 90.1,
  placa_principal: "SDE-5I26",
  placas_apoio: ["RBM-2G21"],
  executores: [
    { placa: "SDE-5I26", papel: "principal", percentual: 70, contribuicao_exclusiva: 70 },
    { placa: "RBM-2G21", papel: "apoio", percentual: 30, contribuicao_exclusiva: 20 },
    { placa: "SDN-8F66", papel: "sobreposta", percentual: 12 },
  ],
};
const detA = {
  percentual: 90.1,
  executores: rotaA.executores,
  veiculos: [
    { placa: "SDE-5I26", papel: "principal", percentual: 70, linhas: [[[-16.8, -49.2], [-16.81, -49.21]]] },
    { placa: "RBM-2G21", papel: "apoio", percentual: 30, linhas: [[[-16.82, -49.22], [-16.83, -49.23]], [[-16.84, -49.24], [-16.85, -49.25]]] },
    { placa: "SDN-8F66", papel: "sobreposta", percentual: 12, linhas: [[[-16.7, -49.1], [-16.71, -49.11]]] },
  ],
};
const rotaB = {
  codigo: "66DN",
  percentual: 95,
  placa_principal: "SDE-6B76",
  placas_apoio: ["SDF-5G66", "RBK-7H47", "SDN-8J06"],
};
const detB = {
  percentual: 95,
  executores: [
    { placa: "SDE-6B76", papel: "principal", percentual: 40 },
    { placa: "SDF-5G66", papel: "apoio", percentual: 20 },
    { placa: "RBK-7H47", papel: "apoio", percentual: 20 },
    { placa: "SDN-8J06", papel: "apoio", percentual: 15 },
    { placa: "RBM-2G21", papel: "sobreposta", percentual: 8 },
  ],
  veiculos: [
    { placa: "SDE-6B76", papel: "principal", linhas: [[[1, 1], [2, 2]]] },
    { placa: "SDF-5G66", papel: "apoio", linhas: [[[3, 3], [4, 4]]] },
    { placa: "RBK-7H47", papel: "apoio", linhas: [[[5, 5], [6, 6]]] },
    { placa: "SDN-8J06", papel: "apoio", linhas: [[[7, 7], [8, 8]]] },
    { placa: "RBM-2G21", papel: "sobreposta", linhas: [[[9, 9], [10, 10]]] },
  ],
};

const efetivosA = api.placasEfetivas(rotaA, detA);
assert.deepEqual(efetivosA.map((item) => item.placa), ["SDE-5I26", "RBM-2G21"]);
assert.equal(efetivosA.some((item) => item.papel === "sobreposta"), false);

const todosA = api.veiculosParaDestaque(detA.veiculos, "");
assert.deepEqual(todosA.map((item) => item.placa), ["SDE-5I26", "RBM-2G21"]);
assert.equal(todosA.every((item) => item.tracejado === false), true);
assert.equal(todosA[1].linhas.length, 2);

const soApoio = api.veiculosParaDestaque(detA.veiculos, "RBM-2G21");
assert.deepEqual(soApoio.map((item) => item.placa), ["RBM-2G21"]);
assert.equal(soApoio[0].linhas.length, 2);

const todosB = api.veiculosParaDestaque(detB.veiculos, "");
assert.deepEqual(todosB.map((item) => item.placa), ["SDE-6B76", "SDF-5G66", "RBK-7H47", "SDN-8J06"]);
assert.equal(todosB.some((item) => item.placa === "RBM-2G21"), false);
assert.deepEqual(api.veiculosParaDestaque(detB.veiculos, "RBK-7H47").map((item) => item.placa), ["RBK-7H47"]);

assert.deepEqual(
  api.placasEfetivas({ placa_principal: "SDE-6B76", placas_apoio: ["SDF-5G66", "RBK-7H47"] }, null).map((item) => item.papel),
  ["principal", "apoio", "apoio"],
);

assert.equal(api.chaveDestaque("65DN", detA), api.chaveDestaque("65DN", detA));
assert.notEqual(api.chaveDestaque("65DN", detA), api.chaveDestaque("66DN", detB));
assert.notEqual(api.chaveDestaque("65DN", null), api.chaveDestaque("65DN", detA));
assert.equal(rotaA.percentual, 90.1);
assert.equal(detA.veiculos[0].percentual, 70);
assert.equal(detA.veiculos[2].percentual, 12);
assert.equal(rotaB.percentual, 95);
assert.equal(detB.executores[4].papel, "sobreposta");

assert.match(html, /color: corPlaca\(veiculo\.placa\), weight: 3, opacity: 0\.85, smoothFactor: 0/);
assert.match(html, /Mostrar todas/);
assert.match(html, /btnTodas\.addEventListener\("click", \(\) => mostrarTodasRotas\(\)\)/);
assert.match(html, /"Trechos executados": vivoGrupoFeitos/);
assert.match(html, /"Trechos pendentes": vivoGrupoFalta/);
assert.match(html, /vivoGrupoFeitos = L\.layerGroup\(\);/);
assert.match(html, /vivoGrupoFalta = L\.layerGroup\(\);/);
assert.doesNotMatch(html, /vivoGrupoFeitos\.addTo/);
assert.doesNotMatch(html, /vivoGrupoFalta\.addTo/);
assert.doesNotMatch(html, /dashArray: papel === "sobreposta"/);

const destaque = html.slice(html.indexOf("function desenharDestaque"), html.indexOf("function destacarTrechosGerais"));
assert.match(destaque, /corPlaca\(veiculo\.placa\)/);
assert.doesNotMatch(destaque, /dashArray/);

assert.match(html, /layer\.on\("click", \(ev\) => \{\s*verSomenteRota\(codigo\)/);
assert.match(html, /verSomenteRota\(vivoCodigo\)/);

const selecionar = html.slice(html.indexOf("async function selecionarRotaNoMapa"), html.indexOf("function verSomenteRota"));
assert.match(selecionar, /vivoDetalheCache\[cacheChave\]/);
assert.doesNotMatch(selecionar, /carregarTrilhas/);
assert.doesNotMatch(selecionar, /percentual\s*=/);

const mostrar = html.slice(html.indexOf("function mostrarTodasRotas"), html.indexOf("function pintarPlacasMapa"));
assert.match(mostrar, /vivoFoco = ""/);
assert.match(mostrar, /vivoCodigo = ""/);
assert.match(mostrar, /vivoPlacaSelecionada = ""/);
assert.match(mostrar, /pintarTabelaVivo\(\)/);

console.log("selecao-rotas ok");
