// Lifecycle de status das consultas (épico #64). Lógica pura, sem I/O — fácil de
// testar e compartilhada entre servidor (validação/RLS) e UI (badges).

export type AppointmentStatus =
  | "requested"
  | "pending_confirmation"
  | "scheduled"
  | "confirmed"
  | "arrived"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

export type AppointmentType =
  | "first_visit"
  | "follow_up"
  | "telemedicine"
  | "exam_review"
  | "other";

export type AppointmentSource = "manual" | "patient_request" | "system";

// Status que ocupam um horário e, portanto, geram conflito com novas consultas.
// requested/pending_confirmation ainda não são compromissos firmes; cancelled,
// no_show, completed e rescheduled são terminais e liberam o horário.
export const BLOCKING_STATUSES: readonly AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "arrived",
] as const;

export function isBlocking(status: AppointmentStatus): boolean {
  return BLOCKING_STATUSES.includes(status);
}

// Estados terminais: não permitem transição de status nem remarcação.
export const TERMINAL_STATUSES: readonly AppointmentStatus[] = [
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
] as const;

export function isTerminal(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

// "Faltou" só pode ser marcado depois do horário de início da consulta.
export function canMarkNoShow(startsAt: string | Date, now: Date = new Date()): boolean {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  if (Number.isNaN(start.getTime())) return false;
  return now.getTime() >= start.getTime();
}

const LABELS: Record<AppointmentStatus, string> = {
  requested: "Solicitada",
  pending_confirmation: "Aguardando confirmação",
  scheduled: "Agendada",
  confirmed: "Confirmada",
  arrived: "Chegou",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Faltou",
  rescheduled: "Remarcada",
};

export function statusLabel(status: AppointmentStatus): string {
  return LABELS[status] ?? status;
}

const TYPE_LABELS: Record<AppointmentType, string> = {
  first_visit: "Primeira consulta",
  follow_up: "Retorno",
  telemedicine: "Telemedicina",
  exam_review: "Revisão de exames",
  other: "Outro",
};

export function typeLabel(type: AppointmentType): string {
  return TYPE_LABELS[type] ?? type;
}

export type StatusStyle = { background: string; border: string; color: string };

// Paleta consistente com o resto do app (#52B788 verde, #F4A261 laranja,
// #C1440E vermelho/terra, neutro para terminais informativos).
export function statusStyle(status: AppointmentStatus): StatusStyle {
  switch (status) {
    case "confirmed":
    case "arrived":
    case "completed":
      return { background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" };
    case "requested":
    case "pending_confirmation":
    case "scheduled":
      return { background: "rgba(244,162,97,0.1)", border: "1px solid rgba(244,162,97,0.22)", color: "#F4A261" };
    case "cancelled":
    case "no_show":
      return { background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.24)", color: "#F4A261" };
    case "rescheduled":
    default:
      return { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#9A9688" };
  }
}
