import { createClient } from "@/lib/supabase/server";

export type AgentHumanDecision = "pending" | "accepted" | "edited" | "rejected";

export interface AgentRunForReview {
  id: string;
  agent_name: string;
  patient_id: string;
  model_used: string | null;
  confidence_score: number | null;
  output_json: Record<string, unknown> | null;
  edited_output: Record<string, unknown> | null;
  human_decision: AgentHumanDecision;
  human_decision_by: string | null;
  human_decision_at: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface AgentReviewQueueItem extends AgentRunForReview {
  patient: {
    id: string;
    name: string;
    dob: string | null;
    sex: string | null;
  } | null;
}

export async function getPatientAgentRunsForReview(
  patientId: string,
  limit = 10
): Promise<AgentRunForReview[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("agent_runs")
    .select("id, agent_name, patient_id, model_used, confidence_score, output_json, edited_output, human_decision, human_decision_by, human_decision_at, status, created_at, completed_at")
    .eq("patient_id", patientId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as AgentRunForReview[];
}

export async function getDoctorAgentReviewQueue(
  decision: AgentHumanDecision | "all" = "pending",
  limit = 50
): Promise<AgentReviewQueueItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: links } = await supabase
    .from("doctor_patient_links")
    .select("patient_id")
    .eq("doctor_id", user.id)
    .is("revoked_at", null);

  const patientIds = (links ?? []).map((link) => link.patient_id).filter(Boolean);
  if (patientIds.length === 0) return [];

  let query = supabase
    .from("agent_runs")
    .select("id, agent_name, patient_id, model_used, confidence_score, output_json, edited_output, human_decision, human_decision_by, human_decision_at, status, created_at, completed_at, patient:patient_id(id, name, dob, sex)")
    .in("patient_id", patientIds)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (decision !== "all") query = query.eq("human_decision", decision);

  const { data, error } = await query;
  if (error) return [];

  return (data ?? []).map((item) => ({
    ...item,
    patient: Array.isArray(item.patient) ? item.patient[0] ?? null : item.patient ?? null,
  })) as AgentReviewQueueItem[];
}

export function getAgentReviewSummary(agentRun: AgentRunForReview) {
  const output = agentRun.edited_output ?? agentRun.output_json ?? {};
  const possibleSummary =
    output.summary ??
    output.executive_summary ??
    output.analysis_summary ??
    output.overview ??
    output.impression ??
    output.reviewed_summary ??
    null;

  if (typeof possibleSummary === "string") return possibleSummary;
  return "Análise disponível para revisão médica.";
}

export function getAgentReviewHighlights(agentRun: AgentRunForReview): string[] {
  const output = agentRun.edited_output ?? agentRun.output_json ?? {};
  const candidates = [
    output.highlights,
    output.key_findings,
    output.findings,
    output.risk_factors,
    output.attention_points,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "text" in item && typeof item.text === "string") return item.text;
          if (item && typeof item === "object" && "title" in item && typeof item.title === "string") return item.title;
          return null;
        })
        .filter((item): item is string => Boolean(item))
        .slice(0, 6);
    }
  }

  return [];
}
