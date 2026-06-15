import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const HAIKU = "claude-haiku-4-5-20251001";

const SYSTEM = `Você é um analisador de padrões metabólicos com acesso a séries temporais de biomarcadores. \
Seu papel é identificar padrões bioquímicos relevantes usando tanto os valores atuais quanto a \
evolução histórica, em linguagem informacional estritamente não-prescritiva.

Regras de análise:
- Use o HISTÓRICO para determinar a significância clínica de um padrão:
  · Um valor alterado em UMA medição é menos relevante que o mesmo valor alterado em 3+ medições.
  · Um padrão que PIOROU progressivamente tem relevância maior do que um valor pontualmente elevado.
  · Um biomarcador que ERA alterado e MELHOROU é um achado positivo a ser destacado.
  · Um valor ainda "ótimo" mas com TENDÊNCIA consistente de aproximação ao limite merece atenção.
- Identifique padrões bioquímicos conhecidos usando a perspectiva longitudinal:
  ex.: dislipidemia aterogênica persistente, resistência insulínica crescente, hepatotoxicidade resolvida.
- Classifique relevance considerando a consistência temporal, não só o valor atual.
- evidence: inclua o valor atual e, quando esclarecedor, a trajetória resumida (ex.: "145 → 128 → 119 mg/dL").
- notes: destaque tendências preocupantes mesmo dentro do intervalo, e padrões de melhora sustentada.
- confidence 0..1: aumenta com mais pontos históricos disponíveis.

Linguagem:
- Nunca use "diagnostique", "prescreva", "tome", "use", "encaminhe para".
- Use "padrão compatível com", "achados que costumam ser avaliados por [especialidade]", "trajetória sugestiva de".

Retorne SOMENTE JSON válido:
{
  "patterns": [
    {
      "name": "...",
      "summary": "1 frase direta e acessível para leigos, sem jargão (ex.: 'Seu fígado está funcionando muito bem e melhorando.')",
      "description": "Texto técnico detalhado com perspectiva temporal para quem quiser saber mais.",
      "evidence": ["biomarcador: valor_atual unidade (status) | trajetória: val1 → val2 → val3"],
      "relevance": "high|medium|low",
      "type": "protective|concern|mixed"
    }
  ],
  "notes": "...",
  "confidence": 0.85
}

Campo type:
- "protective": achado positivo — todos os biomarcadores do padrão estão em faixas ótimas ou melhorando.
- "concern": achado que merece atenção — pelo menos um biomarcador fora do intervalo ou com tendência preocupante.
- "mixed": achados mistos — alguns ótimos, outros alterados no mesmo padrão.`;

const METABOLIC_CATEGORIES = ["Glicemia", "Lipídios", "Função Hepática", "Função Renal", "Hormônios", "Inflamação"];

// Recupera os padrões completos de um JSON truncado por estouro de tokens.
// Mantém apenas os objetos do array "patterns" que fecham corretamente.
function salvageTruncatedPatterns(text: string): { patterns: unknown[]; notes: string; confidence: number } | null {
  const start = text.indexOf('"patterns"');
  if (start === -1) return null;
  const arrStart = text.indexOf("[", start);
  if (arrStart === -1) return null;

  const patterns: unknown[] = [];
  let depth = 0;
  let objStart = -1;
  for (let i = arrStart + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") { if (depth === 0) objStart = i; depth++; }
    else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try { patterns.push(JSON.parse(text.slice(objStart, i + 1))); } catch { /* item parcial, ignora */ }
        objStart = -1;
      }
    } else if (ch === "]" && depth === 0) break;
  }

  if (patterns.length === 0) return null;
  return { patterns, notes: "", confidence: 0.7 };
}

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
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 24);

    const [{ data: biomarkers }, { data: history }] = await Promise.all([
      supabase
        .from("biomarkers")
        .select("name, slug, category, value, unit, status, trend, last_date")
        .eq("user_id", patientId)
        .in("category", METABOLIC_CATEGORIES)
        .order("category"),
      supabase
        .from("biomarker_history")
        .select("biomarker_slug, value, date_label, recorded_at")
        .eq("user_id", patientId)
        .gte("recorded_at", cutoff.toISOString().slice(0, 10))
        .order("recorded_at"),
    ]);

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

    // Agrupa histórico por slug dos biomarcadores metabólicos
    const metabolicSlugs = new Set(biomarkers.map((b) => b.slug));
    const historyBySlug: Record<string, { label: string; value: number }[]> = {};
    for (const row of history ?? []) {
      if (!metabolicSlugs.has(row.biomarker_slug)) continue;
      (historyBySlug[row.biomarker_slug] ??= []).push({
        label: row.date_label ?? row.recorded_at,
        value: Number(row.value),
      });
    }

    const biomarkerSummary = biomarkers.map((b) => {
      const hist = historyBySlug[b.slug];
      const currentLine = `${b.name} (${b.category}): ${b.value} ${b.unit} — status: ${b.status}, tendência: ${b.trend}, medição: ${b.last_date ?? "?"}`;
      if (!hist || hist.length <= 1) return currentLine;
      const histLine = hist.map((h) => `${h.value} (${h.label})`).join(" → ");
      return `${currentLine}\n  histórico (24 meses): ${histLine}`;
    }).join("\n");

    const client = new Anthropic();
    const response = await client.messages.create({
      model: HAIKU,
      max_tokens: 6000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Analise os seguintes biomarcadores metabólicos e identifique padrões bioquímicos relevantes. Quando houver histórico, comente a evolução temporal.\n\nIMPORTANTE: summary deve ter 1 frase. description deve ter no máximo 3 frases. notes deve ter no máximo 2 frases. Seja conciso para não truncar o JSON.\n\n${biomarkerSummary}`,
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
      const jsonStr = textBlock.text.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
      try {
        output = JSON.parse(jsonStr);
      } catch {
        // JSON truncado (estouro de tokens): salva os padrões completos
        // recortando o array antes do último item incompleto.
        const salvaged = salvageTruncatedPatterns(textBlock.text);
        if (salvaged) output = salvaged;
        else output.notes = "Análise gerada, mas resposta incompleta. Tente reanalisar.";
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
