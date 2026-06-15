export type AgentRunStatus = "running" | "completed" | "failed" | "halted";
export type HumanDecision = "pending" | "accepted" | "edited" | "rejected";

export type ToolCallLog = {
  tool: string;
  args_hash: string;
  status: "ok" | "error";
  started_at: string;
  finished_at: string;
};

export type TrendHighlight = {
  biomarker: string;
  loinc?: string;
  direction: "up" | "down" | "stable";
  note: string;
};

export type ConsultationBrief = {
  summary: string;
  trendHighlights: TrendHighlight[];
  openQuestions: string[];
  confidence: number;
};

export type AgentRunRecord = {
  id: string;
  agent_name: string;
  patient_id: string;
  triggered_by: string;
  input_summary: Record<string, unknown>;
  tools_called: ToolCallLog[];
  iterations: number;
  model_used: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  estimated_cost: number | null;
  confidence_score: number | null;
  output_json: ConsultationBrief | null;
  human_decision: HumanDecision;
  human_decision_by: string | null;
  human_decision_at: string | null;
  edited_output: ConsultationBrief | null;
  status: AgentRunStatus;
  created_at: string;
  completed_at: string | null;
};
