// Agrupa a fila de revisão de IA por paciente. Módulo puro (só import de tipo), sem dependência de
// servidor, para ser usado tanto na page (server) quanto em componente client e ser testável.
import type { AgentReviewQueueItem } from "@/lib/supabase/agent-review-queries";

export interface PatientReviewGroup {
  patientId: string;
  patient: AgentReviewQueueItem["patient"];
  reviews: AgentReviewQueueItem[]; // ordenadas da mais recente para a mais antiga
  pendingCount: number;
}

// Chave temporal: preferir a conclusão; cair para a criação. ISO 8601 compara lexicograficamente.
function dateKey(review: AgentReviewQueueItem): string {
  return review.completed_at ?? review.created_at ?? "";
}

export function groupReviewsByPatient(items: AgentReviewQueueItem[]): PatientReviewGroup[] {
  const byPatient = new Map<string, AgentReviewQueueItem[]>();
  for (const item of items) {
    const list = byPatient.get(item.patient_id);
    if (list) list.push(item);
    else byPatient.set(item.patient_id, [item]);
  }

  const groups: PatientReviewGroup[] = [];
  for (const [patientId, reviews] of byPatient) {
    reviews.sort((a, b) => (dateKey(a) < dateKey(b) ? 1 : dateKey(a) > dateKey(b) ? -1 : 0));
    groups.push({
      patientId,
      patient: reviews[0]?.patient ?? null,
      reviews,
      pendingCount: reviews.filter((r) => r.human_decision === "pending").length,
    });
  }

  // Ordena os grupos: (a) quem tem pendência primeiro; (b) análise mais recente primeiro;
  // (c) desempate por confiança da mais recente (maior primeiro).
  groups.sort((a, b) => {
    const aPending = a.pendingCount > 0 ? 1 : 0;
    const bPending = b.pendingCount > 0 ? 1 : 0;
    if (aPending !== bPending) return bPending - aPending;

    const aDate = dateKey(a.reviews[0]);
    const bDate = dateKey(b.reviews[0]);
    if (aDate !== bDate) return aDate < bDate ? 1 : -1;

    return (b.reviews[0]?.confidence_score ?? 0) - (a.reviews[0]?.confidence_score ?? 0);
  });

  return groups;
}
