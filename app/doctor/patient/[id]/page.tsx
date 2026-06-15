import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile, getLinkedPatientPanel, getWatchedBiomarkers, getPatientLatestMetabolicAnalysis } from "@/lib/supabase/doctor-queries";
import { WatchedBiomarkerToggle } from "@/components/doctor/WatchedBiomarkerToggle";
import { ConsultationPrepClient } from "@/components/doctor/ConsultationPrepClient";
import { MetabolicInsightsCard } from "@/components/overview/MetabolicInsightsCard";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { STATUS_SEVERITY, isOutOfRange } from "@/components/shared/BiomarkerCard";
import { HealthMetricCard } from "@/components/dashboard/MetricCards";
import { AlertTriangle, FileText, FlaskConical, ArrowLeft, ShieldAlert, User } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

type PanelBiomarker = {
  id: string; slug: string; name: string; value: string; unit: string;
  status: string; trend: string; category: string; last_date: string | null;
  reference: Record<string, unknown> | null;
};

function age(dob: string | null): string {
  if (!dob) return "";
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return Number.isFinite(years) ? `${years} anos` : "";
}

export default async function DoctorPatientPage({ params }: Props) {
  const { id } = await params;

  const [profile, doctorProfile, panel, watched, metabolicRun] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getLinkedPatientPanel(id),
    getWatchedBiomarkers(id),
    getPatientLatestMetabolicAnalysis(id),
  ]);
  const watchedSlugs = new Set(watched.map((w) => w.slug));

  if (!doctorProfile) redirect("/doctor/setup");
  // Sem vínculo ativo → não autorizado.
  if (!panel) notFound();

  const sorted = [...panel.biomarkers].sort(
    (a, b) => (STATUS_SEVERITY[b.status] ?? 0) - (STATUS_SEVERITY[a.status] ?? 0)
  );
  const outOfRange = sorted.filter((b) => isOutOfRange(b.status));
  const attention = sorted.filter((b) => b.status === "attention");
  const normal = sorted.filter((b) => b.status === "optimal");
  const normalCategories = [...new Set(normal.map((b) => b.category))];

  const historyBySlug = panel.history.reduce<Record<string, { date: string; value: number }[]>>((acc, h) => {
    (acc[h.biomarker_slug] ??= []).push({ date: h.date_label, value: Number(h.value) });
    return acc;
  }, {});

  const renderCard = (b: PanelBiomarker) => (
    <div key={b.id} className="relative">
      <WatchedBiomarkerToggle
        patientId={id}
        slug={b.slug}
        name={b.name}
        initialWatched={watchedSlugs.has(b.slug)}
      />
      <HealthMetricCard
        name={b.name}
        value={b.value}
        unit={b.unit}
        status={b.status}
        trend={b.trend}
        lastDate={b.last_date ?? new Date().toISOString()}
        category={b.category}
        slug={b.slug}
        history={historyBySlug[b.slug] ?? []}
        reference={(b.reference as Record<string, number>) ?? undefined}
      />
    </div>
  );

  const patientName = panel.patient?.name ?? "Paciente";
  const ageLabel = age(panel.patient?.dob ?? null);

  return (
    <DashboardLayout userName={profile?.name}>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">

        <Link href="/doctor" className="inline-flex items-center gap-2 text-sm transition-all hover:opacity-80" style={{ color: "#9A9688" }}>
          <ArrowLeft size={16} /> Voltar ao painel
        </Link>

        {/* Cabeçalho do paciente */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <User size={18} style={{ color: "#52B788" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#E8E4D9" }}>{patientName}</h1>
            <p className="text-sm mt-0.5" style={{ color: "#9A9688" }}>
              {[ageLabel, panel.patient?.sex].filter(Boolean).join(" · ") || "Paciente vinculado"}
            </p>
          </div>
        </div>

        {/* Preparação de consulta */}
        <ConsultationPrepClient patientId={id} />

        {/* Padrões metabólicos da última análise automática */}
        {metabolicRun && <MetabolicInsightsCard run={metabolicRun} />}

        {/* Resumo de alertas */}
        <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} style={{ color: outOfRange.length ? "#C1440E" : "#52B788" }} />
            <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>
              {outOfRange.length > 0
                ? `${outOfRange.length} biomarcador(es) fora do intervalo`
                : "Nenhum biomarcador fora do intervalo"}
            </p>
          </div>
          {attention.length > 0 && (
            <p className="text-xs mt-1" style={{ color: "#F4A261" }}>
              {attention.length} em atenção (perto do limite)
            </p>
          )}
        </div>

        {/* Fora do intervalo */}
        {outOfRange.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
              <AlertTriangle size={14} style={{ color: "#C1440E" }} /> Fora do intervalo ({outOfRange.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {outOfRange.map(renderCard)}
            </div>
          </div>
        )}

        {/* Atenção / perto do limite */}
        {attention.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
              <FlaskConical size={14} style={{ color: "#F4A261" }} /> Atenção ({attention.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {attention.map(renderCard)}
            </div>
          </div>
        )}

        {/* Últimos exames */}
        {panel.documents.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
              <FileText size={14} style={{ color: "#52B788" }} /> Últimos exames ({panel.documents.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {panel.documents.map((d) => (
                <div key={d.id} className="rounded-2xl p-4 space-y-1" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{d.title}</p>
                  {d.lab && <p className="text-xs" style={{ color: "#5A5A50" }}>{d.lab}</p>}
                  <p className="text-xs" style={{ color: "#5A5A50" }}>
                    {new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dentro do intervalo — agrupado por categoria, sempre visível */}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {items.map(renderCard)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {panel.biomarkers.length === 0 && panel.documents.length === 0 && (
          <p className="text-sm" style={{ color: "#5A5A50" }}>
            Este paciente ainda não possui exames ou biomarcadores cadastrados.
          </p>
        )}

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
