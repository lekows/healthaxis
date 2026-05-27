#!/usr/bin/env node
/**
 * Teste local do pipeline de extração de exames laboratoriais.
 *
 * Uso:
 *   node scripts/test-extract.mjs <caminho-do-pdf>
 *   node scripts/test-extract.mjs <caminho-do-pdf> --json    (só JSON, sem tabela)
 *
 * Exemplo:
 *   node scripts/test-extract.mjs ~/Downloads/exame-sabin.pdf
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { createRequire } from "module";
import { basename, resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// ── Carrega variáveis do .env.local ──────────────────────────────────────────
function loadEnv() {
  const envPath = new URL("../.env.local", import.meta.url).pathname;
  if (!existsSync(envPath)) {
    console.error("❌ Arquivo .env.local não encontrado.");
    process.exit(1);
  }
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key) process.env[key] = val;
    }
  }
}

// ── Prompt (mesmo da rota de produção) ───────────────────────────────────────
const SYSTEM = `Você é um extrator de resultados de exames laboratoriais.
Retorne SOMENTE um objeto JSON válido, sem markdown, sem texto adicional.
Use ponto como separador decimal.`;

const PROMPT = `Extraia TODOS os resultados numéricos presentes neste exame laboratorial.

Para cada parâmetro encontrado, retorne:
- slug: identificador em minúsculas com hífens (ex: "ldl-colesterol", "hemoglobina", "tsh", "vitamina-d")
- nome: nome completo como aparece no exame
- valor: valor numérico do resultado (use ponto como decimal)
- unidade: unidade de medida (ex: "mg/dL", "g/dL", "mUI/L", "%")
- categoria: classifique em uma dessas opções: Lipídios | Glicemia | Tireoide | Hemograma | Vitaminas | Função Renal | Função Hepática | Coagulação | Hormônios | Inflamação | Outros
- ref_min: valor mínimo da faixa de referência do laboratório (null se não disponível no documento)
- ref_max: valor máximo da faixa de referência do laboratório (null se não disponível no documento)
- alterado: true se o valor está fora da faixa de referência, false se está dentro

Inclua absolutamente todos os parâmetros com resultado numérico. Não omita nenhum.
Retorne SOMENTE um objeto JSON válido, sem markdown, sem texto adicional.

Resposta (apenas JSON):
{"resultados":[{"slug":"ldl-colesterol","nome":"LDL Colesterol","valor":131,"unidade":"mg/dL","categoria":"Lipídios","ref_min":0,"ref_max":130,"alterado":true}]}`;

// ── Parser da resposta ────────────────────────────────────────────────────────
function parseResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return (parsed.resultados ?? []).filter(
      r => typeof r === "object" && r !== null &&
           typeof r.slug === "string" &&
           typeof r.nome === "string" &&
           typeof r.valor === "number"
    );
  } catch {
    return [];
  }
}

// ── Tabela no terminal ────────────────────────────────────────────────────────
function printTable(resultados) {
  const COL = { nome: 32, valor: 8, unidade: 10, categoria: 20, status: 12 };
  const pad = (s, n) => String(s ?? "").slice(0, n).padEnd(n);
  const line = "─".repeat(Object.values(COL).reduce((a, b) => a + b + 3, 1));

  console.log("\n" + line);
  console.log(
    "│ " + pad("Parâmetro", COL.nome) +
    "│ " + pad("Valor", COL.valor) +
    "│ " + pad("Unidade", COL.unidade) +
    "│ " + pad("Categoria", COL.categoria) +
    "│ " + pad("Status", COL.status) + "│"
  );
  console.log(line);

  for (const r of resultados) {
    const status = r.alterado ? "⚠  ALTERADO" : "✅ normal";
    console.log(
      "│ " + pad(r.nome, COL.nome) +
      "│ " + pad(r.valor, COL.valor) +
      "│ " + pad(r.unidade, COL.unidade) +
      "│ " + pad(r.categoria, COL.categoria) +
      "│ " + pad(status, COL.status) + "│"
    );
  }
  console.log(line);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes("--json");
  const urlIdx = args.indexOf("--url");
  const urlArg = urlIdx !== -1 ? args[urlIdx + 1] : null;
  const pdfPath = args.find(a => !a.startsWith("--") && a !== urlArg);

  if (!urlArg && !pdfPath) {
    console.error("Uso:");
    console.error("  node scripts/test-extract.mjs <caminho-do-pdf> [--json]");
    console.error("  node scripts/test-extract.mjs --url <url-publica> [--json]");
    process.exit(1);
  }

  loadEnv();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY não encontrada no .env.local");
    process.exit(1);
  }

  let buffer;
  let fileName;

  if (urlArg) {
    if (!jsonOnly) console.log(`\n🌐 Baixando PDF de: ${urlArg}`);
    const res = await fetch(urlArg);
    if (!res.ok) {
      console.error(`❌ Falha ao baixar: ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    const arrayBuf = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
    fileName = basename(new URL(urlArg).pathname) || "exame.pdf";
  } else {
    const absPath = resolve(pdfPath);
    if (!existsSync(absPath)) {
      console.error(`❌ Arquivo não encontrado: ${absPath}`);
      process.exit(1);
    }
    buffer = readFileSync(absPath);
    fileName = basename(absPath);
  }

  const fileSizeKB = (buffer.length / 1024).toFixed(0);

  if (!jsonOnly) console.log(`\n📄 PDF: ${fileName} (${fileSizeKB} KB)`);

  // Tenta extrair texto do PDF
  let pdfText = null;
  try {
    const data = await pdfParse(buffer);
    const text = data.text?.trim() ?? "";
    if (text.length > 200) pdfText = text;
  } catch { /* PDF pode estar criptografado ou corrompido */ }

  const client = new Anthropic();
  let responseText = "";

  if (pdfText) {
    if (!jsonOnly) console.log(`✅ PDF digital detectado — extraindo texto (${pdfText.length} chars)`);
    if (!jsonOnly) console.log("🤖 Chamando Claude Haiku (modo texto — mais barato)...\n");

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: "user", content: `${PROMPT}\n\n---\n\n${pdfText}` }],
    });
    const block = msg.content[0];
    responseText = block.type === "text" ? block.text : "";

    if (!jsonOnly) {
      const usage = msg.usage;
      console.log(`💰 Tokens usados: ${usage.input_tokens} entrada + ${usage.output_tokens} saída`);
      const cost = ((usage.input_tokens * 1 + usage.output_tokens * 5) / 1_000_000).toFixed(5);
      console.log(`   Custo estimado: US$ ${cost} (Haiku 4.5)\n`);
    }
  } else {
    if (!jsonOnly) console.log("🔍 PDF escaneado detectado — usando visão (beta)...");
    if (!jsonOnly) console.log("🤖 Chamando Claude Haiku (modo visão)...\n");

    const base64 = buffer.toString("base64");
    const msg = await client.beta.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      betas: ["pdfs-2024-09-25"],
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: PROMPT },
        ],
      }],
    });
    const block = msg.content[0];
    responseText = block.type === "text" ? block.text : "";
  }

  const resultados = parseResponse(responseText);

  if (jsonOnly) {
    console.log(JSON.stringify({ resultados }, null, 2));
    return;
  }

  if (resultados.length === 0) {
    console.log("⚠️  Nenhum parâmetro extraído. Resposta bruta do modelo:");
    console.log(responseText);
    return;
  }

  printTable(resultados);

  const alterados = resultados.filter(r => r.alterado).length;
  console.log(`\n📊 Total: ${resultados.length} parâmetros extraídos | ${alterados} alterados\n`);

  // Salva JSON na pasta output/
  const outputDir = new URL("./output", import.meta.url).pathname;
  mkdirSync(outputDir, { recursive: true });
  const outFile = `${outputDir}/${fileName.replace(/\.pdf$/i, "")}-${Date.now()}.json`;
  writeFileSync(outFile, JSON.stringify({ resultados }, null, 2), "utf8");
  console.log(`📋 JSON completo salvo em: scripts/output/${basename(outFile)}\n`);
}

main().catch(err => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
