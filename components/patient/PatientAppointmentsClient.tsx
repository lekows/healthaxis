"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Loader2, X } from "lucide-react";
import type { Appointment } from "@/lib/supabase/appointment-queries";
import { statusLabel, statusStyle, typeLabel, type AppointmentType } from "@/lib/appointments/status";
import { requestAppointment } from "@/lib/supabase/appointment-mutations";

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#E8E4D9" };
const cardStyle = { background: "#141412", border: "1px solid rgba(255,255,255,0.07)" };

const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: "first_visit", label: "Primeira consulta" },
  { value: "follow_up", label: "Retorno" },
  { value: "telemedicine", label: "Telemedicina" },
  { value: "exam_review", label: "Revisão de exames" },
  { value: "other", label: "Outro" },
];

function toIso(localValue: string): string | null {
  if (!localValue) return null;
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function PatientAppointmentsClient({
  appointments,
  doctors,
}: {
  appointments: Appointment[];
  doctors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [startsAt, setStartsAt] = useState("");
  const [type, setType] = useState<AppointmentType>("follow_up");
  const [reason, setReason] = useState("");

  function submit() {
    const iso = toIso(startsAt);
    if (!doctorId) { setError("Selecione um médico vinculado."); return; }
    if (!iso) { setError("Informe data e hora válidas."); return; }
    setError("");
    startTransition(async () => {
      const res = await requestAppointment({ doctorId, startsAt: iso, durationMinutes: 30, appointmentType: type, reason });
      if (res.error) setError(res.error);
      else { setShowForm(false); setStartsAt(""); setReason(""); router.refresh(); }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "#9A9688" }}>Acompanhe e solicite suas consultas. A confirmação é feita pelo seu médico.</p>
        <button onClick={() => setShowForm((v) => !v)} disabled={doctors.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
          style={{ background: "#52B788", color: "#0D0D0B" }}>
          <Plus size={16} /> Solicitar
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(193,68,14,0.1)", border: "1px solid rgba(193,68,14,0.24)", color: "#F4A261" }}>{error}</div>
      )}

      {doctors.length === 0 && (
        <div className="rounded-3xl p-5" style={{ background: "rgba(244,162,97,0.06)", border: "1px solid rgba(244,162,97,0.2)" }}>
          <p className="text-sm" style={{ color: "#E8E4D9" }}>Você ainda não tem médico vinculado. Conecte-se a um médico para solicitar consultas.</p>
        </div>
      )}

      {showForm && (
        <div className="rounded-3xl p-5 space-y-3" style={cardStyle}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Solicitar consulta</h2>
            <button onClick={() => setShowForm(false)}><X size={16} style={{ color: "#9A9688" }} /></button>
          </div>
          <label className="text-xs block" style={{ color: "#9A9688" }}>Médico
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle}>
              {doctors.map((d) => <option key={d.id} value={d.id} style={{ background: "#141412" }}>{d.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <label className="text-xs" style={{ color: "#9A9688" }}>Data e hora preferida
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle} />
            </label>
            <label className="text-xs" style={{ color: "#9A9688" }}>Tipo
              <select value={type} onChange={(e) => setType(e.target.value as AppointmentType)} className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle}>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ background: "#141412" }}>{o.label}</option>)}
              </select>
            </label>
          </div>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none" style={inputStyle} />
          <p className="text-[11px]" style={{ color: "#5A5A50" }}>A data é uma preferência. O médico confirma, remarca ou recusa o horário.</p>
          <button onClick={submit} disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#52B788", color: "#0D0D0B" }}>
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Enviar solicitação
          </button>
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="rounded-3xl p-8 text-center" style={{ background: "#141412", border: "1px dashed rgba(255,255,255,0.12)" }}>
          <CalendarDays size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
          <p className="text-sm font-medium mt-3" style={{ color: "#E8E4D9" }}>Nenhuma consulta ainda</p>
          <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Solicite uma consulta ao seu médico vinculado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <div key={a.id} className="rounded-2xl p-4" style={cardStyle}>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{fmt(a.starts_at)}</p>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={statusStyle(a.status)}>{statusLabel(a.status)}</span>
              </div>
              <p className="text-xs mt-1" style={{ color: "#9A9688" }}>
                {a.counterpart_name ? `Dr(a). ${a.counterpart_name} · ` : ""}{typeLabel(a.appointment_type)}{a.reason ? ` · ${a.reason}` : ""}
              </p>
              {a.status === "cancelled" && a.cancellation_reason && (
                <p className="text-xs mt-1" style={{ color: "#F4A261" }}>Motivo do cancelamento: {a.cancellation_reason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
