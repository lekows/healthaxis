import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { HealthOverview } from "@/components/dashboard/HealthOverview";
import { ScoreEvolutionChart } from "@/components/dashboard/ScoreEvolutionChart";
import { MetabolicAnalysisSection } from "@/components/overview/MetabolicAnalysisSection";
import { getHealthScore, getHealthScoreHistory, getProfile, getLatestMetabolicAnalysis } from "@/lib/supabase/queries";
import { getIsDoctor } from "@/lib/supabase/doctor-queries";

export default async function HealthOverviewPage() {
  const [profile, score, history, metabolicRun, isDoctor] = await Promise.all([
    getProfile(),
    getHealthScore(),
    getHealthScoreHistory(),
    getLatestMetabolicAnalysis(),
    getIsDoctor(),
  ]);

  const current = score ?? { overall: 0, metabolic: 0, cardiovascular: 0, lifestyle: 0, preventive: 0 };

  const chartData = history.map((h: { date_label?: string; recorded_at: string; overall: number; metabolic: number; cardiovascular: number; lifestyle: number; preventive: number }) => ({
    label: h.date_label ?? new Date(h.recorded_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    overall: h.overall,
    metabolic: h.metabolic,
    cardiovascular: h.cardiovascular,
    lifestyle: h.lifestyle,
    preventive: h.preventive,
  }));

  return (
    <DashboardLayout userName={profile?.name} isDoctor={isDoctor}>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">

        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#E8E4D9" }}>Visão Geral de Saúde</h1>
          <p className="text-sm mt-1" style={{ color: "#9A9688" }}>Panorama completo do seu estado preventivo.</p>
        </div>

        {/* Score ring + current value */}
        <div className="p-6 rounded-3xl flex items-center gap-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#52B788" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40 * current.overall / 100} ${2 * Math.PI * 40}`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: "#E8E4D9" }}>{current.overall}</span>
            </div>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: "#E8E4D9" }}>Índice Preventivo</p>
            <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
              Score geral baseado em biomarcadores, estilo de vida e exames preventivos.
            </p>
          </div>
        </div>

        {/* Dimension scores + chart */}
        <ScoreEvolutionChart data={chartData} current={current} />

        {/* Existing overview content */}
        <HealthOverview />

        <MetabolicAnalysisSection initialRun={metabolicRun} />

        <MedicalDisclaimer />
      </div>
    </DashboardLayout>
  );
}
