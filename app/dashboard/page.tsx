import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BiomarkerPanel } from "@/components/dashboard/BiomarkerPanel";
import { PreventiveReminderCard, RiskAreaCard, RecentDocumentCard } from "@/components/dashboard/EventCards";
import { CollapsibleList } from "@/components/dashboard/CollapsibleList";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getProfile, getBiomarkers, getBiomarkerHistory, getDocuments, getPreventiveReminders, getDoctors, getMedications, getFamilyHistory } from "@/lib/supabase/queries";
import { getLinkedDoctors, getIsDoctor } from "@/lib/supabase/doctor-queries";
import { getClinicalAdminProfile } from "@/lib/supabase/clinical-admin-queries";
import { Activity, ArrowRight, FlaskConical, Stethoscope, Upload } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { HealthOrganizationScoreCard } from "@/components/dashboard/HealthOrganizationScoreCard";
import { NextBestActionCard } from "@/components/dashboard/NextBestActionCard";
import { LatestExamSummaryCard } from "@/components/dashboard/LatestExamSummaryCard";
import { CompactTrendsCard, type CompactTrend } from "@/components/dashboard/CompactTrendsCard";
import { RoutineQuickCard } from "@/components/dashboard/RoutineQuickCard";
import { ConsultationReminderCard } from "@/components/dashboard/ConsultationReminderCard";
import { ShareWithDoctorCard } from "@/components/dashboard/ShareWithDoctorCard";
import { computeOrganizationScore, nextBestAction, type ScoreSignal } from "@/lib/health-organization-score";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const clinicalAdmin = await getClinicalAdminProfile();
  if (clinicalAdmin) redirect("/doctor/admin");

  const [profile, biomarkers, history, documents, reminders, doctors, linkedDoctors, medications, familyHistory, isDoctor] = await Promise.all([
    getProfile(),
    getBiomarkers(),
    getBiomarkerHistory(),
    getDocuments(),
    getPreventiveReminders(),
    getDoctors(),
    getLinkedDoctors(),
    getMedications(),
    getFamilyHistory(),
    getIsDoctor(),
  ]);

  const userName = profile?.name ?? "Usuário";

  const historyBySlug = history.reduce<Record<string, { date_label: string; value: number }[]>>((acc, h) => {
    if (!acc[h.biomarker_slug]) acc[h.biomarker_slug] = [];
    acc[h.biomarker_slug].push({ date_label: h.date_label, value: Number(h.value) });
    return acc;
  }, {});

  // ── Score de Organização da Saúde (determinístico) ──────────────────────────
  const comparableCount = Object.values(historyBySlug).filter((pts) => pts.length >= 2).length;
  const signal: ScoreSignal = {
    hasExam: documents.length > 0,
    comparableCount,
    hasLinkedDoctor: linkedDoctors.length > 0,
    hasMeds: medications.length > 0,
    hasFamilyHistory: familyHistory.length > 0,
  };
  const orgScore = computeOrganizationScore(signal);

  // ── Último exame ────────────────────────────────────────────────────────────
  const latestExamDate = documents[0]?.date ?? null;
  const examFound = biomarkers.length;
  const examOutOfRange = biomarkers.filter((b) => b.status !== "optimal").length;
  const examRelevantChange = biomarkers.filter((b) => b.trend && b.trend !== "stable").length;

  const nextAction = nextBestAction(signal, examOutOfRange);

  // ── Biomarcadores ordenados (alertas primeiro) para o painel ────────────────
  const statusOrder: Record<string, number> = { critical: 0, high: 1, low: 1, attention: 2, optimal: 3 };
  const biomarkerItems = [...biomarkers]
    .sort((a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4))
    .map((b) => ({
      id: b.id, name: b.name, value: b.value, unit: b.unit, status: b.status, trend: b.trend,
      category: b.category, lastDate: b.last_date, slug: b.slug,
      history: (historyBySlug[b.slug] ?? []).map((h) => ({ date: h.date_label, value: h.value })),
      reference: b.reference as Record<string, number>,
    }));

  // ── Tendências compactas (penúltimo → último) ───────────────────────────────
  const compactTrends: CompactTrend[] = biomarkers
    .filter((b) => (historyBySlug[b.slug]?.length ?? 0) >= 2)
    .slice(0, 3)
    .map((b) => {
      const pts = historyBySlug[b.slug];
      const from = pts[pts.length - 2].value;
      const to = pts[pts.length - 1].value;
      const direction: CompactTrend["direction"] = to > from ? "up" : to < from ? "down" : "stable";
      return { name: b.name, from, to, unit: b.unit, direction, improving: b.status === "optimal" };
    });

  const hasNonOptimal = biomarkers.some(b => b.status !== "optimal");
  const overdueDoctoralerts = doctors.filter(doc => {
    if (!doc.last_exam_date) return false;
    const days = Math.floor((Date.now() - new Date(doc.last_exam_date).getTime()) / 86400000);
    return days > 180 && hasNonOptimal;
  }).slice(0, 2);

  return (
    <DashboardLayout userName={userName} isDoctor={isDoctor}>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-5 lg:space-y-8">

        {/* Header */}
        <div>
          <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
          <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>
            Olá, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: "#9A9688" }}>Sua saúde organizada em um só lugar.</p>
        </div>

        {/* Nova Home — grade de organização */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <HealthOrganizationScoreCard score={orgScore} nextAction={nextAction} />
          <div className="flex flex-col gap-5">
            <NextBestActionCard action={nextAction} />
            <LatestExamSummaryCard
              examDate={latestExamDate}
              found={examFound}
              outOfRange={examOutOfRange}
              relevantChange={examRelevantChange}
            />
          </div>
        </div>

        {/* Banner de boas-vindas — primeiro acesso */}
        {biomarkers.length === 0 && documents.length === 0 && (
          <div className="rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
            style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.18)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Upload size={20} style={{ color: "#52B788" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Envie seu primeiro exame de sangue</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9A9688" }}>
                Faça upload de um laudo laboratorial real para extrair seus biomarcadores automaticamente e começar a monitorar sua saúde preventiva.
              </p>
            </div>
            <Link href="/documents"
              className="shrink-0 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "#52B788", color: "#0D0D0B" }}>
              Enviar exame
            </Link>
          </div>
        )}

        {/* Biomarcadores */}
        {biomarkers.length === 0 && documents.length > 0 && (
          <EmptyState
            icon={FlaskConical}
            title="Nenhum biomarcador extraído ainda"
            description="Envie um laudo laboratorial para começar a monitorar seus biomarcadores."
            action={{ label: "Enviar exame", href: "/documents" }}
          />
        )}
        {/* Biomarcadores principais — alertas primeiro, com expandir */}
        <BiomarkerPanel items={biomarkerItems} />

        {/* Cards secundários — depois dos biomarcadores */}
        {biomarkers.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <CompactTrendsCard trends={compactTrends} />
            <RoutineQuickCard />
            <ConsultationReminderCard />
            <ShareWithDoctorCard />
          </div>
        )}

        {/* Bottom grid — só exibe se houver dados */}
        {(reminders.length > 0 || documents.length > 0 || biomarkers.length > 0) && (
          <div className="grid lg:grid-cols-3 gap-6">
            {reminders.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#5A5A50" }}>Lembretes preventivos</h2>
                <CollapsibleList
                  limit={3}
                  items={reminders.map(r => (
                    <PreventiveReminderCard
                      key={r.id}
                      title={r.title}
                      description={r.description ?? ""}
                      daysUntil={r.due_date ? Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000) : 0}
                      priority={r.priority}
                    />
                  ))}
                />
              </div>
            )}
            {documents.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#5A5A50" }}>Documentos recentes</h2>
                <div className="space-y-2">
                  {documents.slice(0, 4).map(d => (
                    <RecentDocumentCard
                      key={d.id}
                      title={d.title}
                      type={d.type}
                      date={d.date}
                      lab={d.lab ?? ""}
                      status={d.status}
                      tags={d.tags ?? []}
                    />
                  ))}
                </div>
              </div>
            )}
            {biomarkers.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#5A5A50" }}>Áreas de atenção</h2>
                <CollapsibleList
                  limit={3}
                  items={[
                    ...biomarkers.filter(b => b.status !== "optimal").map(b => (
                      <RiskAreaCard
                        key={b.id}
                        label={b.name}
                        score={70}
                        description={`Valor atual: ${b.value} ${b.unit}. Monitorar.`}
                        color="yellow"
                      />
                    )),
                    ...biomarkers.filter(b => b.status === "optimal").slice(0, 2).map(b => (
                      <RiskAreaCard
                        key={b.id}
                        label={b.name}
                        score={90}
                        description={`${b.value} ${b.unit} — dentro da faixa ideal.`}
                        color="green"
                      />
                    )),
                  ]}
                />
              </div>
            )}
          </div>
        )}

        {/* Doctor alerts */}
        {overdueDoctoralerts.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#5A5A50" }}>Atenção preventiva</h2>
            <div className="space-y-3">
              {overdueDoctoralerts.map(doc => {
                const months = Math.floor((Date.now() - new Date(doc.last_exam_date!).getTime()) / (86400000 * 30));
                const scheduleUrl = `https://www.doctoralia.com.br/pesquisa?q=${encodeURIComponent(doc.name)}`;
                return (
                  <div key={doc.id} className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{ background: "rgba(244,162,97,0.06)", border: "1px solid rgba(244,162,97,0.2)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(244,162,97,0.1)", border: "1px solid rgba(244,162,97,0.2)" }}>
                      <Stethoscope size={15} style={{ color: "#F4A261" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#E8E4D9" }}>
                        Dr. {doc.name.split(" ").slice(0, 2).join(" ")}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>
                        Sem consulta há {months} {months === 1 ? "mês" : "meses"} — você tem biomarcadores alterados
                      </p>
                    </div>
                    <a href={scheduleUrl} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                      style={{ background: "#F4A261", color: "#0D0D0B" }}>
                      Agendar
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Body map teaser */}
        <Link href="/body-map">
          <div className="group rounded-3xl p-5 flex items-center gap-5 cursor-pointer transition-all duration-200 border hover:border-[rgba(82,183,136,0.3)]"
            style={{ background: "#141412", borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.15)" }}>
              <Activity size={24} style={{ color: "#52B788" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Mapa Corporal Interativo</p>
              <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>Visualize cada sistema monitorado diretamente na figura humana com pontos de atenção em tempo real.</p>
            </div>
            <ArrowRight size={16} style={{ color: "#52B788", flexShrink: 0 }} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <MedicalDisclaimer />
      </div>
    </DashboardLayout>
  );
}
