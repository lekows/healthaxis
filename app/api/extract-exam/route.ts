import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const SYSTEM = `Você é um extrator de resultados de exames laboratoriais.
Retorne SOMENTE um objeto JSON válido, sem markdown, sem texto adicional.
Use ponto como separador decimal.`;

const USER = `Extraia TODOS os resultados numéricos presentes neste exame laboratorial.

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

Resposta (apenas JSON):
{"resultados":[{"slug":"ldl-colesterol","nome":"LDL Colesterol","valor":131,"unidade":"mg/dL","categoria":"Lipídios","ref_min":0,"ref_max":130,"alterado":true},{"slug":"hdl-colesterol","nome":"HDL Colesterol","valor":43,"unidade":"mg/dL","categoria":"Lipídios","ref_min":40,"ref_max":null,"alterado":false}]}`;

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

function parseResponse(text: string): OCRResultado[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return (parsed.resultados ?? []).filter(
      (r: unknown): r is OCRResultado =>
        typeof r === "object" && r !== null &&
        typeof (r as OCRResultado).slug === "string" &&
        typeof (r as OCRResultado).nome === "string" &&
        typeof (r as OCRResultado).valor === "number"
    );
  } catch {
    return [];
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

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const isPDF = file.type === "application/pdf";

  const client = new Anthropic();

  try {
    let text = "";

    if (isPDF) {
      const msg = await client.beta.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        betas: ["pdfs-2024-09-25"],
        system: SYSTEM,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 }
            },
            { type: "text", text: USER }
          ]
        }]
      });
      const block = msg.content[0];
      text = block.type === "text" ? block.text : "";
    } else {
      const mediaType = (
        ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)
          ? file.type
          : "image/jpeg"
      ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: USER }
          ]
        }]
      });
      const block = msg.content[0];
      text = block.type === "text" ? block.text : "";
    }

    const resultados = parseResponse(text);
    return NextResponse.json({ resultados });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[extract-exam]", msg);
    return NextResponse.json({ resultados: [], ocr_error: msg });
  }
}
