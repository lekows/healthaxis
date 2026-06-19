import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// Laudos grandes geram respostas longas — janela generosa para não cortar no meio do JSON.
// salvageObjects() recupera objetos completos mesmo se a resposta for truncada.
export const maxDuration = 120;

// 8192 truncava respostas de laudos Sabin de 49 páginas com histórico extenso.
// 12000 é o ponto de equilíbrio: cobre ~50 biomarcadores com histórico sem timeout.
const MAX_OUTPUT_TOKENS = 12000;

const IDENTIFIER_PROMPT = `Extraia tambem identificador_externo: { tipo: string, valor: string } quando houver
OS, ordem de servico, pedido, protocolo, atendimento, accession number ou numero do laudo.
Para exames Sabin, priorize o numero da OS. Use null quando nao houver um identificador confiavel.`;

const SYSTEM = `Você é um extrator de resultados de exames laboratoriais.
Retorne SOMENTE um objeto JSON válido, sem markdown, sem texto adicional.
Use ponto como separador decimal.`;

const PROMPT_BASE = `Extraia TODOS os resultados numéricos presentes neste exame laboratorial.

Para cada parâmetro encontrado, retorne:
- slug: identificador em minúsculas com hífens. Use EXATAMENTE estes slugs canônicos quando o biomarcador for reconhecido:
  hemograma: hemoglobina, hematocrito, hemacias, leucocitos, neutrofilos, linfocitos, monocitos, eosinofilos, basofilos, plaquetas, vcm, hcm, chcm, rdw, reticulocitos
  lipídios: colesterol-total, ldl-colesterol, hdl-colesterol, triglicerides, vldl
  glicemia: glicose, hemoglobina-glicada, insulina
  tireoide: tsh, t4-livre, t3-livre, anti-tpo
  vitaminas: vitamina-d, vitamina-b12, acido-folico
  ferro: ferritina, ferro-serico, tibc, saturacao-transferrina
  oximetria: saturacao-oxigenio (SpO2 / oximetria de pulso / saturação periférica — NÃO confundir com saturacao-transferrina)
  função renal: creatinina, ureia, acido-urico
  função hepática: ast-tgo, alt-tgp, ggt, fosfatase-alcalina, bilirrubina-total, bilirrubina-direta, albumina, proteinas-totais
  eletrólitos: sodio, potassio, calcio, magnesio, fosforo, cloro
  coagulação: tempo-protrombina, inr, ttpa, fibrinogenio, d-dimero
  inflamação: proteina-c-reativa, vhs
  hormônios: cortisol, testosterona-total, estradiol, progesterona, fsh, lh, prolactina
  Para biomarcadores não listados, crie slug descritivo em minúsculas com hífens (ex: "25-oh-vitamina-d3")
- nome: nome completo como aparece no exame
- valor: valor numérico do resultado (use ponto como decimal)
- unidade: unidade de medida (ex: "mg/dL", "g/dL", "mUI/L", "%")
- categoria: classifique em uma dessas opções: Lipídios | Glicemia | Tireoide | Hemograma | Vitaminas | Função Renal | Função Hepática | Coagulação | Hormônios | Inflamação | Outros
- ref_min: valor mínimo da faixa de referência do laboratório (null se não disponível no documento)
- ref_max: valor máximo da faixa de referência do laboratório (null se não disponível no documento)
- alterado: compare NUMERICAMENTE valor com ref_min e ref_max; true SOMENTE se valor < ref_min OU valor > ref_max; false se dentro do intervalo ou se ref_min/ref_max forem null
- ATENÇÃO para hemogramas com tabelas de % e contagem absoluta (/mm³ ou /µL): extraia sempre o par consistente (valor e referência na MESMA unidade). Para leucócitos use a contagem absoluta; para diferencial (segmentados, linfócitos, monócitos etc.) use os %, pois são o valor primário reportado
- historico: se o documento contiver tabela comparativa (ex: "LAUDO COMPARATIVO" com colunas de datas) ou gráficos com valores anteriores, extraia até 5 resultados anteriores no formato [{ "data": "YYYY-MM-DD", "valor": number }]. Na tabela comparativa, cada coluna é uma data e cada linha um parâmetro — associe o valor de cada coluna à data do cabeçalho daquela coluna; ignore células com "--". Use o 1º dia do mês quando a data for só mês/ano (ex: "Out/24" → "2024-10-01"). Array vazio [] se não houver histórico.

Inclua absolutamente todos os parâmetros com resultado numérico. Não omita nenhum.

Além dos resultados, extraia também (se presentes no documento):
- medico_solicitante: { nome: string, crm: string | null, crm_uf: string | null }
  IMPORTANTE: extrair o médico SOLICITANTE (quem pediu o exame ao paciente), NÃO o responsável técnico do laboratório.
  crm e crm_uf podem ser null se não encontrados no documento.
- laboratorio: { nome: string } — nome do laboratório (null se não encontrado)
- data_exame: data do exame no formato "YYYY-MM-DD" (null se não encontrada)
- paciente: { nome: string } — nome completo do paciente como aparece no exame (null se não encontrado)

Retorne SOMENTE um objeto JSON válido, sem markdown, sem texto adicional.`;

export type OCRResultado = {
  slug: string;
  nome: string;
  valor: number;
  unidade: string;
  categoria: string;
  ref_min: number | null;
  ref_max: number | null;
  alterado: boolean;
  historico?: { data: string; valor: number }[];
};

export type OCRMedico = { nome: string; crm: string | null; crm_uf: string | null };

export type OCRExamData = {
  resultados: OCRResultado[];
  medico_solicitante: OCRMedico | null;
  laboratorio: { nome: string } | null;
  identificador_externo: { tipo: string; valor: string } | null;
  data_exame: string | null;
  paciente: { nome: string } | null;
};

function extractKnownExternalIdentifier(text: string): { tipo: string; valor: string } | null {
  const patterns: { tipo: string; regex: RegExp }[] = [
    { tipo: "OS", regex: /\bOS\s*[:#-]?\s*([0-9]+(?:-[0-9]+){2})/i },
    { tipo: "pedido", regex: /\bpedido\s*[:#-]\s*([A-Z0-9][A-Z0-9./-]{3,})/i },
    { tipo: "protocolo", regex: /\bprotocolo\s*[:#-]\s*([A-Z0-9][A-Z0-9./-]{3,})/i },
    { tipo: "accession", regex: /\baccession(?:\s+number)?\s*[:#-]\s*([A-Z0-9][A-Z0-9./-]{3,})/i },
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) return { tipo: pattern.tipo, valor: match[1] };
  }
  return null;
}

// Recupera objetos {…} de nível superior de um array JSON possivelmente truncado
// (quando a resposta do Claude excede max_tokens e o JSON fica incompleto no fim).
function salvageObjects(arrText: string): unknown[] {
  const objs: unknown[] = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < arrText.length; i++) {
    const c = arrText[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") { if (depth === 0) start = i; depth++; }
    else if (c === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        try { objs.push(JSON.parse(arrText.slice(start, i + 1))); } catch { /* objeto cortado no fim */ }
        start = -1;
      }
    }
  }
  return objs;
}

function parseResponse(text: string): OCRExamData {
  const empty: OCRExamData = { resultados: [], medico_solicitante: null, laboratorio: null, identificador_externo: null, data_exame: null, paciente: null };
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.log("[extract-exam] parseResponse: nenhum JSON encontrado no texto:", text.substring(0, 300));
    return empty;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    // Resposta truncada (output excedeu max_tokens) — recupera os biomarcadores completos.
    const key = text.indexOf('"resultados"');
    const arrStart = key >= 0 ? text.indexOf("[", key) : -1;
    const salvaged = arrStart >= 0 ? salvageObjects(text.slice(arrStart)) : [];
    if (salvaged.length === 0) {
      console.log("[extract-exam] parseResponse: JSON truncado e nada recuperável");
      return empty;
    }
    console.log(`[extract-exam] parseResponse: JSON truncado, ${salvaged.length} resultados recuperados`);
    parsed = { resultados: salvaged };
  }

  const resultados = ((parsed.resultados as unknown[]) ?? [])
    .map((r: unknown) => {
      if (typeof r !== "object" || r === null) return null;
      const item = r as Record<string, unknown>;
      const valor = typeof item.valor === "number"
        ? item.valor
        : typeof item.valor === "string"
          ? parseFloat(item.valor)
          : null;
      if (typeof item.slug !== "string" || typeof item.nome !== "string" || valor === null || isNaN(valor)) return null;
      const historico = Array.isArray(item.historico)
        ? (item.historico as unknown[])
            .map((h) => {
              const hh = h as Record<string, unknown>;
              const v = typeof hh.valor === "number"
                ? hh.valor
                : typeof hh.valor === "string"
                  ? parseFloat(hh.valor.replace(",", "."))
                  : NaN;
              return typeof hh.data === "string" && !isNaN(v) ? { data: hh.data, valor: v } : null;
            })
            .filter((h): h is { data: string; valor: number } => h !== null)
            .slice(0, 5)
        : [];
      return { ...item, valor, historico } as OCRResultado;
    })
    .filter((r: OCRResultado | null): r is OCRResultado => r !== null);
  console.log("[extract-exam] resultados parseados:", resultados.length);

  const med = parsed.medico_solicitante as Record<string, unknown> | null | undefined;
  const medico = (med && typeof med.nome === "string" && med.nome.trim())
    ? { nome: med.nome.trim(), crm: (med.crm as string | null) ?? null, crm_uf: (med.crm_uf as string | null) ?? null }
    : null;
  const lab = parsed.laboratorio as { nome?: unknown } | null | undefined;
  const laboratorio = lab && typeof lab.nome === "string" ? { nome: lab.nome } : null;
  const external = parsed.identificador_externo as { tipo?: unknown; valor?: unknown } | null | undefined;
  const identificadorExterno = external && typeof external.tipo === "string" && typeof external.valor === "string"
    ? { tipo: external.tipo.trim(), valor: external.valor.trim() }
    : null;
  const dataExame = typeof parsed.data_exame === "string" ? parsed.data_exame : null;
  const pac = parsed.paciente as { nome?: unknown } | null | undefined;
  const paciente = pac && pac.nome ? { nome: String(pac.nome).trim() } : null;
  return { resultados, medico_solicitante: medico, laboratorio, identificador_externo: identificadorExterno, data_exame: dataExame, paciente };
}

function cleanPdfText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[.\-–—=*_]{3,}$/gm, "")
    .trim();
}

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const { createRequire } = await import("module");
    const _require = createRequire(import.meta.url);
    const { PDFParse } = _require("pdf-parse") as typeof import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const cleaned = cleanPdfText(result.text ?? "");
    return cleaned.length > 200 ? cleaned : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // documentId is set inside the try once the form is parsed.
  // bump/finalizeExtraction are defined here so the catch block can call finalizeExtraction.
  let documentId: string | null = null;

  const bump = (progress: number, message: string) => {
    if (!documentId) return;
    supabase.from("documents").update({
      extraction_status: "processing",
      extraction_progress: progress,
      extraction_message: message,
    }).eq("id", documentId).eq("user_id", user.id).then(() => {});
  };

  const finalizeExtraction = async (success: boolean, errorMsg?: string) => {
    if (!documentId) return;
    if (success) {
      await supabase.from("documents").update({
        status: "reviewed",
        extraction_status: "processed",
        extraction_progress: 100,
        extraction_message: "Exame processado com sucesso.",
        extracted_at: new Date().toISOString(),
      }).eq("id", documentId).eq("user_id", user.id);
    } else {
      const { error: errUpd } = await supabase.from("documents").update({
        extraction_status: "error",
        extraction_error: errorMsg ?? "Erro desconhecido.",
      }).eq("id", documentId).eq("user_id", user.id);
      if (errUpd) console.error("[finalizeExtraction] update failed", errUpd);
    }
  };

  try {
    const form = await req.formData();
    const pastedText = form.get("text") as string | null;
    const file = form.get("file") as File | null;
    // Laudos > 4.5 MB estouram o limite de body do Vercel se enviados crus. O arquivo
    // já está no Supabase Storage, então o cliente manda a URL e nós baixamos aqui.
    const fileUrl = form.get("file_url") as string | null;
    const fileType = form.get("file_type") as string | null;
    const fileName = form.get("file_name") as string | null;
    documentId = form.get("document_id") as string | null;

    if (!file && !pastedText && !fileUrl) return NextResponse.json({ error: "Arquivo ou texto ausente" }, { status: 400 });
    if (file && file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo muito grande (máx 8 MB)" }, { status: 413 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ resultados: [], ocr_error: "Serviço de análise não configurado." });
    }

    bump(5, "Iniciando análise…");

    // Texto colado pelo usuário — caminho direto, zero tokens de ruído de PDF
    if (pastedText && pastedText.trim().length > 10) {
      const client = new Anthropic();
      const truncated = pastedText.length > 12000 ? pastedText.substring(0, 12000) : pastedText;
      console.log(`[extract-exam] Texto colado (${pastedText.length} chars). Usando texto direto.`);
      bump(30, "Enviando para análise…");
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM,
        messages: [{ role: "user", content: `${PROMPT_BASE}\n\n${IDENTIFIER_PROMPT}\n\n---\n\n${truncated}` }],
      });
      const block = msg.content[0];
      const responseText = block.type === "text" ? block.text : "";
      bump(90, "Interpretando resultados…");
      const examData = parseResponse(responseText);
      await finalizeExtraction(true);
      return NextResponse.json({
        ...examData,
        identificador_externo: examData.identificador_externo ?? extractKnownExternalIdentifier(pastedText),
        _debug_raw: responseText.substring(0, 4000),
      });
    }

    const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    let buffer: Buffer;
    let isPDF: boolean;
    let imageMediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";

    if (fileUrl) {
      const ctrl = new AbortController();
      const storageTimeout = setTimeout(() => ctrl.abort(), 20000);
      let resp: Response;
      try {
        resp = await fetch(fileUrl, { signal: ctrl.signal });
      } catch {
        clearTimeout(storageTimeout);
        await finalizeExtraction(false, "Tempo limite ao baixar o arquivo.");
        return NextResponse.json({ resultados: [], ocr_error: "Tempo limite ao baixar o arquivo. Tente novamente." });
      }
      clearTimeout(storageTimeout);
      if (!resp.ok) {
        await finalizeExtraction(false, "Não foi possível baixar o arquivo.");
        return NextResponse.json({ resultados: [], ocr_error: "Não foi possível baixar o arquivo enviado." });
      }
      buffer = Buffer.from(await resp.arrayBuffer());
      isPDF = buffer.slice(0, 5).toString("ascii") === "%PDF-";
      if (!isPDF && fileType && imageTypes.includes(fileType)) imageMediaType = fileType as typeof imageMediaType;
    } else {
      buffer = Buffer.from(await file!.arrayBuffer());
      isPDF = buffer.slice(0, 5).toString("ascii") === "%PDF-";
      if (!isPDF && imageTypes.includes(file!.type)) imageMediaType = file!.type as typeof imageMediaType;
    }
    bump(20, "Arquivo recebido…");

    const client = new Anthropic();
    let responseText = "";
    let deterministicIdentifier = fileName ? extractKnownExternalIdentifier(fileName) : null;

    if (isPDF) {
      // Tenta extrair texto do PDF primeiro (muito mais barato)
      const pdfText = await extractPdfText(buffer);

      if (pdfText) {
        deterministicIdentifier = extractKnownExternalIdentifier(pdfText) ?? deterministicIdentifier;
        // Para laudos muito grandes (ex: Sabin 49 páginas ≈ 120k chars), a tabela comparativa
        // fica nas últimas páginas. Estratégia head+tail: primeiros 60k + últimos 25k chars,
        // cobrindo resultados e histórico sem estourar o timeout do gateway (504).
        const LIMIT = 85000;
        const truncated = pdfText.length > LIMIT
          ? pdfText.substring(0, 60000) + "\n\n[...]\n\n" + pdfText.substring(pdfText.length - 25000)
          : pdfText;
        console.log(`[extract-exam] PDF digital (${pdfText.length} chars → ${truncated.length} enviados). Usando texto.`);
        bump(35, "Enviando para análise…");
        const msg = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: MAX_OUTPUT_TOKENS,
          system: SYSTEM,
          messages: [{
            role: "user",
            content: `${PROMPT_BASE}\n\n${IDENTIFIER_PROMPT}\n\n---\n\n${truncated}`,
          }],
        });
        const block = msg.content[0];
        responseText = block.type === "text" ? block.text : "";
      } else {
        // PDF escaneado — envia como documento via beta
        console.log("[extract-exam] PDF escaneado. Usando visão.");
        bump(28, "Enviando PDF para visão computacional…");
        const base64 = buffer.toString("base64");
        const msg = await client.beta.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: MAX_OUTPUT_TOKENS,
          betas: ["pdfs-2024-09-25"],
          system: SYSTEM,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
              { type: "text", text: `${PROMPT_BASE}\n\n${IDENTIFIER_PROMPT}` },
            ],
          }],
        });
        const block = msg.content[0];
        responseText = block.type === "text" ? block.text : "";
      }
    } else {
      // Imagem (JPG, PNG, WebP)
      bump(28, "Enviando imagem para análise…");
      const base64 = buffer.toString("base64");
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: imageMediaType, data: base64 } },
            { type: "text", text: `${PROMPT_BASE}\n\n${IDENTIFIER_PROMPT}` },
          ],
        }],
      });
      const block = msg.content[0];
      responseText = block.type === "text" ? block.text : "";
    }

    bump(90, "Interpretando resultados…");
    console.log("[extract-exam] responseText (primeiros 800 chars):", responseText.substring(0, 800));
    const examData = parseResponse(responseText);
    console.log("[extract-exam] examData final:", JSON.stringify({ resultados: examData.resultados.length, medico: examData.medico_solicitante?.nome, data: examData.data_exame }));
    await finalizeExtraction(true);
    return NextResponse.json({
      ...examData,
      identificador_externo: deterministicIdentifier ?? examData.identificador_externo,
      _debug_raw: responseText.substring(0, 4000),
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[extract-exam]", raw);
    const isRateLimit = raw.includes("rate_limit") || raw.includes("429");
    const msg = isRateLimit
      ? "Limite de requisições atingido. Aguarde 1 minuto e tente novamente."
      : raw;
    await finalizeExtraction(false, msg);
    return NextResponse.json({ resultados: [], ocr_error: msg });
  }
}
