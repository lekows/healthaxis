import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HealthMetricCard, BiomarkerTrendCard, MetricsGrid } from "@/components/dashboard/MetricCards";
import { PreventiveReminderCard, RiskAreaCard, RecentDocumentCard } from "@/components/dashboard/EventCards";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getProfile, getBiomarkers, getBiomarkerHistory, getDocuments, getPreventiveReminders, getHealthScore } from "@/lib/supabase/queries";
import { Activity, TrendingUp, FileText, Bell, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const [profile, biomarkers, history, documents, reminders, healthScore] = await Promise.all([
    getProfile(),
    getBiomarkers(),
    getBiomarkerHistory(),
    getDocuments(),
    getPreventiveReminders(),
    getHealthScore(),
  ]);

  const userName = profile?.name ?? "Usuário";
  const score = healthScore ?? { overall: 0, metabolic: 0, cardiovascular: 0, lifestyle: 0, preventive: 0 };

  const historyBySlug = history.reduce<Record<string, { date_label: string; value: number }[]>>((acc, h) => {
    if (!acc[h.biomarker_slug]) acc[h.biomarker_slug] = [];
    acc[h.biomarker_slug].push({ date_label: h.date_label, value: Number(h.value) });
    return acc;
  }, {});

  const urgentReminders = reminders.filter(r => r.priority === "high").length;

  return (
    <DashboardLayout userName={userName}>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
          <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>
            Olá, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: "#9A9688" }}>Aqui está um resumo da sua saúde preventiva.</p>
        </div>

        {/* Score + Quick stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-1 p-6 rounded-3xl flex flex-col gap-4 relative overflow-hidden"
            style={{ background: "#1B4332" }}>
            <div className="absolute top-0 right-0 w-40 h-40 blur-3xl opacity-40 pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(82,183,136,0.5) 0%, transparent 70%)" }} />
            <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>Índice Preventivo</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-white">{score.overall}</span>
              <span className="text-lg mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>/100</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div className="h-full rounded-full" style={{ width: `${score.overall}%`, background: "#52B788" }} />
            </div>
            <div className="space-y-2 text-xs">
              {[
                { label: "Metabólico", val: score.metabolic },
                { label: "Cardiovascular", val: score.cardiovascular },
                { label: "Estilo de vida", val: score.lifestyle },
                { label: "Preventivo", val: score.preventive }
              ].map(c => (
                <div key={c.label} className="flex items-center justify-between gap-2">
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{c.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${c.val}%`, background: "#52B788" }} />
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.5)" }} className="w-6 text-right">{c.val}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: FileText, label: "Documentos", value: String(documents.length), sub: `${documents.filter(d => d.status === "reviewed").length} revisados`, color: "#52B788" },
              { icon: Activity, label: "Biomarcadores", value: String(biomarkers.length), sub: `${biomarkers.filter(b => b.status === "optimal").length} em dia`, color: "#52B788" },
              { icon: Bell, label: "Lembretes", value: String(reminders.length), sub: `${urgentReminders} urgentes`, color: urgentReminders > 0 ? "#C1440E" : "#52B788" },
              { icon: TrendingUp, label: "Atualização", value: "Hoje", sub: "dados reais", color: "#9A9688" }
            ].map(({ icon: Icon, label, value, sub, color }) => (
              <div key={label} className="p-5 rounded-3xl flex flex-col gap-3"
                style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Icon size={15} style={{ color }} />
                <div>
                  <p className="text-2xl font-bold" style={{ color: "#E8E4D9" }}>{value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>{sub}</p>
                </div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#5A5A50" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Biomarcadores */}
        {biomarkers.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#5A5A50" }}>Biomarcadores principais</h2>
            <MetricsGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {biomarkers.map(b => (
                <HealthMetricCard
                  key={b.id}
                  name={b.name}
                  value={b.value}
                  unit={b.unit}
                  status={b.status}
                  trend={b.trend}
                  category={b.category}
                  lastDate={b.last_date}
                />
              ))}
            </MetricsGrid>
          </div>
        )}

        {/* Tendências */}
        {Object.keys(historyBySlug).length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#5A5A50" }}>Tendências — últimos 7 meses</h2>
            <MetricsGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {["ldl", "hdl", "glucose", "weight"].filter(slug => historyBySlug[slug]).map(slug => {
                const bm = biomarkers.find(b => b.slug === slug);
                if (!bm) return null;
                return (
                  <BiomarkerTrendCard
                    key={slug}
                    name={bm.name}
                    value={Number(bm.value)}
                    unit={bm.unit}
                    status={bm.status}
                    history={historyBySlug[slug].map(h => ({ date: h.date_label, value: h.value }))}
                  />
                );
              })}
            </MetricsGrid>
          </div>
        )}

        {/* Bottom grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#5A5A50" }}>Lembretes preventivos</h2>
            <div className="space-y-3">
              {reminders.map(r => (
                <PreventiveReminderCard
                  key={r.id}
                  title={r.title}
                  description={r.description ?? ""}
                  daysUntil={r.due_date ? Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000) : 0}
                  priority={r.priority}
                />
              ))}
            </div>
          </div>
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
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#5A5A50" }}>Áreas de atenção</h2>
            <div className="space-y-3">
              {biomarkers.filter(b => b.status !== "optimal").map(b => (
                <RiskAreaCard
                  key={b.id}
                  label={b.name}
                  score={70}
                  description={`Valor atual: ${b.value} ${b.unit}. Monitorar.`}
                  color="yellow"
                />
              ))}
              {biomarkers.filter(b => b.status === "optimal").slice(0, 2).map(b => (
                <RiskAreaCard
                  key={b.id}
                  label={b.name}
                  score={90}
                  description={`${b.value} ${b.unit} — dentro da faixa ideal.`}
                  color="green"
                />
              ))}
            </div>
          </div>
        </div>

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
