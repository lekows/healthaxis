"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Plus, Loader2, X, ChevronRight } from "lucide-react";
import type { Appointment } from "@/lib/supabase/appointment-queries";
import {
  statusLabel, statusStyle, typeLabel, isTerminal, canMarkNoShow,
  type AppointmentStatus, type AppointmentType,
} from "@/lib/appointments/status";
import {
  createAppointment, updateAppointmentStatus, rescheduleAppointment,
} from "@/lib/supabase/appointment-mutations";

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#E8E4D9" };
const cardStyle = { background: "#141412", border: "1px solid rgba(255,255,255,0.07)" };

const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: "first_visit", label: "Primeira consulta" },
  { value: "follow_up", label: "Retorno" },
  { value: "telemedicine", label: "Telemedicina" },
  { value: "exam_review", label: "Revisão de exames" },
  { value: "other", label: "Outro" },
];

type View = "today" | "week" | "upcoming" | "all";

function toIso(localValue: string): string | null {
  if (!localValue) return null;
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export function DoctorAgendaClient({
  appointments,
  patients,
}: {
  appointments: Appointment[];
  patients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("today");
  const [showForm, setShowForm] = useState(false);

  // novo agendamento
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [type, setType] = useState<AppointmentType>("follow_up");
  const [reason, setReason] = useState("");

  // remarcação inline
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedAt, setReschedAt] = useState("");

  function run(action: () => Promise<{ error: string | null }>, onOk?: () => void) {
    setError("");
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
      else { onOk?.(); router.refresh(); }
    });
  }

  const filtered = useMemo(() => {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(start); weekEnd.setDate(weekEnd.getDate() + 7);
    return appointments.filter((a) => {
      const t = new Date(a.starts_at).getTime();
      if (view === "today") return t >= start.getTime() && t <= todayEnd.getTime();
      if (view === "week") return t >= start.getTime() && t <= weekEnd.getTime();
      if (view === "upcoming") return t >= now.getTime();
      return true;
    });
  }, [appointments, view]);

  const groups = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const k = dayKey(a.starts_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return [...map.entries()];
  }, [filtered]);

  function submitCreate() {
    const iso = toIso(startsAt);
    if (!patientId) { setError("Selecione um paciente vinculado."); return; }
    if (!iso) { setError("Informe data e hora válidas."); return; }
    run(
      () => createAppointment({ patientId, startsAt: iso, durationMinutes: duration, appointmentType: type, reason }),
      () => { setShowForm(false); setStartsAt(""); setReason(""); },
    );
  }

  function submitReschedule(id: string) {
    const iso = toIso(reschedAt);
    if (!iso) { setError("Informe a nova data e hora."); return; }
    run(
      () => rescheduleAppointment({ appointmentId: id, startsAt: iso, durationMinutes: duration }),
      () => { setReschedId(null); setReschedAt(""); },
    );
  }

  const views: { id: View; label: string }[] = [
    { id: "today", label: "Hoje" },
    { id: "week", label: "Semana" },
    { id: "upcoming", label: "Próximas" },
    { id: "all", label: "Todas" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <CalendarDays size={19} style={{ color: "#52B788" }} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Face do médico</p>
            <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>Agenda</h1>
            <p className="text-sm mt-1" style={{ color: "#9A9688" }}>Consultas dos seus pacientes vinculados. Você está no comando de cada confirmação.</p>
          </div>
        </div>
        <button onClick={() => setShowForm((v) => !v)} disabled={patients.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "#52B788", color: "#0D0D0B" }}>
          <Plus size={16} /> Nova consulta
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(193,68,14,0.1)", border: "1px solid rgba(193,68,14,0.24)", color: "#F4A261" }}>{error}</div>
      )}

      {patients.length === 0 && (
        <div className="rounded-3xl p-5" style={{ background: "rgba(244,162,97,0.06)", border: "1px solid rgba(244,162,97,0.2)" }}>
          <p className="text-sm" style={{ color: "#E8E4D9" }}>Nenhum paciente vinculado ainda. Gere um convite no cockpit para que o paciente inicie o vínculo antes de agendar.</p>
        </div>
      )}

      {showForm && (
        <div className="rounded-3xl p-5 space-y-3" style={cardStyle}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Nova consulta</h2>
            <button onClick={() => setShowForm(false)}><X size={16} style={{ color: "#9A9688" }} /></button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <label className="text-xs" style={{ color: "#9A9688" }}>Paciente
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle}>
                {patients.map((p) => <option key={p.id} value={p.id} style={{ background: "#141412" }}>{p.name}</option>)}
              </select>
            </label>
            <label className="text-xs" style={{ color: "#9A9688" }}>Data e hora
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle} />
            </label>
            <label className="text-xs" style={{ color: "#9A9688" }}>Duração (min)
              <input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle} />
            </label>
            <label className="text-xs" style={{ color: "#9A9688" }}>Tipo
              <select value={type} onChange={(e) => setType(e.target.value as AppointmentType)} className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle}>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ background: "#141412" }}>{o.label}</option>)}
              </select>
            </label>
          </div>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo operacional (opcional, sem dado clínico sensível)" className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle} />
          <button onClick={submitCreate} disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#52B788", color: "#0D0D0B" }}>
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Agendar
          </button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {views.map((v) => (
          <button key={v.id} onClick={() => setView(v.id)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={view === v.id
              ? { background: "rgba(82,183,136,0.14)", border: "1px solid rgba(82,183,136,0.3)", color: "#52B788" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#9A9688" }}>
            {v.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-3xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
          <CalendarDays size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
          <p className="text-sm font-medium mt-3" style={{ color: "#E8E4D9" }}>Nenhuma consulta nesta visão</p>
          <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Crie uma consulta ou troque o filtro acima.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <section key={day}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9A9688" }}>{day}</h3>
              <div className="space-y-3">
                {items.map((a) => {
                  const terminal = isTerminal(a.status);
                  const noShowOk = canMarkNoShow(a.starts_at) && !terminal;
                  return (
                    <div key={a.id} className="rounded-2xl p-4" style={cardStyle}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{fmtTime(a.starts_at)} · {a.counterpart_name ?? "Paciente"}</p>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={statusStyle(a.status)}>{statusLabel(a.status)}</span>
                            {a.source === "patient_request" && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#9A9688" }}>Pedido do paciente</span>
                            )}
                          </div>
                          <p className="text-xs mt-1" style={{ color: "#9A9688" }}>{typeLabel(a.appointment_type)}{a.reason ? ` · ${a.reason}` : ""}</p>
                          <Link href={`/doctor/patient/${a.patient_id}`} className="text-xs mt-1 inline-flex items-center gap-1 font-medium" style={{ color: "#52B788" }}>
                            Abrir paciente <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>

                      {!terminal && (
                        <div className="flex gap-2 flex-wrap mt-3">
                          {(a.status === "requested" || a.status === "pending_confirmation" || a.status === "scheduled") && (
                            <ActionBtn label="Confirmar" onClick={() => run(() => updateAppointmentStatus({ appointmentId: a.id, status: "confirmed" }))} disabled={pending} />
                          )}
                          {a.status === "confirmed" && (
                            <ActionBtn label="Marcar chegada" onClick={() => run(() => updateAppointmentStatus({ appointmentId: a.id, status: "arrived" }))} disabled={pending} />
                          )}
                          {a.status === "arrived" && (
                            <ActionBtn label="Concluir" onClick={() => run(() => updateAppointmentStatus({ appointmentId: a.id, status: "completed" }))} disabled={pending} />
                          )}
                          <ActionBtn label="Remarcar" onClick={() => { setReschedId(reschedId === a.id ? null : a.id); setReschedAt(""); }} disabled={pending} />
                          {noShowOk && (
                            <ActionBtn label="Faltou" danger onClick={() => run(() => updateAppointmentStatus({ appointmentId: a.id, status: "no_show" }))} disabled={pending} />
                          )}
                          <ActionBtn label="Cancelar" danger onClick={() => run(() => updateAppointmentStatus({ appointmentId: a.id, status: "cancelled" }))} disabled={pending} />
                        </div>
                      )}

                      {reschedId === a.id && (
                        <div className="flex gap-2 flex-wrap mt-3 items-center">
                          <input type="datetime-local" value={reschedAt} onChange={(e) => setReschedAt(e.target.value)} className="px-3 py-2 rounded-2xl text-sm outline-none" style={inputStyle} />
                          <ActionBtn label="Salvar nova data" onClick={() => submitReschedule(a.id)} disabled={pending} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-3 py-1.5 rounded-2xl text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
      style={danger
        ? { background: "rgba(193,68,14,0.1)", border: "1px solid rgba(193,68,14,0.24)", color: "#F4A261" }
        : { background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.22)", color: "#52B788" }}>
      {label}
    </button>
  );
}
