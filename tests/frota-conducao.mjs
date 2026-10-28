import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(raiz, "index.html"), "utf8");
const script = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
new Function(script);

function chromePath() {
  const candidatos = [
    process.env.CHROME_PATH,
    "C:\\Users\\Kal\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  const achado = candidatos.find((caminho) => existsSync(caminho));
  if (!achado) throw new Error("Chrome ou Edge não encontrado.");
  return achado;
}

function responderJson(req, status, body) {
  return req.respond({
    status,
    contentType: "application/json; charset=utf-8",
    headers: { "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  });
}

function evento(parcial) {
  return Object.assign({
    tipo: "frenagem_brusca",
    rotulo: "Frenagem brusca",
    data_hora: "2026-10-28T08:10:00-03:00",
    fim: "2026-10-28T08:10:00-03:00",
    duracao_min: 0,
    velocidade: 42,
    lat: -16.82,
    lon: -49.25,
    endereco: "Rua das Flores, 100",
    link: "https://www.google.com/maps?q=-16.82,-49.25",
    origem: "estimado",
  }, parcial);
}

const contagemCheia = {
  excesso_velocidade: 1,
  motor_ocioso: 1,
  frenagem_brusca: 2,
  aceleracao_brusca: 1,
  curva_brusca: 0,
  curva_brusca_esquerda: 1,
  curva_brusca_direita: 1,
};

const eventosCheios = [
  evento({ tipo: "frenagem_brusca", rotulo: "Frenagem brusca", data_hora: "2026-10-28T08:10:00-03:00", velocidade: 42, origem: "estimado" }),
  evento({ tipo: "aceleracao_brusca", rotulo: "Aceleração brusca", data_hora: "2026-10-28T08:20:00-03:00", velocidade: 55, origem: "estimado" }),
  evento({ tipo: "curva_brusca_esquerda", rotulo: "Curva brusca à esquerda", data_hora: "2026-10-28T08:30:00-03:00", velocidade: 30, origem: "estimado" }),
  evento({ tipo: "curva_brusca_direita", rotulo: "Curva brusca à direita", data_hora: "2026-10-28T08:40:00-03:00", velocidade: 28, origem: "api" }),
  evento({
    tipo: "excesso_velocidade",
    rotulo: "Excesso de velocidade",
    data_hora: "2026-10-28T08:50:00-03:00",
    fim: "2026-10-28T08:54:00-03:00",
    duracao_min: 4,
    velocidade: 80,
    origem: "estimado",
  }),
  evento({
    tipo: "motor_ocioso",
    rotulo: "Motor ocioso",
    data_hora: "2026-10-28T09:00:00-03:00",
    fim: "2026-10-28T09:12:00-03:00",
    duracao_min: 12,
    velocidade: 0,
    origem: "estimado",
  }),
];

const serie = [
  ["2026-10-28T08:00:00-03:00", 40],
  ["2026-10-28T08:10:00-03:00", 42],
  ["2026-10-28T08:20:00-03:00", 55],
  ["2026-10-28T08:30:00-03:00", 30],
  ["2026-10-28T08:40:00-03:00", 28],
  ["2026-10-28T08:50:00-03:00", 80],
  ["2026-10-28T09:10:00-03:00", 20],
];

function telemetria(comEventos) {
  return {
    ok: true,
    placa: "ZZZ1A11",
    inicio: "2026-10-28T06:00:00-03:00",
    fim: "2026-10-28T18:59:00-03:00",
    km: 12.4,
    vel_media: 32,
    vel_maxima: 80,
    tempo_movimento_min: 40,
    tempo_parado_min: 8,
    paradas: 1,
    primeiro_pulso: "2026-10-28T08:00:00-03:00",
    ultimo_pulso: "2026-10-28T09:10:00-03:00",
    pulsos_acima_60: 1,
    serie,
    limite_kmh: 60,
    ignicao_sempre_ligada: comEventos,
    alerta_ignicao: comEventos ? "Ignição sempre ligada (suspeita de instalação do rastreador)." : "",
    contagem: comEventos ? contagemCheia : {
      excesso_velocidade: 0,
      motor_ocioso: 0,
      frenagem_brusca: 0,
      aceleracao_brusca: 0,
      curva_brusca: 0,
      curva_brusca_esquerda: 0,
      curva_brusca_direita: 0,
    },
    eventos: comEventos ? eventosCheios : [],
    ocioso: comEventos
      ? { tempo_min: 48, tempo_ligado_min: 384, percentual: 12.5, origem: "estimado", episodios: 1, episodios_min: 12 }
      : { tempo_min: null, tempo_ligado_min: null, percentual: null, origem: "estimado", episodios: 0, episodios_min: 0 },
    aviso: comEventos ? "valores estimados pelo GPS" : "",
  };
}

function linha(parcial) {
  return Object.assign({
    placa: "ZZZ1A11",
    descricao: "Basculante",
    eventos: 6,
    contagem: contagemCheia,
    tempo_ocioso_min: 12,
    ocioso_percentual: 12.5,
    ocioso_origem: "estimado",
    ignicao_sempre_ligada: true,
    limite_kmh: 60,
  }, parcial);
}

function ranking(vazio) {
  return {
    ok: true,
    operacao: "Senador Canedo",
    data: "2026-10-28",
    turno: "noturno",
    inicio: "2026-10-28T19:00:00-03:00",
    fim: "2026-10-29T05:59:00-03:00",
    caminhoes: vazio ? [] : [
      linha({}),
      linha({
        placa: "AAA2B22",
        descricao: "Compactador",
        eventos: 1,
        contagem: {
          excesso_velocidade: 1,
          motor_ocioso: 0,
          frenagem_brusca: 0,
          aceleracao_brusca: 0,
          curva_brusca: 0,
          curva_brusca_esquerda: 0,
          curva_brusca_direita: 0,
        },
        tempo_ocioso_min: 40,
        ocioso_percentual: 30,
        ignicao_sempre_ligada: false,
      }),
    ],
    avisos: [],
  };
}

function veiculos(n) {
  const lista = [];
  for (let i = 0; i < n; i += 1) {
    const placa = i === 0 ? "ZZZ1A11" : i === 1 ? "AAA2B22" : "T" + String(i).padStart(4, "0");
    lista.push({
      placa,
      descricao: i === 0 ? "Basculante" : "Compactador " + i,
      status: "movimento",
      velocidade: 20,
      ignicao: true,
      data_gps: "2026-10-28T14:00:00-03:00",
      minutos: 1,
    });
  }
  return lista;
}

let telCheio = true;
let rankVazio = false;
let nVeiculos = 2;
let atrasoEventos = 0;
const chamadas = [];

const server = createServer((req, res) => {
  const path = new URL(req.url, "http://127.0.0.1").pathname;
  if (path === "/config.js") {
    res.writeHead(200, { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" });
    res.end("window.SAGTRACK_API='';");
    return;
  }
  if (path === "/" || path === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html);
    return;
  }
  res.writeHead(204);
  res.end();
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const erros = [];

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: true,
  args: ["--disable-extensions", "--disable-background-networking"],
});

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  await page.setViewport({ width: 1280, height: 800 });
  page.on("console", (msg) => {
    if (msg.type() === "error") erros.push(msg.text());
  });
  page.on("pageerror", (err) => erros.push(err && err.stack ? err.stack : String(err)));
  await page.evaluateOnNewDocument(() => {
    window.__downloads = [];
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) {
        window.__downloads.push({ nome: this.download, href: this.href });
        return;
      }
      return click.apply(this, arguments);
    };
  });
  await page.setRequestInterception(true);
  page.on("request", async (req) => {
    try {
      const url = new URL(req.url());
      if (url.pathname.includes("leaflet.js")) {
        await req.respond({ status: 200, contentType: "application/javascript", body: "" });
        return;
      }
      if (url.pathname.includes("leaflet.css")) {
        await req.respond({ status: 200, contentType: "text/css", body: "" });
        return;
      }
      if (url.pathname === "/favicon.ico") {
        await req.respond({ status: 204, body: "" });
        return;
      }
      if (!url.pathname.startsWith("/api/")) {
        await req.continue();
        return;
      }
      if (url.pathname === "/api/auth/sessao") {
        await responderJson(req, 200, {
          usuario: { perfil: "admin", nome: "Admin", login: "admin" },
          csrf: "csrf-teste",
        });
        return;
      }
      if (url.pathname === "/api/frota/operacoes") {
        await responderJson(req, 200, {
          operacoes: [
            { id: 7, nome: "Senador Canedo", ativa: true, padrao: true, qtd: 2, placas: [] },
            { id: 8, nome: "Aparecida", ativa: true, padrao: false, qtd: 12, placas: [] },
          ],
        });
        return;
      }
      if (url.pathname === "/api/frota/ao-vivo") {
        await responderJson(req, 200, {
          atualizado_em: "2026-10-28T14:00:00-03:00",
          veiculos: veiculos(nVeiculos),
        });
        return;
      }
      if (url.pathname === "/api/frota/telemetria") {
        chamadas.push(url.pathname + url.search);
        await responderJson(req, 200, telemetria(telCheio));
        return;
      }
      if (url.pathname === "/api/frota/paradas") {
        await responderJson(req, 200, { ok: true, paradas: [], avisos: [] });
        return;
      }
      if (url.pathname === "/api/frota/eventos") {
        chamadas.push(url.pathname + url.search);
        if (atrasoEventos) await new Promise((r) => setTimeout(r, atrasoEventos));
        await responderJson(req, 200, ranking(rankVazio));
        return;
      }
      if (url.pathname === "/api/status") {
        await responderJson(req, 200, { job: { rodando: false, message: "", progress: 0, log: "", logs: [] } });
        return;
      }
      if (url.pathname === "/api/chatbot-config") {
        await responderJson(req, 200, { enviar_ao_gerar: false, disparo_2h: false, grupo_jid: "" });
        return;
      }
      if (url.pathname === "/api/live-report") {
        await responderJson(req, 200, { rotas: [], situacao: "AO_VIVO" });
        return;
      }
      await responderJson(req, 200, { ok: true });
    } catch (err) {
      if (!req.isInterceptResolutionHandled()) {
        await req.respond({ status: 500, contentType: "text/plain", body: String(err) }).catch(() => {});
      }
    }
  });

  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.classList.contains("auth-ok"));
  await page.evaluate(() => mostrarAba("frota"));
  await page.waitForFunction(() => {
    const op = document.getElementById("frota-operacao");
    const placa = document.getElementById("frota-tel-placa");
    return op && op.value === "7" && placa && [...placa.options].some((o) => o.value === "ZZZ1A11");
  });

  const abas = await page.evaluate(() => [...document.querySelectorAll("#aba-frota .vistas button")].map((b) => b.textContent.trim()));
  assert.deepEqual(abas, ["Ao vivo", "Paradas", "Telemetria", "Condução", "Operações"]);

  await page.evaluate(() => document.querySelector('#aba-frota button[data-vista="telemetria"]').click());
  await page.evaluate(() => {
    document.getElementById("frota-tel-data").value = "2026-10-28";
    document.getElementById("frota-tel-turno").value = "noturno";
    document.getElementById("frota-tel-placa").value = "ZZZ1A11";
    document.getElementById("btn-frota-tel").click();
  });
  await page.waitForFunction(() => {
    const corpo = document.getElementById("frota-tel-corpo");
    return corpo && !corpo.hidden && document.querySelectorAll("#frota-cond-tbody tr").length >= 6;
  });

  const cheio = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#frota-cond-cards button")].map((b) => ({
      tipo: b.getAttribute("data-frota-cond"),
      n: b.querySelector("b").textContent,
      extra: (b.querySelector(".frota-cond-extra") || {}).textContent || "",
    }));
    const aviso = document.getElementById("frota-tel-ignicao");
    const linhas = [...document.querySelectorAll("#frota-cond-tbody tr")].map((tr) => tr.innerText.replace(/\s+/g, " "));
    const pontos = [...document.querySelectorAll("#frota-grafico circle")].map((c) => ({
      fill: c.getAttribute("fill"),
      title: (c.querySelector("title") || {}).textContent || "",
    }));
    const thead = getComputedStyle(document.querySelector("#frota-cond-tabela thead")).display;
    return {
      cards,
      aviso: aviso.innerText.replace(/\s+/g, " ").trim(),
      avisoHidden: aviso.hidden,
      nota: document.querySelector(".frota-nota").textContent,
      linhas,
      pontos,
      thead,
    };
  });
  assert.deepEqual(cheio.cards.map((c) => c.tipo), [
    "frenagem_brusca",
    "aceleracao_brusca",
    "curva_brusca_esquerda",
    "curva_brusca_direita",
    "excesso_velocidade",
    "motor_ocioso",
  ]);
  assert.deepEqual(cheio.cards.map((c) => c.n), ["2", "1", "1", "1", "1", "1"]);
  assert.equal(cheio.cards[5].extra, "12,5% ocioso · 48 min");
  assert.equal(cheio.avisoHidden, false);
  assert.match(cheio.aviso, /Ignição sempre ligada/);
  assert.match(cheio.aviso, /A ignição ficou ligada em 100% dos pulsos deste turno/);
  assert.equal(cheio.nota, "Frenagem, aceleração e curva são estimadas pelo GPS (pulsos agrupados a cada 10 s), não por acelerômetro.");
  assert.equal(cheio.linhas.length, 6);
  assert.ok(cheio.linhas.some((t) => t.includes("Rastreador")));
  assert.ok(cheio.linhas.some((t) => t.includes("Estimado")));
  assert.ok(cheio.linhas.some((t) => t.includes("Abrir no Google Maps") && t.includes("4 min")));
  assert.ok(cheio.linhas.some((t) => t.includes("Frenagem brusca") && t.includes("—")));
  assert.ok(cheio.linhas.some((t) => t.includes("12 min")));
  assert.equal(cheio.thead, "table-header-group");
  const fills = cheio.pontos.map((p) => p.fill).sort();
  assert.deepEqual(fills, ["#111111", "#6b3fa0", "#6b3fa0", "#c0392b", "#e07a1f"].sort());
  assert.ok(cheio.pontos.every((p) => p.title.includes("·") && /\d{2}:\d{2}/.test(p.title)));
  assert.equal(cheio.pontos.some((p) => /ocioso/i.test(p.title)), false);

  await page.evaluate(() => document.querySelector('[data-frota-cond="frenagem_brusca"]').click());
  const filtrado = await page.evaluate(() => ({
    pressed: document.querySelector('[data-frota-cond="frenagem_brusca"]').getAttribute("aria-pressed"),
    texto: document.getElementById("frota-cond-tbody").innerText,
  }));
  assert.equal(filtrado.pressed, "true");
  assert.match(filtrado.texto, /Frenagem brusca/);
  assert.equal(/Aceleração brusca/.test(filtrado.texto), false);
  await page.evaluate(() => document.querySelector('[data-frota-cond="frenagem_brusca"]').click());
  const limpo = await page.evaluate(() => document.getElementById("frota-cond-tbody").innerText);
  assert.match(limpo, /Aceleração brusca/);
  assert.equal(await page.evaluate(() => document.querySelector('[data-frota-cond="frenagem_brusca"]').getAttribute("aria-pressed")), "false");

  await page.setViewport({ width: 390, height: 844 });
  const mobileEventos = await page.evaluate(() => {
    const tabelaEl = document.getElementById("frota-cond-tabela");
    const thead = tabelaEl && tabelaEl.querySelector("thead");
    const td = tabelaEl && tabelaEl.querySelector("tbody td");
    const caixa = tabelaEl.getBoundingClientRect();
    return {
      tags: tabelaEl ? [...tabelaEl.children].map((el) => el.tagName + ":" + el.children.length) : [],
      linhas: tabelaEl ? tabelaEl.querySelectorAll("tr").length : 0,
      vista: (document.querySelector("#aba-frota .vistas button.ativo") || {}).textContent || "",
      pagina: document.body.dataset.pagina,
      corpo: document.getElementById("frota-tel-corpo") ? document.getElementById("frota-tel-corpo").hidden : null,
      thead: thead ? getComputedStyle(thead).display : "sem-thead",
      td: td ? getComputedStyle(td).display : "sem-td",
      tr: td ? getComputedStyle(td.parentElement).display : "sem-tr",
      antes: td ? getComputedStyle(td, "::before").content : "",
      direita: caixa.right,
      largura: window.innerWidth,
    };
  });
  assert.equal(mobileEventos.thead, "none", JSON.stringify(mobileEventos));
  assert.equal(mobileEventos.td, "flex");
  assert.equal(mobileEventos.tr, "block");
  assert.match(mobileEventos.antes, /Hora/);
  assert.ok(mobileEventos.direita <= mobileEventos.largura + 1, JSON.stringify(mobileEventos));
  await page.setViewport({ width: 1280, height: 800 });

  telCheio = false;
  await page.evaluate(() => document.getElementById("btn-frota-tel").click());
  await page.waitForFunction(() => document.getElementById("frota-tel-ignicao").hidden && document.getElementById("frota-cond-tbody").innerText.includes("Nenhum evento"));
  const vazio = await page.evaluate(() => ({
    nums: [...document.querySelectorAll("#frota-cond-cards b")].map((b) => b.textContent),
    circulos: document.querySelectorAll("#frota-grafico circle").length,
    nota: !!document.querySelector(".frota-nota"),
  }));
  assert.deepEqual(vazio.nums, ["0", "0", "0", "0", "0", "0"]);
  assert.equal(vazio.circulos, 0);
  assert.equal(vazio.nota, true);

  await page.evaluate(() => document.querySelector('#aba-frota button[data-vista="conducao"]').click());
  await page.evaluate(() => {
    document.getElementById("frota-cond-data").value = "2026-10-28";
    document.getElementById("frota-cond-turno").value = "noturno";
  });
  atrasoEventos = 700;
  await page.evaluate(() => document.getElementById("btn-frota-cond").click());
  await page.waitForFunction(() => document.getElementById("frota-cond-estado").textContent.includes("Carregando condução"));
  const cargaCurta = await page.evaluate(() => document.getElementById("frota-cond-estado").textContent);
  assert.equal(/alguns minutos/i.test(cargaCurta), false);
  await page.waitForFunction(() => document.getElementById("frota-rank-total").textContent === "7");
  atrasoEventos = 0;
  const resumo = await page.evaluate(() => ({
    total: document.getElementById("frota-rank-total").textContent,
    topo: document.getElementById("frota-rank-topo").textContent,
    ocioso: document.getElementById("frota-rank-ocioso").textContent,
    primeira: document.querySelector("#frota-rank-tbody tr").innerText.replace(/\s+/g, " "),
    url: "",
  }));
  assert.equal(resumo.total, "7");
  assert.equal(resumo.topo, "ZZZ1A11 · 6");
  assert.equal(resumo.ocioso, "52 min");
  assert.match(resumo.primeira, /ZZZ1A11/);
  assert.match(resumo.primeira, /1\/1/);
  assert.match(resumo.primeira, /Ignição sempre ligada/);
  const urlEventos = chamadas.find((item) => item.startsWith("/api/frota/eventos"));
  assert.ok(urlEventos.includes("data=2026-10-28"));
  assert.ok(urlEventos.includes("turno=noturno"));
  assert.ok(urlEventos.includes("operacao=7"));

  await page.evaluate(() => document.querySelector('[data-frota-rank="placa"]').click());
  const ordenado = await page.evaluate(() => document.querySelector("#frota-rank-tbody tr").getAttribute("data-frota-placa"));
  assert.equal(ordenado, "AAA2B22");

  await page.evaluate(() => document.getElementById("btn-frota-cond-csv").click());
  await page.waitForFunction(() => window.__downloads.length > 0);
  const csv = await page.evaluate(async () => {
    const item = window.__downloads[window.__downloads.length - 1];
    const bytes = new Uint8Array(await (await fetch(item.href)).arrayBuffer());
    const texto = new TextDecoder("utf-8").decode(bytes);
    return { nome: item.nome, texto, bom: [bytes[0], bytes[1], bytes[2]] };
  });
  assert.deepEqual(csv.bom, [0xef, 0xbb, 0xbf]);
  assert.match(csv.nome, /conducao-2026-10-28-noturno\.csv/);
  const linhasCsv = csv.texto.replace(/^\uFEFF/, "").trim().split("\r\n");
  assert.equal(linhasCsv[0], "posição;placa;descrição;frenagem;aceleração;curvas (esq/dir);excessos;tempo ocioso;% ocioso;total de eventos;alerta de ignição");
  assert.match(linhasCsv[1], /^2;AAA2B22;/);
  assert.match(linhasCsv[2], /^1;ZZZ1A11;/);
  assert.match(csv.texto, /Ignição sempre ligada/);

  chamadas.length = 0;
  await page.evaluate(() => document.querySelector('#frota-rank-tbody tr[data-frota-placa="ZZZ1A11"]').click());
  await page.waitForFunction(() => {
    const ativo = document.querySelector("#aba-frota .vistas button.ativo");
    return ativo && ativo.dataset.vista === "telemetria" && document.getElementById("frota-tel-placa").value === "ZZZ1A11";
  });
  const abriu = await page.evaluate(() => ({
    data: document.getElementById("frota-tel-data").value,
    turno: document.getElementById("frota-tel-turno").value,
  }));
  assert.equal(abriu.data, "2026-10-28");
  assert.equal(abriu.turno, "noturno");
  const urlTel = chamadas.find((item) => item.startsWith("/api/frota/telemetria"));
  assert.ok(urlTel, chamadas.join(" | "));
  assert.ok(urlTel.includes("placa=ZZZ1A11"));
  assert.ok(urlTel.includes("data=2026-10-28"));
  assert.ok(urlTel.includes("turno=noturno"));
  assert.ok(urlTel.includes("operacao=7"));

  await page.evaluate(() => document.querySelector('#aba-frota button[data-vista="conducao"]').click());
  rankVazio = true;
  await page.evaluate(() => document.getElementById("btn-frota-cond").click());
  await page.waitForFunction(() => document.getElementById("frota-rank-tbody").innerText.includes("Nenhum caminhão"));
  const semRank = await page.evaluate(() => ({
    total: document.getElementById("frota-rank-total").textContent,
    topo: document.getElementById("frota-rank-topo").textContent,
    ocioso: document.getElementById("frota-rank-ocioso").textContent,
  }));
  assert.equal(semRank.total, "0");
  assert.equal(semRank.topo, "—");
  assert.equal(semRank.ocioso, "—");

  await page.setViewport({ width: 390, height: 844 });
  const mobileRank = await page.evaluate(() => {
    const td = document.querySelector("#frota-rank-tabela tbody td");
    const tabela = document.getElementById("frota-rank-tabela").getBoundingClientRect();
    return {
      thead: getComputedStyle(document.querySelector("#frota-rank-tabela thead")).display,
      td: getComputedStyle(td).display,
      tr: getComputedStyle(td.parentElement).display,
      direita: tabela.right,
      largura: window.innerWidth,
    };
  });
  assert.equal(mobileRank.thead, "none");
  assert.equal(mobileRank.tr, "block");
  assert.ok(mobileRank.direita <= mobileRank.largura + 1, JSON.stringify(mobileRank));
  await page.setViewport({ width: 1280, height: 800 });

  nVeiculos = 12;
  atrasoEventos = 900;
  rankVazio = false;
  await page.evaluate(() => {
    const sel = document.getElementById("frota-operacao");
    sel.value = "8";
    sel.dispatchEvent(new Event("change"));
  });
  await page.waitForFunction(() => /pode levar alguns minutos/i.test(document.getElementById("frota-cond-estado").textContent));
  await page.waitForFunction(() => document.getElementById("frota-rank-total").textContent === "7");
  assert.ok(chamadas.some((item) => item.startsWith("/api/frota/eventos") && item.includes("operacao=8")));

  const graves = erros.filter((texto) => !/Failed to load resource/i.test(texto));
  assert.deepEqual(graves, []);
  console.log("frota-conducao ok");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
