import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

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

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ resultados: [], ocr_error: "GOOGLE_AI_API_KEY não configurada" });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const mimeType = (
    ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)
      ? file.type
      : "image/jpeg"
  ) as "application/pdf" | "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: PROMPT },
          ],
        },
      ],
    });

    const text = response.text ?? "";
    const resultados = parseResponse(text);
    return NextResponse.json({ resultados });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[extract-exam]", msg);
    return NextResponse.json({ resultados: [], ocr_error: msg });
  }
}
