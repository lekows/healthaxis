"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FlaskConical, FileText, ArrowUpRight, ArrowDownRight, Minus, CheckCircle2, Circle } from "lucide-react";
import type { DoctorNewExam, ExamChange } from "@/lib/supabase/doctor-queries";

export type ExamsFilter = "all" | "unreviewed" | "altered" | "new";

const NON_OPTIMAL = new Set(["critical", "high", "low", "attention"]);

function formatDate(date: string | null) {
  if (!date) return "Sem data";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function DeltaBadge({ change }: { change: ExamChange }) {
  const altered = NON_OPTIMAL.has(change.status);
  const color = altered ? "#F4A261" : "#52B788";
  const dir = change.delta === null ? "flat" : change.delta > 0 ? "up" : change.delta < 0 ? "down" : "flat";
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#E8E4D9" }}>
      <span style={{ color }}>{change.name}</span>
      <span style={{ color: "#9A9688" }}>{change.value}{change.unit ? ` ${change.unit}` : ""}</span>
      {change.delta !== null && change.previous !== null && (
        <span className="inline-flex items-center gap-0.5" style={{ color }}>
          <Icon size={11} />
          {change.delta > 0 ? "+" : ""}{change.delta}
        </span>
      )}
    </span>
  );
}

export function DoctorExamsClient({ exams }: { exams: DoctorNewExam[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ExamsFilter>("all");

  const filters: { value: ExamsFilter; label: string; count: number }[] = useMemo(() => [
    { value: "all", label: "Todos", count: exams.length },
    { value: "unreviewed", label: "Não revisados", count: exams.filter((e) => !e.reviewed).length },
    { value: "altered", label: "Com alteração", count: exams.filter((e) => e.altered_count > 0).length },
    { value: "new", label: "Novos", count: exams.filter((e) => e.is_new).length },
  ], [exams]);

  const filtered = useMemo(() => exams.filter((e) => {
    const matchesSearch = e.patient_name.toLowerCase().includes(search.trim().toLowerCase()) || e.title.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter =
      filter === "all" ? true :
      filter === "unreviewed" ? !e.reviewed :
      filter === "altered" ? e.altered_count > 0 :
      filter === "new" ? e.is_new : true;
    return matchesSearch && matchesFilter;
  }), [exams, search, filter]);

  return (
    <section className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9A9688" }}>Exames recebidos</h2>
          <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>O que mudou em cada exame vs. a medição anterior. Foco na variação, não no PDF.</p>
        </div>
        <form className="relative w-full lg:w-80" onSubmit={(e) => e.preventDefault()}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#5A5A50" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por paciente ou exame"
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
          <FlaskConical size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
          <p className="text-sm font-medium mt-3" style={{ color: "#E8E4D9" }}>Nenhum exame neste filtro</p>
          <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Ajuste a busca ou o filtro selecionado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exam) => (
            <Link
              key={exam.id}
              href={`/doctor/patient/${exam.patient_id}`}
              className="block p-4 rounded-2xl transition-colors hover:bg-white/[0.04]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{exam.patient_name}</p>
                    {exam.is_new && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>Novo</span>
                    )}
                    {exam.altered_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(244,162,97,0.12)", border: "1px solid rgba(244,162,97,0.24)", color: "#F4A261" }}>{exam.altered_count} alterado(s)</span>
                    )}
                  </div>
                  <p className="text-xs mt-1 inline-flex items-center gap-1.5" style={{ color: "#9A9688" }}>
                    <FileText size={12} /> {exam.title}
                    <span style={{ color: "#5A5A50" }}>· {formatDate(exam.date)}{exam.lab ? ` · ${exam.lab}` : ""}</span>
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: exam.reviewed ? "#52B788" : "#5A5A50" }}>
                  {exam.reviewed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {exam.reviewed ? "Revisado" : "Não revisado"}
                </span>
              </div>

              {exam.changes.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {exam.changes.map((c) => <DeltaBadge key={c.slug} change={c} />)}
                  {exam.measured_count > exam.changes.length && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px]" style={{ color: "#5A5A50" }}>
                      +{exam.measured_count - exam.changes.length} marcador(es)
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs mt-3" style={{ color: "#5A5A50" }}>
                  Variação por exame indisponível para este documento (sem biomarcadores vinculados).
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
