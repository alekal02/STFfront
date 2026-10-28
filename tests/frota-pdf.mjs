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

function responderPdf(req, nome) {
  return req.respond({
    status: 200,
    contentType: "application/pdf",
    headers: { "Content-Disposition": `attachment; filename="${nome}"` },
    body: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
  });
}

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
let modo = "um";
let polls = 0;
const chamadas = [];

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: true,
  args: ["--disable-extensions", "--disable-background-networking"],
});

try {
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") erros.push(msg.text());
  });
  page.on("pageerror", (err) => erros.push(err && err.stack ? err.stack : String(err)));
  await page.evaluateOnNewDocument(() => {
    const original = window.fetch;
    window.__fetchLog = [];
    window.__pdfDownloads = [];
    window.fetch = function (input, init) {
      const opts = init || {};
      const headers = opts.headers;
      let csrf = "";
      if (headers && typeof headers.get === "function") csrf = headers.get("X-CSRF-Token") || "";
      window.__fetchLog.push({
        url: String(input),
        credentials: opts.credentials || "",
        method: String(opts.method || "GET").toUpperCase(),
        csrf,
      });
      return original.call(this, input, init);
    };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) {
        window.__pdfDownloads.push(this.download);
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
      if (url.pathname.startsWith("/api/frota/paradas.pdf")) {
        chamadas.push({
          t: Date.now(),
          method: req.method(),
          url: req.url(),
          headers: req.headers(),
          postData: req.postData() || "",
        });
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
          operacoes: [{ id: 7, nome: "Senador Canedo", ativa: true, padrao: true, qtd: 1, placas: [] }],
        });
        return;
      }
      if (url.pathname === "/api/frota/ao-vivo") {
        await responderJson(req, 200, {
          atualizado_em: "2026-10-28T14:00:00-03:00",
          veiculos: [{
            placa: "ABC1D23",
            descricao: "Basculante",
            status: "movimento",
            velocidade: 22,
            ignicao: true,
            data_gps: "2026-10-28T14:00:00-03:00",
            minutos: 1,
          }],
        });
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
      if (url.pathname === "/api/frota/paradas.pdf/iniciar") {
        if (modo === "erro400post") {
          await responderJson(req, 400, { ok: false, erro: "Turno inválido para o PDF." });
          return;
        }
        await responderJson(req, 200, { ok: true, job_id: "job-1" });
        return;
      }
      if (url.pathname === "/api/frota/paradas.pdf/andamento") {
        polls += 1;
        if (modo === "frota" && polls > 1) {
          await responderJson(req, 200, { ok: true, pronto: true, progresso: 100, msg: "PDF pronto.", erro: null });
          return;
        }
        await responderJson(req, 200, { ok: true, pronto: false, progresso: 35, msg: "Consultando paradas e telemetria.", erro: null });
        return;
      }
      if (url.pathname === "/api/frota/paradas.pdf/baixar") {
        await responderPdf(req, "paradas-Todas-2026-10-21-diurno.pdf");
        return;
      }
      if (url.pathname === "/api/frota/paradas.pdf") {
        if (modo === "erro400") {
          await new Promise((r) => setTimeout(r, 300));
          await responderJson(req, 400, { ok: false, erro: "Informe a data do turno." });
          return;
        }
        if (modo === "erro403") {
          await responderJson(req, 403, { ok: false, erro: "segredo que não deve aparecer" });
          return;
        }
        if (modo === "um") await new Promise((r) => setTimeout(r, 400));
        const nome = modo === "tel"
          ? "paradas-ABC-1D23-2026-10-21-noturno.pdf"
          : modo === "vivo"
            ? "paradas-ABC-1D23-hoje.pdf"
            : "paradas-ABC-1D23-2026-10-21-diurno.pdf";
        await responderPdf(req, nome);
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
    const placa = document.getElementById("frota-par-placa");
    return op && op.value === "7" && placa && [...placa.options].some((o) => o.value === "ABC1D23");
  });

  async function limpar() {
    polls = 0;
    chamadas.length = 0;
    await page.evaluate(() => {
      window.__pdfDownloads.length = 0;
      window.__fetchLog.length = 0;
    });
  }

  async function abrirParadas() {
    const info = await page.evaluate(() => {
      const btn = document.querySelector('#aba-frota button[data-vista="paradas"]');
      if (btn) btn.click();
      const ativo = document.querySelector('#aba-frota .vistas button.ativo');
      return {
        pagina: document.body.dataset.pagina,
        hidden: document.getElementById("aba-frota").hidden,
        ativo: ativo && ativo.dataset.vista,
        temBotao: !!btn,
      };
    });
    if (!info || info.ativo !== "paradas") throw new Error("não abriu paradas: " + JSON.stringify(info) + " erros=" + erros.join(" | "));
  }

  async function definirFiltros(placa, fora) {
    await page.evaluate((args) => {
      document.getElementById("frota-par-data").value = "2026-10-21";
      document.getElementById("frota-par-turno").value = "diurno";
      document.getElementById("frota-par-placa").value = args.placa;
      document.getElementById("frota-par-min").value = "8";
      document.getElementById("frota-par-max").value = "40";
      document.getElementById("frota-par-fora").checked = args.fora;
    }, { placa, fora });
  }

  function pdfs() {
    return chamadas.filter((c) => new URL(c.url).pathname.startsWith("/api/frota/paradas.pdf"));
  }

  await abrirParadas();
  await definirFiltros("ABC1D23", true);
  await limpar();
  modo = "um";
  const viuGerando = page.waitForFunction(() => document.getElementById("btn-frota-pdf").textContent === "Gerando PDF...");
  await page.click("#btn-frota-pdf");
  await viuGerando;
  await page.waitForFunction(() => window.__pdfDownloads.length === 1);
  const um = pdfs();
  assert.equal(um.length, 1);
  assert.equal(um[0].method, "GET");
  const qUm = new URL(um[0].url).searchParams;
  assert.equal(qUm.get("placa"), "ABC1D23");
  assert.equal(qUm.get("data"), "2026-10-21");
  assert.equal(qUm.get("turno"), "diurno");
  assert.equal(qUm.get("min"), "8");
  assert.equal(qUm.get("max"), "40");
  assert.equal(qUm.get("so_fora_da_rota"), "1");
  assert.equal(qUm.get("operacao"), "7");
  assert.equal(um[0].headers["x-csrf-token"], undefined);
  const logUm = await page.evaluate(() => window.__fetchLog.filter((item) => item.url.includes("/api/frota/paradas.pdf")));
  assert.equal(logUm.length, 1);
  assert.equal(logUm[0].credentials, "include");
  assert.equal(logUm[0].method, "GET");
  assert.deepEqual(await page.evaluate(() => window.__pdfDownloads.slice()), ["paradas-ABC-1D23-2026-10-21-diurno.pdf"]);
  assert.equal(await page.$eval("#btn-frota-pdf", (el) => el.textContent), "Baixar PDF");
  assert.equal(await page.$eval("#btn-frota-pdf", (el) => el.disabled), false);
  assert.equal(await page.$eval("#frota-par-estado", (el) => el.textContent), "PDF gerado.");

  await definirFiltros("", true);
  await limpar();
  modo = "frota";
  await page.click("#btn-frota-pdf");
  await page.waitForFunction(() => {
    const msg = document.getElementById("frota-par-pdf-msg");
    return msg && msg.textContent.includes("Consultando paradas e telemetria");
  });
  assert.equal(await page.$eval("#frota-par-pdf-fill", (el) => el.style.width), "35%");
  assert.equal(await page.$eval("#btn-frota-pdf", (el) => el.textContent), "Gerando PDF...");
  assert.equal(await page.$eval("#btn-frota-pdf-cancelar", (el) => el.hidden), false);
  await page.waitForFunction(() => window.__pdfDownloads.length === 1, { timeout: 8000 });
  const posts = pdfs().filter((c) => c.method === "POST");
  assert.equal(posts.length, 1);
  assert.equal(posts[0].headers["x-csrf-token"], "csrf-teste");
  const corpo = JSON.parse(posts[0].postData);
  assert.equal(corpo.data, "2026-10-21");
  assert.equal(corpo.turno, "diurno");
  assert.equal(corpo.min, "8");
  assert.equal(corpo.max, "40");
  assert.equal(corpo.so_fora_da_rota, "1");
  assert.equal(corpo.operacao, "7");
  assert.equal(Object.prototype.hasOwnProperty.call(corpo, "placa"), false);
  const qPost = new URL(posts[0].url).searchParams;
  assert.equal(qPost.get("data"), "2026-10-21");
  assert.equal(qPost.get("turno"), "diurno");
  assert.equal(qPost.get("min"), "8");
  assert.equal(qPost.get("max"), "40");
  assert.equal(qPost.get("so_fora_da_rota"), "1");
  assert.equal(qPost.get("operacao"), "7");
  assert.equal(qPost.get("placa"), null);
  const logPost = await page.evaluate(() => window.__fetchLog.find((item) => item.url.includes("/iniciar")));
  assert.equal(logPost.credentials, "include");
  assert.equal(logPost.method, "POST");
  assert.equal(logPost.csrf, "csrf-teste");
  const andamentos = pdfs().filter((c) => new URL(c.url).pathname.endsWith("/andamento"));
  assert.equal(andamentos.length, 2);
  assert.ok(andamentos[1].t - andamentos[0].t >= 2800, String(andamentos[1].t - andamentos[0].t));
  assert.ok(andamentos[1].t - andamentos[0].t < 4500, String(andamentos[1].t - andamentos[0].t));
  assert.equal(new URL(andamentos[0].url).searchParams.get("job_id"), "job-1");
  assert.deepEqual(await page.evaluate(() => window.__pdfDownloads.slice()), ["paradas-Todas-2026-10-21-diurno.pdf"]);
  assert.equal(await page.$eval("#frota-par-estado", (el) => el.textContent), "PDF gerado.");
  assert.equal(await page.$eval("#frota-par-pdf", (el) => el.hidden), true);
  assert.equal(await page.$eval("#btn-frota-pdf-cancelar", (el) => el.hidden), true);

  await limpar();
  modo = "cancelar";
  await page.click("#btn-frota-pdf");
  await page.waitForFunction(() => document.getElementById("frota-par-pdf-msg").textContent.includes("Consultando"));
  await page.click("#btn-frota-pdf-cancelar");
  await new Promise((r) => setTimeout(r, 3500));
  assert.equal(pdfs().filter((c) => new URL(c.url).pathname.endsWith("/andamento")).length, 1);
  assert.equal(pdfs().some((c) => new URL(c.url).pathname.endsWith("/baixar")), false);
  assert.deepEqual(await page.evaluate(() => window.__pdfDownloads.slice()), []);
  assert.equal(await page.$eval("#btn-frota-pdf", (el) => el.textContent), "Baixar PDF");
  assert.equal(await page.$eval("#btn-frota-pdf", (el) => el.disabled), false);
  assert.equal(await page.$eval("#frota-par-pdf", (el) => el.hidden), true);
  assert.equal(await page.$eval("#frota-par-estado", (el) => el.textContent), "Download cancelado.");

  await limpar();
  modo = "sair";
  await page.click("#btn-frota-pdf");
  await page.waitForFunction(() => document.getElementById("frota-par-pdf-msg").textContent.includes("Consultando"));
  await page.click('#aba-frota button[data-vista="telemetria"]');
  await new Promise((r) => setTimeout(r, 3500));
  assert.equal(pdfs().filter((c) => new URL(c.url).pathname.endsWith("/andamento")).length, 1);
  assert.equal(pdfs().some((c) => new URL(c.url).pathname.endsWith("/baixar")), false);
  assert.deepEqual(await page.evaluate(() => window.__pdfDownloads.slice()), []);
  await abrirParadas();
  assert.equal(await page.$eval("#frota-par-pdf", (el) => el.hidden), true);
  assert.equal(await page.$eval("#btn-frota-pdf", (el) => el.disabled), false);

  await definirFiltros("ABC1D23", false);
  await limpar();
  modo = "erro400";
  const viuGerandoErro = page.waitForFunction(() => document.getElementById("btn-frota-pdf").textContent === "Gerando PDF...");
  await page.click("#btn-frota-pdf");
  await viuGerandoErro;
  await page.waitForFunction(() => document.getElementById("frota-par-estado").textContent === "Informe a data do turno.");
  assert.equal(await page.$eval("#frota-par-estado", (el) => el.classList.contains("aud-alerta")), true);
  assert.equal(await page.$eval("#btn-frota-pdf", (el) => el.textContent), "Baixar PDF");
  assert.equal(await page.$eval("#btn-frota-pdf", (el) => el.disabled), false);
  assert.deepEqual(await page.evaluate(() => window.__pdfDownloads.slice()), []);
  const qErro = new URL(pdfs()[0].url).searchParams;
  assert.equal(qErro.get("so_fora_da_rota"), null);
  assert.equal(qErro.get("placa"), "ABC1D23");

  await definirFiltros("", false);
  await limpar();
  modo = "erro400post";
  await page.click("#btn-frota-pdf");
  await page.waitForFunction(() => document.getElementById("frota-par-estado").textContent === "Turno inválido para o PDF.");
  assert.equal(pdfs().some((c) => new URL(c.url).pathname.endsWith("/andamento")), false);
  assert.equal(await page.$eval("#btn-frota-pdf", (el) => el.disabled), false);
  assert.equal(await page.$eval("#frota-par-pdf", (el) => el.hidden), true);

  await page.evaluate(() => document.querySelector('#aba-frota button[data-vista="telemetria"]').click());
  await page.evaluate(() => {
    document.getElementById("frota-tel-placa").value = "ABC1D23";
    document.getElementById("frota-tel-data").value = "2026-10-21";
    document.getElementById("frota-tel-turno").value = "noturno";
  });
  await limpar();
  modo = "tel";
  await page.evaluate(() => document.getElementById("btn-frota-tel-pdf").click());
  await new Promise((r) => setTimeout(r, 800));
  const telEstado = await page.evaluate(() => ({
    ativo: document.querySelector("#aba-frota .vistas button.ativo").dataset.vista,
    estado: document.getElementById("frota-tel-estado").textContent,
    placa: document.getElementById("frota-tel-placa").value,
    data: document.getElementById("frota-tel-data").value,
    turno: document.getElementById("frota-tel-turno").value,
    downloads: window.__pdfDownloads.slice(),
    log: window.__fetchLog.filter((item) => item.url.includes("paradas.pdf")),
  }));
  if (!telEstado.downloads.length) throw new Error("telemetria sem pdf " + JSON.stringify(telEstado));
  const tel = pdfs();
  assert.equal(tel.length, 1);
  assert.equal(tel[0].method, "GET");
  const qTel = new URL(tel[0].url).searchParams;
  assert.equal(qTel.get("placa"), "ABC1D23");
  assert.equal(qTel.get("data"), "2026-10-21");
  assert.equal(qTel.get("turno"), "noturno");
  assert.equal(qTel.get("operacao"), "7");
  assert.equal(qTel.get("min"), null);
  assert.deepEqual(await page.evaluate(() => window.__pdfDownloads.slice()), ["paradas-ABC-1D23-2026-10-21-noturno.pdf"]);
  assert.equal(await page.$eval("#btn-frota-tel-pdf", (el) => el.textContent), "PDF das paradas do dia");

  await page.evaluate(() => document.querySelector('#aba-frota button[data-vista="vivo"]').click());
  await page.waitForFunction(() => document.querySelector(".frota-pdf-dia"));
  const esperado = await page.evaluate(() => turnoOperacional(new Date()));
  await limpar();
  modo = "vivo";
  await page.evaluate(() => document.querySelector(".frota-pdf-dia").click());
  await page.waitForFunction(() => window.__pdfDownloads.length === 1);
  const vivo = pdfs();
  assert.equal(vivo.length, 1);
  const qVivo = new URL(vivo[0].url).searchParams;
  assert.equal(qVivo.get("placa"), "ABC1D23");
  assert.equal(qVivo.get("data"), esperado.data);
  assert.equal(qVivo.get("turno"), esperado.turno);
  assert.equal(qVivo.get("operacao"), "7");
  assert.deepEqual(await page.evaluate(() => window.__pdfDownloads.slice()), ["paradas-ABC-1D23-hoje.pdf"]);
  assert.equal(await page.$eval(".frota-pdf-dia", (el) => el.textContent), "PDF do dia");

  await page.setViewport({ width: 390, height: 844, hasTouch: true });
  await page.evaluate(() => mostrarAba("frota"));
  await abrirParadas();
  const medidasPar = await page.evaluate(() => {
    const caixa = (el) => {
      const r = el.getBoundingClientRect();
      return { h: r.height, w: r.width, direita: r.right, esquerda: r.left };
    };
    return {
      largura: window.innerWidth,
      pdf: caixa(document.getElementById("btn-frota-pdf")),
      csv: caixa(document.getElementById("btn-frota-csv")),
    };
  });
  await page.evaluate(() => document.querySelector('#aba-frota button[data-vista="telemetria"]').click());
  const medidasTel = await page.evaluate(() => {
    const r = document.getElementById("btn-frota-tel-pdf").getBoundingClientRect();
    return { h: r.height, w: r.width, direita: r.right, esquerda: r.left, largura: window.innerWidth };
  });
  for (const item of [medidasPar.pdf, medidasPar.csv, medidasTel]) {
    const largura = item.largura || medidasPar.largura;
    assert.ok(item.h >= 44, JSON.stringify(item));
    assert.ok(item.w > 0, JSON.stringify(item));
    assert.ok(item.esquerda >= 0, JSON.stringify(item));
    assert.ok(item.direita <= largura + 1, JSON.stringify(item));
  }
  await page.evaluate(() => document.querySelector('#aba-frota button[data-vista="vivo"]').click());
  await page.waitForFunction(() => document.querySelector(".frota-pdf-dia"));
  const dia = await page.evaluate(() => {
    const r = document.querySelector(".frota-pdf-dia").getBoundingClientRect();
    return { h: r.height, w: r.width, direita: r.right, largura: window.innerWidth };
  });
  assert.ok(dia.h >= 44, JSON.stringify(dia));
  assert.ok(dia.direita <= dia.largura + 1, JSON.stringify(dia));

  await abrirParadas();
  await definirFiltros("ABC1D23", false);
  await limpar();
  modo = "erro403";
  await page.evaluate(() => document.getElementById("btn-frota-pdf").click());
  await page.waitForFunction(() => {
    const aviso = document.getElementById("aviso-restrito");
    return aviso && !aviso.hidden && aviso.textContent === "Acesso restrito ao administrador";
  });
  assert.equal(await page.evaluate(() => document.body.dataset.pagina), "vivo");
  assert.equal(await page.evaluate(() => document.body.textContent.includes("segredo que não deve aparecer")), false);
  assert.deepEqual(await page.evaluate(() => window.__pdfDownloads.slice()), []);

  const graves = erros.filter((texto) => !/Failed to load resource/i.test(texto));
  assert.deepEqual(graves, []);
  console.log("frota-pdf ok");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
