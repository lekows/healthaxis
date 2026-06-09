// Score de Organização da Saúde — determinístico, sem IA.
// Mede completude/organização dos dados do usuário; NÃO é diagnóstico nem risco clínico.
// O percentual é renormalizado sobre os critérios DISPONÍVEIS (available: true);
// critérios ainda sem backend aparecem como "em breve" (available: false) e não penalizam.

export interface ScoreSignal {
  hasExam: boolean;
  comparableCount: number;   // nº de biomarcadores com ≥2 medições no histórico
  hasLinkedDoctor: boolean;
  hasMeds: boolean;
  hasFamilyHistory: boolean;
}

export interface ScoreCriterion {
  key: string;
  label: string;
  weight: number;
  done: boolean;
  available: boolean;        // false → critério futuro ("em breve")
}

export interface OrganizationScore {
  percent: number;
  criteria: ScoreCriterion[];
}

export function buildCriteria(signal: ScoreSignal): ScoreCriterion[] {
  return [
    { key: "exam",     label: "Exames adicionados",        weight: 20, done: signal.hasExam,          available: true },
    { key: "compare",  label: "2+ exames comparáveis",     weight: 15, done: signal.comparableCount >= 2, available: true },
    { key: "doctor",   label: "Médico vinculado",          weight: 10, done: signal.hasLinkedDoctor,   available: true },
    { key: "meds",     label: "Medicamentos adicionados",  weight: 10, done: signal.hasMeds,           available: true },
    { key: "family",   label: "Histórico familiar preenchido", weight: 10, done: signal.hasFamilyHistory, available: true },
    // Critérios futuros — sem backend ainda (Fase 3). Não entram no denominador.
    { key: "weight",       label: "Peso atualizado",          weight: 10, done: false, available: false },
    { key: "pressure",     label: "Pressão registrada",       weight: 10, done: false, available: false },
    { key: "routine",      label: "Sono ou treino registrado", weight: 10, done: false, available: false },
    { key: "consultation", label: "Próxima consulta registrada", weight: 5, done: false, available: false },
  ];
}

export function computeOrganizationScore(signal: ScoreSignal): OrganizationScore {
  const criteria = buildCriteria(signal);
  const avail = criteria.filter((c) => c.available);
  const denom = avail.reduce((s, c) => s + c.weight, 0);
  const num = avail.filter((c) => c.done).reduce((s, c) => s + c.weight, 0);
  const percent = denom > 0 ? Math.round((num / denom) * 100) : 0;
  return { percent, criteria };
}

export function organizationLabel(percent: number): string {
  if (percent >= 80) return "Seu perfil está bem organizado.";
  if (percent >= 50) return "Seu perfil está quase completo.";
  return "Complete seus dados para começar.";
}

export interface NextAction {
  label: string;
  href: string;
  description?: string;
}

// Regras simples — só sugere ações com tela existente (Fase 1).
// `alteredCount` = nº de biomarcadores fora da faixa de referência.
export function nextBestAction(signal: ScoreSignal, alteredCount = 0): NextAction | null {
  if (!signal.hasExam) {
    return {
      label: "Enviar primeiro exame",
      href: "/documents",
      description: "Faça upload de um laudo para extrair seus biomarcadores automaticamente.",
    };
  }
  if (alteredCount > 0) {
    const plural = alteredCount > 1;
    return {
      label: "Falar com seu médico",
      href: "/share",
      description: `Você tem ${alteredCount} biomarcador${plural ? "es" : ""} alterado${plural ? "s" : ""}. Entre em contato com seu médico.`,
    };
  }
  if (!signal.hasLinkedDoctor) {
    return {
      label: "Compartilhar com seu médico",
      href: "/doctors",
      description: "Vincule seu médico para que ele acompanhe seus exames.",
    };
  }
  if (signal.comparableCount < 2) {
    return {
      label: "Adicionar outro exame",
      href: "/documents",
      description: "Com dois exames comparáveis você passa a ver tendências ao longo do tempo.",
    };
  }
  return null;
}
