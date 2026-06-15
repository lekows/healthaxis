import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge } from "@/components/ui";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getBiomarkers, getBiomarkerHistory, getDocuments, getProfile } from "@/lib/supabase/queries";
import { getIsDoctor } from "@/lib/supabase/doctor-queries";
import { FlaskConical, AlertTriangle } from "lucide-react";
import { BiomarkerTrendCard, HealthMetricCard } from "@/components/dashboard/MetricCards";
import { EmptyState } from "@/components/shared/EmptyState";
import { ManualBiomarkerModal } from "@/components/exams/ManualBiomarkerModal";

export default async function ExamsPage() {
  const [profile, biomarkers, history, documents, isDoctor] = await Promise.all([
    getProfile(),
    getBiomarkers(),
    getBiomarkerHistory(),
    getDocuments(),
    getIsDoctor(),
  ]);

  const historyBySlug = history.reduce<Record<string, { date: string; value: number }[]>>((acc, h) => {
    if (!acc[h.biomarker_slug]) acc[h.biomarker_slug] = [];
    acc[h.biomarker_slug].push({ date: h.date_label, value: Number(h.value) });
    return acc;
  }, {});

  const categories = [...new Set(biomarkers.map(b => b.category))];

  const anomalies = biomarkers.filter(b => b.status === "attention" || b.status === "high" || b.status === "low" || b.status === "critical");

  const statusLabel: Record<string, string> = { attention: "Atenção", high: "Elevado", low: "Baixo", critical: "Crítico" };
  const statusVariant: Record<string, "warning" | "danger"> = { attention: "warning", high: "danger", low: "warning", critical: "danger" };

  return (
    <DashboardLayout userName={profile?.name} isDoctor={isDoctor}>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Exames</h1>
            <p className="text-ink-muted text-sm mt-1">Resultados laboratoriais e biomarcadores registrados.</p>
          </div>
          <ManualBiomarkerModal />
        </div>

        {anomalies.length > 0 && (
          <div className="rounded-3xl p-5" style={{ background: "rgba(244,162,97,0.06)", border: "1px solid rgba(244,162,97,0.2)" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} style={{ color: "#F4A261" }} />
              <p className="text-sm font-semibold" style={{ color: "#F4A261" }}>
                {anomalies.length} marcador{anomalies.length > 1 ? "es" : ""} fora do parâmetro ideal
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {anomalies.map(b => (
                <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                  style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-sm font-medium" style={{ color: "#E8E4D9" }}>{b.name}</span>
                  <span className="text-sm font-bold" style={{ color: b.status === "critical" || b.status === "high" ? "#C1440E" : "#F4A261" }}>
                    {b.value} {b.unit}
                  </span>
                  <Badge variant={statusVariant[b.status] ?? "warning"}>
                    {statusLabel[b.status] ?? b.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {biomarkers.length === 0 && (
          <EmptyState
            icon={FlaskConical}
            title="Nenhum biomarcador registrado"
            description="Envie um laudo laboratorial para extrair e visualizar seus resultados automaticamente."
            action={{ label: "Enviar laudo", href: "/documents" }}
          />
        )}

        {categories.map(cat => {
          const items = biomarkers.filter(b => b.category === cat);
          return (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <FlaskConical size={14} className="text-forest" /> {cat}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(b => {
                  const hist = historyBySlug[b.slug];
                  if (hist?.length) {
                    return <BiomarkerTrendCard key={b.id} slug={b.slug} name={b.name} value={Number(b.value)} unit={b.unit} status={b.status} history={hist} reference={b.reference as Record<string, number>} />;
                  }
                  return (
                    <HealthMetricCard
                      key={b.id}
                      name={b.name}
                      value={b.value}
                      unit={b.unit}
                      status={b.status}
                      trend={b.trend}
                      category={b.category}
                      lastDate={b.last_date}
                      slug={b.slug}
                      reference={b.reference as Record<string, number>}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        <div>
          <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4">Laudos de origem</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.filter(d => d.type === "Exame Laboratorial").map(d => (
              <Card key={d.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{d.title}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{d.lab}</p>
                  </div>
                  <Badge variant={d.status === "reviewed" ? "success" : "warning"}>
                    {d.status === "reviewed" ? "Revisado" : "Pendente"}
                  </Badge>
                </div>
                <p className="text-xs text-ink-faint">
                  {new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <div className="flex gap-1 mt-3 flex-wrap">
                  {(d.tags ?? []).map((t: string) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-canvas-subtle text-ink-faint border border-border-soft">{t}</span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
