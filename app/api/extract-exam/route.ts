import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const SYSTEM = `Você é um extrator de resultados de exames laboratoriais.
Retorne SOMENTE um objeto JSON válido, sem markdown, sem texto adicional.
Use ponto como separador decimal.`;

const PROMPT_BASE = `Extraia TODOS os resultados numéricos presentes neste exame laboratorial.

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

Além dos resultados, extraia também (se presentes no documento):
- medico_solicitante: { nome: string, crm: string | null, crm_uf: string | null }
  IMPORTANTE: extrair o médico SOLICITANTE (quem pediu o exame ao paciente), NÃO o responsável técnico do laboratório.
  crm e crm_uf podem ser null se não encontrados no documento.
- laboratorio: { nome: string } — nome do laboratório (null se não encontrado)
- data_exame: data do exame no formato "YYYY-MM-DD" (null se não encontrada)

Retorne SOMENTE um objeto JSON válido, sem markdown, sem texto adicional.

Resposta (apenas JSON):
{"resultados":[{"slug":"ldl-colesterol","nome":"LDL Colesterol","valor":131,"unidade":"mg/dL","categoria":"Lipídios","ref_min":0,"ref_max":130,"alterado":true}],"medico_solicitante":{"nome":"João Silva","crm":"12345","crm_uf":"SP"},"laboratorio":{"nome":"Fleury"},"data_exame":"2025-01-15"}`;

export type OCRResultado = {
  slug: string;
  nome: string;
  valor: number;
  unidade: string;
  categoria: string;
  ref_min: number | null;
  ref_max: number | null;
  alterado: boolean;
};

export type OCRMedico = { nome: string; crm: string | null; crm_uf: string | null };

export type OCRExamData = {
  resultados: OCRResultado[];
  medico_solicitante: OCRMedico | null;
  laboratorio: { nome: string } | null;
  data_exame: string | null;
};

function parseResponse(text: string): OCRExamData {
  const empty: OCRExamData = { resultados: [], medico_solicitante: null, laboratorio: null, data_exame: null };
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return empty;
  try {
    const parsed = JSON.parse(match[0]);
    const resultados = (parsed.resultados ?? []).filter(
      (r: unknown): r is OCRResultado =>
        typeof r === "object" && r !== null &&
        typeof (r as OCRResultado).slug === "string" &&
        typeof (r as OCRResultado).nome === "string" &&
        typeof (r as OCRResultado).valor === "number"
    );
    const med = parsed.medico_solicitante;
    const medico = (med && typeof med.nome === "string" && med.nome.trim())
      ? { nome: med.nome.trim(), crm: med.crm ?? null, crm_uf: med.crm_uf ?? null }
      : null;
    const lab = parsed.laboratorio?.nome ? { nome: parsed.laboratorio.nome } : null;
    const dataExame = typeof parsed.data_exame === "string" ? parsed.data_exame : null;
    return { resultados, medico_solicitante: medico, laboratorio: lab, data_exame: dataExame };
  } catch {
    return empty;
  }
}

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const { createRequire } = await import("module");
    const _require = createRequire(import.meta.url);
    const pdfParse = _require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    const text = data.text?.trim() ?? "";
    return text.length > 200 ? text : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande (máx 8 MB)" }, { status: 413 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ resultados: [], ocr_error: "Serviço de análise não configurado." });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const isPDF = file.type === "application/pdf";

  try {
    const client = new Anthropic();
    let responseText = "";

    if (isPDF) {
      // Tenta extrair texto do PDF primeiro (muito mais barato)
      const pdfText = await extractPdfText(buffer);

      if (pdfText) {
        // PDF digital com texto selecionável — envia só o texto
        console.log(`[extract-exam] PDF digital (${pdfText.length} chars). Usando texto.`);
        const msg = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: SYSTEM,
          messages: [{
            role: "user",
            content: `${PROMPT_BASE}\n\n---\n\n${pdfText}`,
          }],
        });
        const block = msg.content[0];
        responseText = block.type === "text" ? block.text : "";
      } else {
        // PDF escaneado — envia como documento via beta
        console.log("[extract-exam] PDF escaneado. Usando visão.");
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
              { type: "text", text: PROMPT_BASE },
            ],
          }],
        });
        const block = msg.content[0];
        responseText = block.type === "text" ? block.text : "";
      }
    } else {
      // Imagem (JPG, PNG, WebP)
      const base64 = buffer.toString("base64");
      const mediaType = (
        ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)
          ? file.type : "image/jpeg"
      ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: PROMPT_BASE },
          ],
        }],
      });
      const block = msg.content[0];
      responseText = block.type === "text" ? block.text : "";
    }

    const examData = parseResponse(responseText);
    return NextResponse.json(examData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[extract-exam]", msg);
    return NextResponse.json({ resultados: [], ocr_error: msg });
  }
}
