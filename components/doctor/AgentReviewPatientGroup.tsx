"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, ChevronDown, ChevronRight } from "lucide-react";
import { AgentReviewCard, decisionLabel, decisionStyle } from "@/components/doctor/AgentReviewCard";
import { getPatientDisplayName, getPatientInitials } from "@/lib/patient-display";
import { getAgentDisplayName } from "@/lib/agent-display";
import type { AgentRunForReview, AgentReviewQueueItem } from "@/lib/supabase/agent-review-queries";

export interface GroupReview {
  review: AgentRunForReview;
  summary: string;
  highlights: string[];
}

interface Props {
  patient: AgentReviewQueueItem["patient"];
  patientId: string;
  pendingCount: number;
  latest: GroupReview;
  older: GroupReview[];
}

function age(dob: string | null | undefined): string {
  if (!dob) return "";
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  return Number.isFinite(years) ? `${years} anos` : "";
}

function reviewDate(review: AgentRunForReview): string | null {
  return review.completed_at ?? review.created_at ?? null;
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 60000) return "agora";
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `há ${mo} ${mo === 1 ? "mês" : "meses"}`;
  const y = Math.floor(d / 365);
  return `há ${y} ano${y > 1 ? "s" : ""}`;
}

export function AgentReviewPatientGroup({ patient, patientId, pendingCount, latest, older }: Props) {
  const [showOlder, setShowOlder] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const displayName = getPatientDisplayName(patient, patientId);
  const initials = getPatientInitials(patient);

  const total = older.length + 1;
  const countLabel = pendingCount > 0
    ? `${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`
    : `${total} análise${total > 1 ? "s" : ""}`;
  const latestRel = relativeTime(reviewDate(latest.review));
  const subline = [
    age(patient?.dob),
    patient?.sex,
    countLabel,
    latestRel ? `última ${latestRel}` : null,
  ].filter(Boolean).join(" · ");

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3 rounded-3xl p-4 lg:p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Cabeçalho do paciente */}
      <Link href={`/doctor/patient/${patientId}`} className="flex items-center gap-3 group transition-opacity hover:opacity-90">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>
          {initials ?? <Users size={16} style={{ color: "#52B788" }} />}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Paciente</p>
          <p className="text-base lg:text-lg font-semibold leading-tight truncate" title={displayName} style={{ color: "#E8E4D9" }}>
            {displayName}
          </p>
          {subline && <p className="text-xs mt-0.5 truncate" style={{ color: "#9A9688" }}>{subline}</p>}
          <span className="text-xs font-semibold group-hover:underline" style={{ color: "#52B788" }}>
            Abrir Patient 360 →
          </span>
        </div>
      </Link>

      {/* Análise mais recente — aberta por padrão */}
      <AgentReviewCard
        agentRun={latest.review}
        patientId={patientId}
        summary={latest.summary}
        highlights={latest.highlights}
      />

      {/* Análises anteriores — recolhidas por padrão */}
      {older.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowOlder((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ color: "#9A9688" }}
          >
            {showOlder ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {showOlder
              ? "Ocultar anteriores"
              : `Ver ${older.length} análise${older.length > 1 ? "s" : ""} anterior${older.length > 1 ? "es" : ""}`}
          </button>

          {showOlder && (
            <div className="space-y-2">
              {older.map(({ review, summary, highlights }) => {
                const expanded = expandedIds.has(review.id);
                return (
                  <div key={review.id} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(review.id)}
                      className="w-full flex items-center gap-2 flex-wrap rounded-2xl px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                      title={review.agent_name}
                    >
                      {expanded ? <ChevronDown size={13} style={{ color: "#5A5A50" }} /> : <ChevronRight size={13} style={{ color: "#5A5A50" }} />}
                      <span className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{getAgentDisplayName(review.agent_name)}</span>
                      <span className="text-xs" style={{ color: "#5A5A50" }}>{shortDate(reviewDate(review))}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={decisionStyle(review.human_decision)}>
                        {decisionLabel(review.human_decision)}
                      </span>
                      {review.confidence_score != null && (
                        <span className="text-xs" style={{ color: "#5A5A50" }}>conf. {review.confidence_score}</span>
                      )}
                    </button>

                    {expanded && (
                      <AgentReviewCard
                        agentRun={review}
                        patientId={patientId}
                        summary={summary}
                        highlights={highlights}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
