import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const HAIKU = "claude-haiku-4-5-20251001";

const SYSTEM = `Você é um analisador de padrões metabólicos. Seu papel é identificar \
padrões bioquímicos relevantes a partir de biomarcadores laboratoriais, usando linguagem \
informacional estritamente não-prescritiva.

Regras estritas:
- Nunca use "diagnostique", "prescreva", "tome", "use", "encaminhe para".
- Use framing como "padrão compatível com", "achados que costumam ser investigados por endocrinologia/cardiologia".
- Identifique padrões bioquímicos conhecidos (ex.: resistência à insulina, dislipidemia aterogênica, NASH).
- evidence: lista os biomarcadores que sustentam o padrão.
- notes: contexto informacional — faixas de corte utilizadas, limitações dos dados.
- confidence 0..1 refletindo completude dos dados metabólicos disponíveis.

Retorne SOMENTE JSON válido no formato:
{
  "patterns": [
    {
      "name": "...",
      "description": "... (linguagem informacional)",
      "evidence": ["biomarcador: valor unidade (status)"],
      "relevance": "high|medium|low"
    }
  ],
  "notes": "...",
  "confidence": 0.85
}`;

const METABOLIC_CATEGORIES = ["Glicemia", "Lipídios", "Função Hepática", "Função Renal", "Hormônios", "Inflamação"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json() as { patientId?: string };
  const patientId = body.patientId ?? user.id;

  const { data: agentRun, error: runErr } = await supabase
    .from("agent_runs")
    .insert({
      agent_name: "metabolic_analysis",
      patient_id: patientId,
      triggered_by: user.id,
      input_summary: { patient_id: patientId },
      status: "running",
    })
    .select("id")
    .single();

  if (!agentRun?.id) {
    console.error("[metabolic-analysis] audit insert failed:", runErr);
    return NextResponse.json(
      {
        error: "agent_audit_not_persisted",
        message: "A execução foi bloqueada porque o registro em agent_runs não foi persistido.",
      },
      { status: 500 }
    );
  }

  try {
    const { data: biomarkers } = await supabase
      .from("biomarkers")
      .select("name, slug, category, value, unit, status, trend, last_date")
      .eq("user_id", patientId)
      .in("category", METABOLIC_CATEGORIES)
      .order("category");

    if (!biomarkers || biomarkers.length === 0) {
      await supabase.from("agent_runs").update({
        status: "completed",
        output_json: { patterns: [], notes: "Nenhum biomarcador metabólico disponível.", confidence: 0 },
        iterations: 0,
        model_used: HAIKU,
        tokens_input: 0,
        tokens_output: 0,
        estimated_cost: 0,
        confidence_score: 0,
        completed_at: new Date().toISOString(),
      }).eq("id", agentRun.id);

      return NextResponse.json({ runId: agentRun.id, patterns: [], confidence: 0 });
    }

    const biomarkerSummary = biomarkers.map((b) =>
      `${b.name} (${b.category}): ${b.value} ${b.unit} — status: ${b.status}, tendência: ${b.trend}, data: ${b.last_date ?? "?"}`
    ).join("\n");

    const client = new Anthropic();
    const response = await client.messages.create({
      model: HAIKU,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Analise os seguintes biomarcadores metabólicos e identifique padrões bioquímicos relevantes:\n\n${biomarkerSummary}`,
        },
      ],
    });

    const totalInput = response.usage.input_tokens;
    const totalOutput = response.usage.output_tokens;
    const estimatedCost = (totalInput / 1_000_000) * 0.80 + (totalOutput / 1_000_000) * 4.0;

    const textBlock = response.content.find((b) => b.type === "text");
    let output: { patterns: unknown[]; notes: string; confidence: number } = {
      patterns: [],
      notes: "Falha ao parsear resposta do modelo.",
      confidence: 0,
    };

    if (textBlock?.type === "text") {
      try {
        output = JSON.parse(textBlock.text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
      } catch {
        output.notes = textBlock.text;
      }
    }

    const confidence = typeof output.confidence === "number"
      ? Math.max(0, Math.min(1, output.confidence))
      : 0;

    await supabase.from("agent_runs").update({
      status: "completed",
      output_json: output,
      iterations: 1,
      model_used: HAIKU,
      tokens_input: totalInput,
      tokens_output: totalOutput,
      estimated_cost: estimatedCost,
      confidence_score: confidence,
      completed_at: new Date().toISOString(),
    }).eq("id", agentRun.id);

    return NextResponse.json({ runId: agentRun.id, ...output });
  } catch (err) {
    await supabase.from("agent_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
    }).eq("id", agentRun.id);

    console.error("[metabolic-analysis]", err);
    return NextResponse.json({ error: "Falha na análise metabólica" }, { status: 500 });
  }
}
