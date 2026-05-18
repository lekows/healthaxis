import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge } from "@/components/ui";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getBiomarkers, getBiomarkerHistory, getDocuments, getProfile } from "@/lib/supabase/queries";
import { FlaskConical, Filter } from "lucide-react";
import { BiomarkerTrendCard } from "@/components/dashboard/MetricCards";

export default async function ExamsPage() {
  const [profile, biomarkers, history, documents] = await Promise.all([
    getProfile(),
    getBiomarkers(),
    getBiomarkerHistory(),
    getDocuments(),
  ]);

  const historyBySlug = history.reduce<Record<string, { date: string; value: number }[]>>((acc, h) => {
    if (!acc[h.biomarker_slug]) acc[h.biomarker_slug] = [];
    acc[h.biomarker_slug].push({ date: h.date_label, value: Number(h.value) });
    return acc;
  }, {});

  const categories = [...new Set(biomarkers.map(b => b.category))];

  return (
    <DashboardLayout userName={profile?.name}>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Exames</h1>
            <p className="text-ink-muted text-sm mt-1">Resultados laboratoriais e biomarcadores registrados.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-border-soft text-sm text-ink-muted hover:bg-canvas-subtle transition-all">
            <Filter size={14} /> Filtrar
          </button>
        </div>

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
                    return <BiomarkerTrendCard key={b.id} name={b.name} value={Number(b.value)} unit={b.unit} status={b.status} history={hist} />;
                  }
                  return (
                    <Card key={b.id} className="p-5">
                      <p className="text-sm font-semibold text-ink">{b.name}</p>
                      <div className="flex items-end gap-1 mt-2 mb-3">
                        <span className="text-2xl font-bold text-ink">{b.value}</span>
                        <span className="text-xs text-ink-faint mb-1">{b.unit}</span>
                      </div>
                      <Badge variant={b.status === "optimal" ? "success" : b.status === "attention" ? "warning" : "danger"}>
                        {b.status === "optimal" ? "Ótimo" : b.status === "attention" ? "Atenção" : "Risco"}
                      </Badge>
                    </Card>
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
