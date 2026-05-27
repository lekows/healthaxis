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

// ── Texto de exame de amostra (formato Sabin) ─────────────────────────────────
const SAMPLE_EXAM = `
SABIN MEDICINA DIAGNÓSTICA
Paciente: João da Silva | Sexo: M | Idade: 75 anos
Data de coleta: 21/03/2026 | Data de emissão: 22/03/2026

=== LIPÍDIOS ===
Colesterol Total         182    mg/dL    Referência: < 200
LDL Colesterol           131    mg/dL    Referência: < 130  ** ALTERADO **
HDL Colesterol            43    mg/dL    Referência: > 40
Triglicerídeos           148    mg/dL    Referência: < 150
VLDL                      30    mg/dL    Referência: < 30

=== GLICEMIA ===
Glicemia em Jejum         98    mg/dL    Referência: 70 - 99
Hemoglobina Glicada      5.8    %        Referência: < 5.7  ** ALTERADO **

=== HEMOGRAMA COMPLETO ===
Hemoglobina             14.2    g/dL     Referência: 13.5 - 17.5
Hematócrito             42.1    %        Referência: 41.0 - 53.0
Leucócitos              6.800   /mm³     Referência: 4.000 - 11.000
Plaquetas               210.000 /mm³     Referência: 150.000 - 400.000
VCM                      88.4   fL       Referência: 80.0 - 100.0
HCM                      29.8   pg       Referência: 27.0 - 33.0
CHCM                     33.7   g/dL     Referência: 31.5 - 36.0

=== FUNÇÃO RENAL ===
Creatinina               1.10   mg/dL    Referência: 0.70 - 1.20
Ureia                    38     mg/dL    Referência: 15 - 45
Ácido Úrico              6.2    mg/dL    Referência: 3.5 - 7.2

=== FUNÇÃO HEPÁTICA ===
TGO (AST)                28     U/L      Referência: até 40
TGP (ALT)                32     U/L      Referência: até 41
Gama GT                  42     U/L      Referência: até 61
Fosfatase Alcalina        87     U/L      Referência: 40 - 130
Bilirrubina Total         0.8    mg/dL    Referência: 0.3 - 1.2

=== TIREOIDE ===
TSH                      2.45   mUI/L    Referência: 0.40 - 4.00
T4 Livre                 1.12   ng/dL    Referência: 0.80 - 1.80

=== VITAMINAS E MINERAIS ===
Vitamina D (25-OH)        22.4   ng/mL    Referência: 30 - 100  ** ALTERADO **
Vitamina B12             310     pg/mL    Referência: 200 - 900
Ferritina                 68     ng/mL    Referência: 22 - 322
Ferro Sérico              88     mcg/dL   Referência: 59 - 158
`;

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes("--json");
  const useSample = args.includes("--sample");
  const urlIdx = args.indexOf("--url");
  const urlArg = urlIdx !== -1 ? args[urlIdx + 1] : null;
  const pdfPath = args.find(a => !a.startsWith("--") && a !== urlArg);

  if (!useSample && !urlArg && !pdfPath) {
    console.error("Uso:");
    console.error("  node scripts/test-extract.mjs --sample              (exame de amostra)");
    console.error("  node scripts/test-extract.mjs <caminho-do-pdf>      (arquivo local)");
    console.error("  node scripts/test-extract.mjs --url <url>           (URL pública)");
    console.error("  Adicione --json para saída apenas em JSON");
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
    const headers = {};
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      headers["apikey"] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      headers["Authorization"] = `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
    }
    const res = await fetch(urlArg, { headers });
    if (!res.ok) {
      console.error(`❌ Falha ao baixar: ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    const arrayBuf = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
    fileName = basename(new URL(urlArg).pathname) || "exame.pdf";
  } else if (!useSample) {
    const absPath = resolve(pdfPath);
    if (!existsSync(absPath)) {
      console.error(`❌ Arquivo não encontrado: ${absPath}`);
      process.exit(1);
    }
    buffer = readFileSync(absPath);
    fileName = basename(absPath);
  }

  const client = new Anthropic();
  let responseText = "";

  // Modo --sample: pula o PDF e usa o texto de amostra diretamente
  if (useSample) {
    if (!jsonOnly) console.log("\n🧪 Usando exame de amostra (Sabin — 22 parâmetros)");
    if (!jsonOnly) console.log("🤖 Chamando Claude Haiku...\n");

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: "user", content: `${PROMPT}\n\n---\n\n${SAMPLE_EXAM}` }],
    });
    const block = msg.content[0];
    responseText = block.type === "text" ? block.text : "";

    if (!jsonOnly) {
      const usage = msg.usage;
      console.log(`💰 Tokens: ${usage.input_tokens} entrada + ${usage.output_tokens} saída`);
      const cost = ((usage.input_tokens * 1 + usage.output_tokens * 5) / 1_000_000).toFixed(5);
      console.log(`   Custo estimado: US$ ${cost}\n`);
    }

    const resultados = parseResponse(responseText);
    if (jsonOnly) { console.log(JSON.stringify({ resultados }, null, 2)); return; }
    if (resultados.length === 0) { console.log("⚠️  Nenhum parâmetro extraído.\n" + responseText); return; }
    printTable(resultados);
    const alterados = resultados.filter(r => r.alterado).length;
    console.log(`\n📊 Total: ${resultados.length} parâmetros | ${alterados} alterados\n`);
    const outputDir = new URL("./output", import.meta.url).pathname;
    mkdirSync(outputDir, { recursive: true });
    const outFile = `${outputDir}/sample-${Date.now()}.json`;
    writeFileSync(outFile, JSON.stringify({ resultados }, null, 2), "utf8");
    console.log(`📋 JSON salvo em: scripts/output/${basename(outFile)}\n`);
    return;
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
