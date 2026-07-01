"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, AlertTriangle, BrainCircuit, FileText, ArrowRight } from "lucide-react";
import type { DoctorCockpitPatient, DoctorCockpitSignal } from "@/lib/supabase/doctor-queries";
import { getPatientDisplayName, getPatientInitials } from "@/lib/patient-display";

export type PortfolioFilter = "all" | "review" | "followup" | "pending_ai" | "new_exam" | "stale";
export const PORTFOLIO_FILTERS: PortfolioFilter[] = ["all", "review", "followup", "pending_ai", "new_exam", "stale"];

const NEW_EXAM_DAYS = 14;
const STALE_DAYS = 90;

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

function daysSince(date: string | null) {
  if (!date) return null;
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function ageFromDob(dob: string | null) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function formatLastData(days: number | null) {
  if (days === null) return "Sem dados";
  if (days === 0) return "Hoje";
  if (days === 1) return "Há 1 dia";
  if (days < 30) return `Há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "Há 1 mês" : `Há ${months} meses`;
}

function hasNewExam(patient: DoctorCockpitPatient) {
  const d = daysSince(patient.latest_document_date);
  return d !== null && d <= NEW_EXAM_DAYS;
}

function isStale(patient: DoctorCockpitPatient) {
  return patient.days_since_latest_data === null || patient.days_since_latest_data > STALE_DAYS;
}

export function PatientPortfolioClient({ patients, initialFilter = "all" }: { patients: DoctorCockpitPatient[]; initialFilter?: PortfolioFilter }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PortfolioFilter>(initialFilter);

  const filters: { value: PortfolioFilter; label: string; count: number }[] = useMemo(() => [
    { value: "all", label: "Todos", count: patients.length },
    { value: "review", label: "Revisar", count: patients.filter((p) => p.signal === "review").length },
    { value: "followup", label: "Acompanhar", count: patients.filter((p) => p.signal === "followup").length },
    { value: "pending_ai", label: "IA pendente", count: patients.filter((p) => p.pending_ai > 0).length },
    { value: "new_exam", label: "Exame recente", count: patients.filter(hasNewExam).length },
    { value: "stale", label: "Sem dado recente", count: patients.filter(isStale).length },
  ], [patients]);

  const filtered = useMemo(() => patients.filter((p) => {
    // Busca pelo nome real quando existir; cai para o nome de exibição para que pacientes
    // sem nome cadastrado ainda sejam encontráveis.
    const name = p.patient?.name?.trim() || getPatientDisplayName(p.patient);
    const matchesSearch = name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter =
      filter === "all" ? true :
      filter === "review" ? p.signal === "review" :
      filter === "followup" ? p.signal === "followup" :
      filter === "pending_ai" ? p.pending_ai > 0 :
      filter === "new_exam" ? hasNewExam(p) :
      filter === "stale" ? isStale(p) : true;
    return matchesSearch && matchesFilter;
  }), [patients, search, filter]);

  return (
    <section className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9A9688" }}>Carteira de pacientes</h2>
          <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>Ordenada por prioridade clínica. Cada linha mostra o motivo e a próxima ação.</p>
        </div>
        <form className="relative w-full lg:w-80" onSubmit={(e) => e.preventDefault()}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#5A5A50" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente"
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#E8E4D9" }}
          />
        </form>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {filters.map((item) => {
          const active = filter === item.value;
          return (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: active ? "rgba(82,183,136,0.14)" : "rgba(255,255,255,0.04)",
                border: active ? "1px solid rgba(82,183,136,0.3)" : "1px solid rgba(255,255,255,0.07)",
                color: active ? "#52B788" : "#9A9688",
              }}
            >
              {item.label} <span style={{ color: active ? "#52B788" : "#5A5A50" }}>· {item.count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
          <Users size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
          <p className="text-sm font-medium mt-3" style={{ color: "#E8E4D9" }}>Nenhum paciente neste filtro</p>
          <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Ajuste a busca ou o filtro selecionado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const name = getPatientDisplayName(p.patient, p.patient_id);
            const initials = getPatientInitials(p.patient);
            const age = ageFromDob(p.patient?.dob ?? null);
            return (
              <Link
                key={p.id}
                href={`/doctor/patient/${p.patient_id}`}
                className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-2xl transition-colors hover:bg-white/[0.04]"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold self-start"
                  style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>
                  {initials ?? <Users size={16} style={{ color: "#52B788" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base lg:text-lg font-semibold leading-tight truncate max-w-full" title={name} style={{ color: "#E8E4D9" }}>{name}</p>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={getSignalStyle(p.signal)}>
                      {getSignalLabel(p.signal)}
                    </span>
                    {p.pending_ai > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1" style={{ background: "rgba(244,162,97,0.12)", border: "1px solid rgba(244,162,97,0.24)", color: "#F4A261" }}>
                        <BrainCircuit size={11} /> {p.pending_ai} IA
                      </span>
                    )}
                    {hasNewExam(p) && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>
                        Exame recente
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: "#9A9688" }}>
                    {[age !== null ? `${age} anos` : null, p.patient?.sex, `último dado ${formatLastData(p.days_since_latest_data).toLowerCase()}`].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs mt-2" style={{ color: "#9A9688" }}>
                    <span style={{ color: "#5A5A50" }}>Motivo:</span> {p.signal_reason}
                  </p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: "#52B788" }}>
                    Ação: {p.next_action}
                  </p>
                </div>

                <div className="flex items-center gap-5 lg:gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1" style={{ color: p.altered_biomarkers > 0 ? "#F4A261" : "#5A5A50" }}>
                      <AlertTriangle size={13} />
                      <span className="text-sm font-bold">{p.altered_biomarkers}</span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "#5A5A50" }}>alterados</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1" style={{ color: "#9A9688" }}>
                      <FileText size={13} />
                      <span className="text-sm font-bold">{p.document_count}</span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "#5A5A50" }}>exames</p>
                  </div>
                  <ArrowRight size={16} style={{ color: "#5A5A50" }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
