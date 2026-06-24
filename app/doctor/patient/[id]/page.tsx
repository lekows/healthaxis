import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile, getLinkedPatientPanel, getWatchedBiomarkers, getPatientLatestMetabolicAnalysis, logDoctorAccess } from "@/lib/supabase/doctor-queries";
import { getAgentReviewHighlights, getAgentReviewSummary, getPatientAgentRunsForReview } from "@/lib/supabase/agent-review-queries";
import { getCarePlan } from "@/lib/supabase/care-plan-queries";
import { WatchedBiomarkerToggle } from "@/components/doctor/WatchedBiomarkerToggle";
import { ConsultationPrepClient } from "@/components/doctor/ConsultationPrepClient";
import { MetabolicInsightsCard } from "@/components/overview/MetabolicInsightsCard";
import { AgentReviewCard } from "@/components/doctor/AgentReviewCard";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { STATUS_SEVERITY, isOutOfRange } from "@/components/shared/BiomarkerCard";
import { HealthMetricCard } from "@/components/dashboard/MetricCards";
import { AlertTriangle, BarChart3, FileText, FlaskConical, ArrowLeft, ShieldAlert, ShieldCheck, Stethoscope, Clock, BrainCircuit, ClipboardList, FolderOpen, CalendarClock } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

type PanelBiomarker = {
  id: string; slug: string; name: string; value: string; unit: string;
  status: string; trend: string; category: string; last_date: string | null;
  reference: Record<string, unknown> | null;
};

const TABS = [
  { value: "resumo", label: "Resumo", icon: BarChart3 },
  { value: "exames", label: "Exames", icon: FlaskConical },
  { value: "timeline", label: "Linha do tempo", icon: Clock },
  { value: "ia", label: "IA", icon: BrainCircuit },
  { value: "plano", label: "Plano", icon: ClipboardList },
  { value: "relatorios", label: "Relatórios", icon: FileText },
  { value: "documentos", label: "Documentos", icon: FolderOpen },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function age(dob: string | null): string {
  if (!dob) return "";
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return Number.isFinite(years) ? `${years} anos` : "";
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Sem data";
  return new Date(date).toLocaleDateString("pt-BR");
}

export default async function DoctorPatientPage({ params, searchParams }: Props) {
  const { id } = await params;
  const requestedTab = (await searchParams)?.tab;
  const tab: TabValue = TABS.some((t) => t.value === requestedTab) ? (requestedTab as TabValue) : "resumo";

  const [profile, doctorProfile, panel, watched, metabolicRun, agentRuns, carePlan] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getLinkedPatientPanel(id),
    getWatchedBiomarkers(id),
    getPatientLatestMetabolicAnalysis(id),
    getPatientAgentRunsForReview(id),
    getCarePlan(id),
  ]);
  const watchedSlugs = new Set(watched.map((w) => w.slug));

  if (!doctorProfile) redirect("/doctor/setup");
  if (!panel) notFound();

  void logDoctorAccess(doctorProfile.id, id, "panel_view");

  const sorted = [...panel.biomarkers].sort(
    (a, b) => (STATUS_SEVERITY[b.status] ?? 0) - (STATUS_SEVERITY[a.status] ?? 0)
  );
  const outOfRange = sorted.filter((b) => isOutOfRange(b.status));
  const attention = sorted.filter((b) => b.status === "attention");
  const normal = sorted.filter((b) => b.status === "optimal");
  const normalCategories = [...new Set(normal.map((b) => b.category))];
  const alteredCount = outOfRange.length + attention.length;
  const pendingAgentRuns = agentRuns.filter((run) => run.human_decision === "pending");
  const latestDocument = panel.documents[0] ?? null;

  const historyBySlug = panel.history.reduce<Record<string, { date: string; value: number }[]>>((acc, h) => {
    (acc[h.biomarker_slug] ??= []).push({ date: h.date_label, value: Number(h.value) });
    return acc;
  }, {});

  const timelineEvents = [
    ...panel.documents.map((d) => ({ kind: "exam" as const, date: d.date as string | null, title: `Exame: ${d.title}`, sub: d.lab ?? "Documento enviado pelo paciente" })),
    ...agentRuns.map((r) => ({ kind: "ai" as const, date: r.created_at as string | null, title: `Análise de IA: ${r.agent_name}`, sub: `Decisão humana: ${r.human_decision}` })),
  ].filter((e) => e.date).sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

  const renderCard = (b: PanelBiomarker) => (
    <div key={b.id} className="relative">
      <WatchedBiomarkerToggle patientId={id} slug={b.slug} name={b.name} initialWatched={watchedSlugs.has(b.slug)} />
      <HealthMetricCard
        name={b.name} value={b.value} unit={b.unit} status={b.status} trend={b.trend}
        lastDate={b.last_date ?? new Date().toISOString()} category={b.category} slug={b.slug}
        history={historyBySlug[b.slug] ?? []} reference={(b.reference as Record<string, number>) ?? undefined}
      />
    </div>
  );

  const patientName = panel.patient?.name ?? "Paciente";
  const ageLabel = age(panel.patient?.dob ?? null);

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">

        <Link href="/doctor" className="inline-flex items-center gap-2 text-xs font-semibold transition-opacity hover:opacity-80" style={{ color: "#52B788" }}>
          <ArrowLeft size={14} /> Voltar ao cockpit médico
        </Link>

        {/* Cabeçalho */}
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Stethoscope size={19} style={{ color: "#52B788" }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Patient 360</p>
              <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>{patientName}</h1>
              <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
                {[ageLabel, panel.patient?.sex].filter(Boolean).join(" · ") || "Paciente vinculado"}
              </p>
            </div>
          </div>
          <Link href={`/doctor/patient/${id}/report`} className="px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 text-center" style={{ background: "#52B788", color: "#0D0D0B" }}>
            Gerar relatório pré-consulta
          </Link>
        </div>

        {/* Navegação por abas */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <Link
                key={t.value}
                href={`/doctor/patient/${id}?tab=${t.value}`}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors"
                style={{ color: active ? "#52B788" : "#9A9688", borderColor: active ? "#52B788" : "transparent" }}
              >
                <t.icon size={14} /> {t.label}
                {t.value === "ia" && pendingAgentRuns.length > 0 && (
                  <span className="ml-0.5 px-1.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(244,162,97,0.18)", color: "#F4A261" }}>{pendingAgentRuns.length}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* RESUMO */}
        {tab === "resumo" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                <BarChart3 size={18} style={{ color: "#52B788" }} />
                <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{panel.biomarkers.length}</p>
                <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Biomarcadores disponíveis</p>
              </div>
              <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                <AlertTriangle size={18} style={{ color: "#F4A261" }} />
                <p className="text-3xl font-bold mt-4" style={{ color: outOfRange.length > 0 ? "#F4A261" : "#E8E4D9" }}>{alteredCount}</p>
                <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Fora da faixa/atenção</p>
              </div>
              <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                <FileText size={18} style={{ color: "#52B788" }} />
                <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{panel.documents.length}</p>
                <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Documentos recentes</p>
              </div>
              <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                <ShieldCheck size={18} style={{ color: "#52B788" }} />
                <p className="text-3xl font-bold mt-4" style={{ color: pendingAgentRuns.length > 0 ? "#F4A261" : "#E8E4D9" }}>{pendingAgentRuns.length}</p>
                <p className="text-xs mt-1" style={{ color: "#9A9688" }}>IA pendente de revisão</p>
              </div>
            </div>

            <section className="rounded-3xl p-5 lg:p-6" style={{ background: "rgba(244,162,97,0.06)", border: "1px solid rgba(244,162,97,0.18)" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "#F4A261" }}>
                <FileText size={14} /> Resumo executivo para revisão médica
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>Prioridade</p>
                  <p className="mt-1" style={{ color: "#E8E4D9" }}>{outOfRange.length > 0 ? "Revisar biomarcadores fora do intervalo" : alteredCount > 0 ? "Acompanhar alterações" : "Sem alerta laboratorial imediato"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>Último documento</p>
                  <p className="mt-1" style={{ color: "#E8E4D9" }}>{latestDocument ? `${latestDocument.title} · ${formatDate(latestDocument.date)}` : "Nenhum documento recente"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "#5A5A50" }}>IA revisável</p>
                  <p className="mt-1" style={{ color: "#E8E4D9" }}>{agentRuns.length > 0 ? `${agentRuns.length} análise(s), ${pendingAgentRuns.length} pendente(s)` : "Nenhuma análise metabólica concluída"}</p>
                </div>
              </div>
            </section>

            <ConsultationPrepClient patientId={id} />
            {metabolicRun && <MetabolicInsightsCard run={metabolicRun} />}

            <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} style={{ color: outOfRange.length ? "#C1440E" : "#52B788" }} />
                <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>
                  {outOfRange.length > 0 ? `${outOfRange.length} biomarcador(es) fora do intervalo` : "Nenhum biomarcador fora do intervalo"}
                </p>
              </div>
              {attention.length > 0 && <p className="text-xs mt-1" style={{ color: "#F4A261" }}>{attention.length} em atenção (perto do limite)</p>}
            </div>
          </div>
        )}

        {/* EXAMES (biomarcadores) */}
        {tab === "exames" && (
          <div className="space-y-6">
            {outOfRange.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
                  <AlertTriangle size={14} style={{ color: "#C1440E" }} /> Fora do intervalo ({outOfRange.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{outOfRange.map(renderCard)}</div>
              </div>
            )}
            {attention.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
                  <FlaskConical size={14} style={{ color: "#F4A261" }} /> Atenção ({attention.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{attention.map(renderCard)}</div>
              </div>
            )}
            {normal.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "#9A9688" }}>
                  <FlaskConical size={14} style={{ color: "#52B788" }} /> Dentro do intervalo ({normal.length})
                </h2>
                {normalCategories.map((cat) => {
                  const items = normal.filter((b) => b.category === cat);
                  return (
                    <div key={cat}>
                      <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "#5A5A50" }}>{cat}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{items.map(renderCard)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {panel.biomarkers.length === 0 && (
              <p className="text-sm" style={{ color: "#5A5A50" }}>Este paciente ainda não possui biomarcadores cadastrados.</p>
            )}
          </div>
        )}

        {/* LINHA DO TEMPO */}
        {tab === "timeline" && (
          <div>
            {timelineEvents.length === 0 ? (
              <p className="text-sm" style={{ color: "#5A5A50" }}>Sem eventos clínicos registrados ainda.</p>
            ) : (
              <div className="space-y-3">
                {timelineEvents.map((e, i) => (
                  <div key={i} className="flex gap-3 p-4 rounded-2xl" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: e.kind === "ai" ? "rgba(244,162,97,0.1)" : "rgba(82,183,136,0.1)", border: `1px solid ${e.kind === "ai" ? "rgba(244,162,97,0.22)" : "rgba(82,183,136,0.2)"}` }}>
                      {e.kind === "ai" ? <BrainCircuit size={15} style={{ color: "#F4A261" }} /> : <FlaskConical size={15} style={{ color: "#52B788" }} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{e.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>{e.sub}</p>
                    </div>
                    <p className="text-xs ml-auto whitespace-nowrap" style={{ color: "#5A5A50" }}>{formatDate(e.date)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* IA */}
        {tab === "ia" && (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: "#5A5A50" }}>Aceite, edite ou rejeite interpretações automatizadas antes de qualquer uso clínico. Toda decisão é registrada.</p>
            {agentRuns.length === 0 ? (
              <p className="text-sm" style={{ color: "#5A5A50" }}>Nenhuma análise de IA concluída para este paciente.</p>
            ) : (
              agentRuns.map((agentRun) => (
                <AgentReviewCard key={agentRun.id} agentRun={agentRun} patientId={id} summary={getAgentReviewSummary(agentRun)} highlights={getAgentReviewHighlights(agentRun)} />
              ))
            )}
          </div>
        )}

        {/* PLANO (Fase 6) */}
        {tab === "plano" && (
          carePlan ? (
            <div className="space-y-6">
              <div className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#E8E4D9" }}>
                    <ClipboardList size={15} style={{ color: "#52B788" }} /> {carePlan.title}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>{carePlan.status}</span>
                </div>
                {carePlan.summary && <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9A9688" }}>{carePlan.summary}</p>}
                {carePlan.latest_check_in && (
                  <p className="text-xs mt-3" style={{ color: "#5A5A50" }}>
                    Último check-in: {formatDate(carePlan.latest_check_in.created_at)}
                    {carePlan.latest_check_in.adherence !== null ? ` · adesão ${carePlan.latest_check_in.adherence}%` : ""}
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#9A9688" }}>Metas ({carePlan.goals.length})</h3>
                {carePlan.goals.length === 0 ? (
                  <p className="text-xs" style={{ color: "#5A5A50" }}>Nenhuma meta definida.</p>
                ) : (
                  <div className="space-y-2">
                    {carePlan.goals.map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div>
                          <p className="text-sm" style={{ color: "#E8E4D9" }}>{g.description}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>{[g.metric, g.target, g.due_date ? `até ${formatDate(g.due_date)}` : null].filter(Boolean).join(" · ")}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#9A9688" }}>{g.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#9A9688" }}>Hábitos prescritos ({carePlan.habits.length})</h3>
                {carePlan.habits.length === 0 ? (
                  <p className="text-xs" style={{ color: "#5A5A50" }}>Nenhum hábito prescrito.</p>
                ) : (
                  <div className="space-y-2">
                    {carePlan.habits.map((h) => (
                      <div key={h.id} className="p-4 rounded-2xl" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <p className="text-sm" style={{ color: "#E8E4D9" }}>{h.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>{[h.frequency, h.notes].filter(Boolean).join(" · ")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl p-8 text-center" style={{ background: "#141412", border: "1px dashed rgba(255,255,255,0.12)" }}>
              <ClipboardList size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
              <p className="text-sm font-semibold mt-3" style={{ color: "#E8E4D9" }}>Sem plano de cuidado ativo</p>
              <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: "#9A9688" }}>
                Metas, hábitos prescritos pelo médico, check-ins e adesão. O editor de criação entra após aplicar a migração <code>care_plans</code> no Supabase, com trilha de auditoria e médico no comando.
              </p>
              <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>
                <CalendarClock size={12} /> Próxima grande etapa
              </div>
            </div>
          )
        )}

        {/* RELATÓRIOS */}
        {tab === "relatorios" && (
          <div className="rounded-3xl p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#E8E4D9" }}>
              <FileText size={15} style={{ color: "#52B788" }} /> Relatório pré-consulta
            </h2>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9A9688" }}>
              Resumo longitudinal com exames, alterações e pontos de atenção para revisão antes do atendimento. O médico decide, edita ou rejeita qualquer interpretação.
            </p>
            <Link href={`/doctor/patient/${id}/report`} className="inline-block mt-4 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: "#52B788", color: "#0D0D0B" }}>
              Gerar relatório pré-consulta
            </Link>
          </div>
        )}

        {/* DOCUMENTOS */}
        {tab === "documentos" && (
          <div>
            {panel.documents.length === 0 ? (
              <p className="text-sm" style={{ color: "#5A5A50" }}>Nenhum documento enviado ainda.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {panel.documents.map((d) => (
                  <div key={d.id} className="rounded-2xl p-4 space-y-1" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{d.title}</p>
                    {d.lab && <p className="text-xs" style={{ color: "#5A5A50" }}>{d.lab}</p>}
                    <p className="text-xs" style={{ color: "#5A5A50" }}>{new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
