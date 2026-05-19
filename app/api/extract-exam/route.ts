import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// Catálogo de slugs aceitos — espelha o CATALOG do modal
const SLUGS_PROMPT = `
ldl          → LDL Colesterol (mg/dL)
hdl          → HDL Colesterol (mg/dL)
triglycerides→ Triglicerídeos (mg/dL)
total-chol   → Colesterol Total (mg/dL)
glucose      → Glicemia em Jejum (mg/dL)
hba1c        → Hemoglobina Glicada (%)
tsh          → TSH (mUI/L)
t4-livre     → T4 Livre (ng/dL)
hemoglobin   → Hemoglobina (g/dL)
leukocytes   → Leucócitos (mil/mm³)
platelets    → Plaquetas (mil/mm³)
vitamin-d    → Vitamina D (ng/mL)
b12          → Vitamina B12 (pg/mL)
ferritin     → Ferritina (ng/mL)
creatinine   → Creatinina (mg/dL)
tgo          → TGO / AST (U/L)
tgp          → TGP / ALT (U/L)
`.trim();

const SYSTEM = `Você é um extrator de resultados de exames laboratoriais.
Retorne SOMENTE um objeto JSON válido, sem markdown, sem texto adicional.
Use ponto como separador decimal. Inclua apenas campos presentes no documento.`;

const USER = `Extraia os valores numéricos deste exame. Use os slugs abaixo:

${SLUGS_PROMPT}

Resposta (apenas JSON):
{"resultados":[{"slug":"ldl","valor":118},{"slug":"hdl","valor":62}]}`;

// Tipo de resposta
type Resultado = { slug: string; valor: number };

function parseResponse(text: string): Resultado[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return (parsed.resultados ?? []).filter(
      (r: unknown): r is Resultado =>
        typeof r === "object" && r !== null &&
        typeof (r as Resultado).slug === "string" &&
        typeof (r as Resultado).valor === "number"
    );
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  // Autenticação
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });

  // Limite de tamanho: 8 MB
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
      // PDFs: usa endpoint beta com suporte a documentos
      const msg = await client.beta.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
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
      // Imagens (JPG, PNG, WebP): vision padrão
      const mediaType = (
        ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)
          ? file.type
          : "image/jpeg"
      ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
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
    console.error("[extract-exam]", err);
    // Falha silenciosa: retorna lista vazia → modal continua funcional no modo manual
    return NextResponse.json({ resultados: [] });
  }
}
