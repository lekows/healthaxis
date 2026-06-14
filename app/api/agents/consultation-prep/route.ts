import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  getPatientClinicalContext,
  getExamTimeline,
  getWatchedBiomarkers,
  composeConsultationBrief,
} from "@/lib/agents/tools/patient-tools";
import type { ConsultationBrief, ToolCallLog } from "@/lib/agents/types";
import { createHash } from "crypto";

export const maxDuration = 120;

const MAX_ITER = 5;

const HAIKU = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-4-6";

const SYSTEM = `Você é um organizador de informações clínicas. Seu papel é montar um briefing \
estruturado para um médico revisar antes da consulta.

Regras estritas:
- Linguagem INFORMACIONAL. Nunca use "prescreva", "diagnostique", "tome", "use".
- Use framing como "exames assim costumam ser avaliados por [especialidade]".
- Identifique tendências (subindo, caindo, estável) e o que pode merecer atenção.
- Inclua openQuestions: pontos concretos para o médico investigar, sem conduzir conduta.
- confidence 0..1 refletindo completude dos dados disponíveis.

Retorne SOMENTE JSON válido no formato:
{
  "summary": "texto informacional",
  "trendHighlights": [{ "biomarker": "...", "direction": "up|down|stable", "note": "..." }],
  "openQuestions": ["..."],
  "confidence": 0.85
}`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_patient_clinical_context",
    description: "Retorna perfil, biomarcadores atuais e documentos recentes do paciente.",
    input_schema: {
      type: "object" as const,
      properties: { patient_id: { type: "string" } },
      required: ["patient_id"],
    },
  },
  {
    name: "get_exam_timeline",
    description: "Retorna histórico de biomarcadores e scores de saúde dos últimos 24 meses.",
    input_schema: {
      type: "object" as const,
      properties: { patient_id: { type: "string" } },
      required: ["patient_id"],
    },
  },
  {
    name: "get_watched_biomarkers",
    description: "Retorna biomarcadores que o médico marcou para acompanhar neste paciente.",
    input_schema: {
      type: "object" as const,
      properties: { patient_id: { type: "string" }, doctor_id: { type: "string" } },
      required: ["patient_id", "doctor_id"],
    },
  },
];

function argsHash(args: unknown) {
  return createHash("sha256").update(JSON.stringify(args)).digest("hex").slice(0, 16);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { patientId } = await req.json() as { patientId: string };
  if (!patientId) return NextResponse.json({ error: "patientId obrigatório" }, { status: 400 });

  // Verificar que o médico tem link ativo com o paciente
  const { data: link } = await supabase
    .from("doctor_patient_links")
    .select("id")
    .eq("doctor_id", user.id)
    .eq("patient_id", patientId)
    .is("revoked_at", null)
    .maybeSingle();

  if (!link) return NextResponse.json({ error: "Vínculo não encontrado ou revogado" }, { status: 403 });

  // Criar registro de execução
  const { data: run, error: runErr } = await supabase
    .from("agent_runs")
    .insert({
      agent_name: "consultation_prep",
      patient_id: patientId,
      triggered_by: user.id,
      input_summary: { doctor_id: user.id, patient_id: patientId },
      status: "running",
    })
    .select("id")
    .single();

  if (runErr || !run) {
    return NextResponse.json({ error: "Erro ao iniciar agente" }, { status: 500 });
  }

  const toolsLog: ToolCallLog[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let brief: ConsultationBrief | null = null;

  try {
    const client = new Anthropic();
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Monte o briefing de consulta para o paciente ${patientId}. Use as ferramentas disponíveis para coletar os dados necessários.`,
      },
    ];

    let iterations = 0;

    // Loop de tool use com Haiku
    while (iterations < MAX_ITER) {
      iterations++;
      const response = await client.messages.create({
        model: HAIKU,
        max_tokens: 4096,
        system: SYSTEM,
        tools: TOOLS,
        messages,
      });

      totalInput += response.usage.input_tokens;
      totalOutput += response.usage.output_tokens;

      if (response.stop_reason === "end_turn") {
        // Haiku terminou antes de chamar ferramentas — extrair JSON se houver
        const textBlock = response.content.find((b) => b.type === "text");
        if (textBlock && textBlock.type === "text") {
          try {
            const parsed = JSON.parse(textBlock.text.match(/\{[\s\S]*\}/)?.[0] ?? "");
            brief = composeConsultationBrief(parsed);
          } catch { /* fallback para síntese com Sonnet abaixo */ }
        }
        break;
      }

      if (response.stop_reason !== "tool_use") break;

      // Executar ferramentas
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const started_at = new Date().toISOString();
        let result: unknown;
        let status: "ok" | "error" = "ok";

        try {
          const input = block.input as Record<string, string>;
          if (block.name === "get_patient_clinical_context") {
            result = await getPatientClinicalContext(input.patient_id, supabase);
          } else if (block.name === "get_exam_timeline") {
            result = await getExamTimeline(input.patient_id, supabase);
          } else if (block.name === "get_watched_biomarkers") {
            result = await getWatchedBiomarkers(input.patient_id, input.doctor_id, supabase);
          } else {
            result = { error: "Ferramenta desconhecida" };
            status = "error";
          }
        } catch (e) {
          result = { error: e instanceof Error ? e.message : "Erro na ferramenta" };
          status = "error";
        }

        toolsLog.push({
          tool: block.name,
          args_hash: argsHash(block.input),
          status,
          started_at,
          finished_at: new Date().toISOString(),
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }

    // Síntese final com Sonnet se o Haiku não terminou com JSON
    if (!brief) {
      const finalMsg = await client.messages.create({
        model: SONNET,
        max_tokens: 2048,
        system: SYSTEM,
        messages: [
          ...messages,
          { role: "user", content: "Com base em todos os dados coletados, gere agora o briefing final em JSON." },
        ],
      });
      totalInput += finalMsg.usage.input_tokens;
      totalOutput += finalMsg.usage.output_tokens;

      const textBlock = finalMsg.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        const parsed = JSON.parse(textBlock.text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
        brief = composeConsultationBrief(parsed);
      }
    }

    if (!brief) throw new Error("Agente não produziu briefing");

    // Custo estimado (preços Haiku + Sonnet por MTok)
    const estimatedCost = (totalInput / 1_000_000) * 0.80 + (totalOutput / 1_000_000) * 4.0;

    await supabase.from("agent_runs").update({
      status: "completed",
      output_json: brief,
      tools_called: toolsLog,
      iterations,
      model_used: `${HAIKU}+${SONNET}`,
      tokens_input: totalInput,
      tokens_output: totalOutput,
      estimated_cost: estimatedCost,
      confidence_score: brief.confidence,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    return NextResponse.json({ runId: run.id, brief });
  } catch (err) {
    await supabase.from("agent_runs").update({
      status: "failed",
      tools_called: toolsLog,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    console.error("[consultation-prep]", err);
    return NextResponse.json({ error: "Falha na execução do agente" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { runId, decision, editedOutput } = await req.json() as {
    runId: string;
    decision: "accepted" | "edited" | "rejected";
    editedOutput?: ConsultationBrief;
  };

  const { error } = await supabase.from("agent_runs").update({
    human_decision: decision,
    human_decision_by: user.id,
    human_decision_at: new Date().toISOString(),
    ...(decision === "edited" && editedOutput ? { edited_output: editedOutput } : {}),
  }).eq("id", runId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
