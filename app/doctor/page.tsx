import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile, getMyInvites, getDoctorCockpitPatients } from "@/lib/supabase/doctor-queries";
import { getDoctorAppointments } from "@/lib/supabase/appointment-queries";
import { isTerminal } from "@/lib/appointments/status";
import { appointmentsEnabled } from "@/lib/feature-flags";
import { InvitePanel } from "@/components/doctor/InvitePanel";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { Stethoscope, Users, AlertTriangle, BrainCircuit, FlaskConical, Clock3, ChevronRight, ArrowRight, CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import type { DoctorCockpitPatient, DoctorCockpitSignal } from "@/lib/supabase/doctor-queries";

export const dynamic = "force-dynamic";

const NEW_EXAM_DAYS = 14;
const STALE_DAYS = 90;

function daysSince(date: string | null) {
  if (!date) return null;
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function signalLabel(signal: DoctorCockpitSignal) {
  if (signal === "review") return "Revisar";
  if (signal === "followup") return "Acompanhar";
  return "Estável";
}

function signalStyle(signal: DoctorCockpitSignal) {
  if (signal === "review") return { background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.24)", color: "#F4A261" };
  if (signal === "followup") return { background: "rgba(244,162,97,0.1)", border: "1px solid rgba(244,162,97,0.22)", color: "#F4A261" };
  return { background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" };
}

export default async function DoctorPage() {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const [profile, doctorProfile, invites, patients, todayAppointments] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getMyInvites(),
    getDoctorCockpitPatients(),
    appointmentsEnabled
      ? getDoctorAppointments({ from: todayStart.toISOString(), to: todayEnd.toISOString() })
      : Promise.resolve([]),
  ]);

  if (!doctorProfile) redirect("/doctor/setup");

  const todayAgendaCount = todayAppointments.filter((a) => !isTerminal(a.status)).length;

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3002";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${proto}://${host}`;
  const activeInvite = invites[0] ?? null;

  const reviewCount = patients.filter((p) => p.signal === "review").length;
  const pendingAiTotal = patients.reduce((total, p) => total + p.pending_ai, 0);
  const newExamCount = patients.filter((p) => {
    const d = daysSince(p.latest_document_date);
    return d !== null && d <= NEW_EXAM_DAYS;
  }).length;
  const staleCount = patients.filter((p) => p.days_since_latest_data === null || p.days_since_latest_data > STALE_DAYS).length;

  // Prioridades de hoje: já vem ordenado por prioridade da query; pega os não-estáveis.
  const priorities = patients.filter((p) => p.signal !== "stable").slice(0, 6);

  const queueCards: { label: string; value: number; hint: string; href: string; icon: typeof Users; accent: string; tint: string }[] = [
    { label: "Pacientes ativos", value: patients.length, hint: "carteira vinculada", href: "/doctor/patients", icon: Users, accent: "#52B788", tint: "rgba(82,183,136,0.1)" },
    { label: "Para revisar hoje", value: reviewCount, hint: "prioridade clínica", href: "/doctor/patients?filter=review", icon: AlertTriangle, accent: "#F4A261", tint: "rgba(193,68,14,0.1)" },
    { label: "IA pendente", value: pendingAiTotal, hint: "aguardando decisão", href: "/doctor/patients?filter=pending_ai", icon: BrainCircuit, accent: "#F4A261", tint: "rgba(244,162,97,0.1)" },
    { label: "Exames novos", value: newExamCount, hint: `últimos ${NEW_EXAM_DAYS} dias`, href: "/doctor/exams", icon: FlaskConical, accent: "#52B788", tint: "rgba(82,183,136,0.1)" },
    { label: "Sem movimento", value: staleCount, hint: "sem dado recente", href: "/doctor/patients?filter=stale", icon: Clock3, accent: "#9A9688", tint: "rgba(255,255,255,0.04)" },
  ];

  if (appointmentsEnabled) {
    queueCards.splice(1, 0, {
      label: "Agenda hoje", value: todayAgendaCount, hint: "consultas do dia", href: "/doctor/agenda", icon: CalendarDays, accent: "#52B788", tint: "rgba(82,183,136,0.1)",
    });
  }

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Stethoscope size={19} style={{ color: "#52B788" }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Face do médico</p>
              <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>Cockpit cardiometabólico</h1>
              <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
                CRM {doctorProfile.crm}/{doctorProfile.crm_uf}
                {doctorProfile.specialty ? ` · ${doctorProfile.specialty}` : ""}
              </p>
            </div>
          </div>
          <div className="px-4 py-3 rounded-2xl max-w-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "#9A9688" }}>
              Quem precisa da sua atenção hoje, por quê, e qual ação revisar. O HealthAxis organiza e prioriza; o médico decide.
            </p>
          </div>
        </div>

        {/* Filas de trabalho */}
        <div className={`grid grid-cols-2 gap-4 ${queueCards.length >= 6 ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
          {queueCards.map((card) => (
            <Link key={card.label} href={card.href}
              className="group rounded-3xl p-5 transition-colors hover:bg-white/[0.04]"
              style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: card.tint, border: `1px solid ${card.accent}33` }}>
                  <card.icon size={18} style={{ color: card.accent }} />
                </div>
                <ChevronRight size={15} style={{ color: "#5A5A50" }} className="group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-3xl font-bold mt-4" style={{ color: card.value > 0 && card.label !== "Pacientes ativos" ? card.accent : "#E8E4D9" }}>{card.value}</p>
              <p className="text-sm font-medium mt-1" style={{ color: "#E8E4D9" }}>{card.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>{card.hint}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          {/* Prioridades de hoje */}
          <section className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9A9688" }}>Prioridades de hoje</h2>
                <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>Pacientes que pedem revisão ou acompanhamento, do mais urgente ao menos.</p>
              </div>
              <Link href="/doctor/patients" className="inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-80" style={{ color: "#52B788" }}>
                Ver carteira <ArrowRight size={13} />
              </Link>
            </div>

            {priorities.length === 0 ? (
              <div className="rounded-3xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                <Users size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
                <p className="text-sm font-medium mt-3" style={{ color: "#E8E4D9" }}>
                  {patients.length === 0 ? "Nenhum paciente vinculado ainda" : "Nada na fila de prioridade"}
                </p>
                <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: "#9A9688" }}>
                  {patients.length === 0
                    ? "Gere um convite para que o paciente inicie o vínculo e autorize o compartilhamento."
                    : "Todos os pacientes estão estáveis no radar. Veja a carteira completa para detalhes."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {priorities.map((p: DoctorCockpitPatient) => {
                  const name = p.patient?.name ?? "Paciente";
                  return (
                    <Link key={p.id} href={`/doctor/patient/${p.patient_id}`}
                      className="group flex items-center gap-4 p-4 rounded-2xl transition-colors hover:bg-white/[0.04]"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate" style={{ color: "#E8E4D9" }}>{name}</p>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={signalStyle(p.signal)}>
                            {signalLabel(p.signal)}
                          </span>
                          {p.pending_ai > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1" style={{ background: "rgba(244,162,97,0.12)", border: "1px solid rgba(244,162,97,0.24)", color: "#F4A261" }}>
                              <BrainCircuit size={11} /> {p.pending_ai} IA
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-1" style={{ color: "#9A9688" }}>
                          <span style={{ color: "#5A5A50" }}>Motivo:</span> {p.signal_reason}
                        </p>
                        <p className="text-xs mt-0.5 font-medium" style={{ color: "#52B788" }}>Ação: {p.next_action}</p>
                      </div>
                      <ChevronRight size={17} style={{ color: "#5A5A50" }} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Coluna lateral: convite + guardrails */}
          <div className="space-y-6">
            <InvitePanel initialInvite={activeInvite} baseUrl={baseUrl} />

            <div className="rounded-3xl p-5" style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.18)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Regra de segurança do cockpit</h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9A9688" }}>
                Esta tela organiza e prioriza dados compartilhados pelo paciente. Qualquer score, insight ou conduta deve ser revisado, editado ou recusado pelo médico antes de chegar ao paciente.
              </p>
            </div>

            <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Critério do radar</h3>
              <div className="mt-3 space-y-2 text-xs" style={{ color: "#9A9688" }}>
                <p><span style={{ color: "#F4A261" }}>Revisar:</span> críticos ou múltiplos biomarcadores alterados.</p>
                <p><span style={{ color: "#F4A261" }}>Acompanhar:</span> sem exames, dado antigo ou alteração isolada.</p>
                <p><span style={{ color: "#52B788" }}>Estável:</span> sem prioridade operacional imediata.</p>
              </div>
            </div>
          </div>
        </div>

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
