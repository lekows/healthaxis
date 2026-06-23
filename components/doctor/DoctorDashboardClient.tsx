"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DoctorInviteQR } from "./DoctorInviteQR";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { DoctorCockpitPatient, DoctorCockpitSignal, DoctorInvite } from "@/lib/supabase/doctor-queries";

interface Props {
  initialInvite: DoctorInvite | null;
  patients: DoctorCockpitPatient[];
  baseUrl: string;
}

type PatientFilter = "all" | DoctorCockpitSignal;

function getSignalLabel(signal: DoctorCockpitSignal) {
  if (signal === "review") return "Revisar";
  if (signal === "followup") return "Acompanhar";
  return "Estável";
}

function getSignalStyle(signal: DoctorCockpitSignal) {
  if (signal === "review") return { background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.24)", color: "#F4A261" };
  if (signal === "followup") return { background: "rgba(244,162,97,0.1)", border: "1px solid rgba(244,162,97,0.22)", color: "#F4A261" };
  return { background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" };
}

function formatDate(date: string | null) {
  if (!date) return "Sem dado";
  return new Date(date).toLocaleDateString("pt-BR");
}

function formatDaysWithoutData(days: number | null) {
  if (days === null) return "Sem dado";
  if (days === 0) return "Hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

export function DoctorDashboardClient({ initialInvite, patients, baseUrl }: Props) {
  const [invite, setInvite] = useState<DoctorInvite | null>(initialInvite);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PatientFilter>("all");

  const filteredPatients = useMemo(() => patients.filter((patient) => {
    const patientName = patient.patient?.name ?? "Paciente";
    const matchesSearch = patientName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || patient.signal === filter;
    return matchesSearch && matchesFilter;
  }), [patients, search, filter]);

  const reviewCount = patients.filter((patient) => patient.signal === "review").length;
  const followupCount = patients.filter((patient) => patient.signal === "followup").length;
  const stableCount = patients.filter((patient) => patient.signal === "stable").length;
  const alteredBiomarkerCount = patients.reduce((total, patient) => total + patient.altered_biomarkers, 0);
  const withoutRecentDataCount = patients.filter((patient) => patient.days_since_latest_data === null || patient.days_since_latest_data > 90).length;

  async function generateInvite() {
    setLoading(true);
    const res = await fetch("/api/doctor/invite", { method: "POST" });
    const data = await res.json();
    if (data.token) setInvite({ id: data.id, token: data.token, expires_at: data.expires_at, used_at: null, used_by: null, created_at: new Date().toISOString() });
    setLoading(false);
  }

  async function revokeInvite() {
    setLoading(true);
    if (invite?.id) await fetch("/api/doctor/invite", { method: "DELETE", body: JSON.stringify({ inviteId: invite.id }), headers: { "Content-Type": "application/json" } });
    setInvite(null);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Users size={18} style={{ color: "#52B788" }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "#5A5A50" }}>ativos</span>
          </div>
          <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{patients.length}</p>
          <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Pacientes vinculados por consentimento</p>
        </div>

        <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(193,68,14,0.1)", border: "1px solid rgba(193,68,14,0.22)" }}>
              <AlertTriangle size={18} style={{ color: "#F4A261" }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "#5A5A50" }}>prioridade</span>
          </div>
          <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{reviewCount}</p>
          <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Pacientes para revisar agora</p>
        </div>

        <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(244,162,97,0.1)", border: "1px solid rgba(244,162,97,0.22)" }}>
              <Clock3 size={18} style={{ color: "#F4A261" }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "#5A5A50" }}>follow-up</span>
          </div>
          <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{followupCount}</p>
          <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Pacientes para acompanhar</p>
        </div>

        <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <CheckCircle2 size={18} style={{ color: "#52B788" }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "#5A5A50" }}>estáveis</span>
          </div>
          <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{stableCount}</p>
          <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Sem ação imediata no radar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <div className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "#9A9688" }}>
                  <BarChart3 size={14} style={{ color: "#52B788" }} /> Radar clínico
                </h2>
                <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>Lista priorizada com dados reais de vínculo, exames e biomarcadores. Não emite diagnóstico nem conduta autônoma.</p>
              </div>
              <div className="relative w-full lg:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#5A5A50" }} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar paciente"
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#E8E4D9" }}
                />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {[
                { value: "all", label: "Todos" },
                { value: "review", label: "Revisar" },
                { value: "followup", label: "Acompanhar" },
                { value: "stable", label: "Estáveis" },
              ].map((item) => {
                const active = filter === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => setFilter(item.value as PatientFilter)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-80"
                    style={{
                      background: active ? "rgba(82,183,136,0.12)" : "rgba(255,255,255,0.04)",
                      border: active ? "1px solid rgba(82,183,136,0.24)" : "1px solid rgba(255,255,255,0.07)",
                      color: active ? "#52B788" : "#9A9688",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {patients.length === 0 ? (
              <div className="rounded-3xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                <Users size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
                <p className="text-sm font-medium mt-3" style={{ color: "#E8E4D9" }}>Nenhum paciente vinculado ainda</p>
                <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: "#9A9688" }}>Gere um convite para que o paciente inicie o vínculo e autorize o compartilhamento dos dados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPatients.map((patient) => {
                  const patientName = patient.patient?.name ?? "Paciente";
                  return (
                    <Link key={patient.id} href={`/doctor/patient/${patient.patient_id}`}
                      className="group flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-5 p-4 rounded-2xl transition-all hover:opacity-90"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate" style={{ color: "#E8E4D9" }}>{patientName}</p>
                          <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={getSignalStyle(patient.signal)}>
                            {getSignalLabel(patient.signal)}
                          </span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>
                          {patient.signal_reason} · vínculo ativo há {patient.days_linked} {patient.days_linked === 1 ? "dia" : "dias"}
                        </p>
                        <p className="text-xs mt-2 font-medium" style={{ color: "#9A9688" }}>{patient.next_action}</p>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:w-[560px]">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider" style={{ color: "#5A5A50" }}>Alterados</p>
                          <p className="text-xs font-medium mt-1" style={{ color: patient.altered_biomarkers > 0 ? "#F4A261" : "#9A9688" }}>{patient.altered_biomarkers}/{patient.total_biomarkers}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider" style={{ color: "#5A5A50" }}>Exames</p>
                          <p className="text-xs font-medium mt-1" style={{ color: "#9A9688" }}>{patient.document_count}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider" style={{ color: "#5A5A50" }}>Último dado</p>
                          <p className="text-xs font-medium mt-1" style={{ color: "#9A9688" }}>{formatDaysWithoutData(patient.days_since_latest_data)}</p>
                        </div>
                        <div className="hidden lg:flex items-center justify-end">
                          <ChevronRight size={17} style={{ color: "#5A5A50" }} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
              <ClipboardList size={18} style={{ color: "#52B788" }} />
              <p className="text-sm font-semibold mt-3" style={{ color: "#E8E4D9" }}>Tarefas clínicas</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9A9688" }}>{alteredBiomarkerCount} biomarcadores alterados no radar; {withoutRecentDataCount} pacientes sem dado recente.</p>
            </div>
            <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
              <FileText size={18} style={{ color: "#52B788" }} />
              <p className="text-sm font-semibold mt-3" style={{ color: "#E8E4D9" }}>Relatório pré-consulta</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9A9688" }}>Próxima etapa: resumo longitudinal com peso, exames, hábitos e pontos de atenção revisáveis.</p>
            </div>
            <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
              <ShieldCheck size={18} style={{ color: "#52B788" }} />
              <p className="text-sm font-semibold mt-3" style={{ color: "#E8E4D9" }}>Trilha auditável</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9A9688" }}>Toda revisão clínica futura deve registrar fonte, versão, confiança e decisão humana.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
              <UserPlus size={14} style={{ color: "#52B788" }} /> Convite para paciente
            </h2>

            {invite ? (
              <DoctorInviteQR
                token={invite.token}
                expiresAt={invite.expires_at}
                baseUrl={baseUrl}
                onRevoke={revokeInvite}
                onGenerate={generateInvite}
                loading={loading}
              />
            ) : (
              <div className="rounded-3xl p-6 text-center space-y-4" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-sm" style={{ color: "#9A9688" }}>
                  Gere um QR de convite para que seu paciente possa se vincular a você.
                </p>
                <button
                  onClick={generateInvite}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#52B788", color: "#0D0D0B" }}
                >
                  {loading ? "Gerando…" : "Gerar convite"}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-3xl p-5" style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.18)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Regra de segurança do cockpit</h3>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9A9688" }}>
              Esta tela organiza e prioriza dados compartilhados pelo paciente. Qualquer score, insight ou conduta clínica deve ser revisado, editado ou recusado pelo médico antes de chegar ao paciente.
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
    </div>
  );
}
