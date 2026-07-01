// Nome amigável para os agentes de IA. `agent_runs.agent_name` guarda identificadores técnicos
// (ex.: "consultation_prep") que não devem aparecer como título de card para o médico.

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  consultation_prep:      "Preparação de consulta",
  metabolic_analysis:     "Análise metabólica",
  exam_review:            "Revisão de exames",
  risk_summary:           "Síntese de risco",
  clinical_summary:       "Resumo clínico",
  longitudinal_review:    "Revisão longitudinal",
  cardiometabolic_review: "Revisão cardiometabólica",
};

const FALLBACK = "Análise clínica de IA";

export function getAgentDisplayName(agentName: string | null | undefined): string {
  if (!agentName) return FALLBACK;
  const key = agentName.trim().toLowerCase();
  if (AGENT_DISPLAY_NAMES[key]) return AGENT_DISPLAY_NAMES[key];

  // Fallback: converte snake_case / kebab-case em um título legível.
  const readable = key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return readable || FALLBACK;
}
