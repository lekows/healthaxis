// Detecção de conflito de horário (épico #64, #66). Lógica pura e determinística,
// sem I/O — a mutação busca as consultas ativas do ator e delega a decisão aqui.

import { type AppointmentStatus, isBlocking } from "./status";

export interface TimeSlot {
  id?: string;
  starts_at: string | Date;
  ends_at: string | Date;
  status?: AppointmentStatus;
}

function ms(v: string | Date): number {
  const d = v instanceof Date ? v : new Date(v);
  return d.getTime();
}

// Dois intervalos [aStart,aEnd) e [bStart,bEnd) se sobrepõem quando começam antes
// do fim um do outro. Intervalos que apenas se tocam na borda (aEnd === bStart)
// NÃO conflitam — uma consulta pode começar exatamente quando a outra termina.
export function overlaps(
  aStart: string | Date,
  aEnd: string | Date,
  bStart: string | Date,
  bEnd: string | Date,
): boolean {
  const as = ms(aStart), ae = ms(aEnd), bs = ms(bStart), be = ms(bEnd);
  if ([as, ae, bs, be].some(Number.isNaN)) return false;
  return as < be && bs < ae;
}

// Retorna as consultas existentes que conflitam com a candidata. Considera apenas
// status que bloqueiam horário (ver BLOCKING_STATUSES) e ignora a própria consulta
// (mesmo id) — útil ao remarcar/editar.
export function findConflicts(
  candidate: TimeSlot,
  existing: TimeSlot[],
): TimeSlot[] {
  return existing.filter((e) => {
    if (candidate.id && e.id && e.id === candidate.id) return false;
    if (e.status && !isBlocking(e.status)) return false;
    return overlaps(candidate.starts_at, candidate.ends_at, e.starts_at, e.ends_at);
  });
}

export function hasConflict(candidate: TimeSlot, existing: TimeSlot[]): boolean {
  return findConflicts(candidate, existing).length > 0;
}
