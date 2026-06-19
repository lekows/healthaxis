import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { MetabolicAnalysisSection } from "@/components/overview/MetabolicAnalysisSection";
import { getProfile, getBiomarkerHistory, getDocuments, getMedications, getFamilyHistory, getLatestMetabolicAnalysis } from "@/lib/supabase/queries";
import { getLinkedDoctors, getIsDoctor } from "@/lib/supabase/doctor-queries";
import { computeOrganizationScore, organizationLabel, type ScoreSignal } from "@/lib/health-organization-score";

export default async function HealthOverviewPage() {
  const [profile, bioHistory, documents, linkedDoctors, medications, familyHistory, metabolicRun, isDoctor] = await Promise.all([
    getProfile(),
    getBiomarkerHistory(),
    getDocuments(),
    getLinkedDoctors(),
    getMedications(),
    getFamilyHistory(),
    getLatestMetabolicAnalysis(),
    getIsDoctor(),
  ]);

  const comparableCount = Object.values(
    bioHistory.reduce<Record<string, number>>((acc, h) => {
      acc[h.biomarker_slug] = (acc[h.biomarker_slug] ?? 0) + 1;
      return acc;
    }, {})
  ).filter((n) => n >= 2).length;
  const orgSignal: ScoreSignal = {
    hasExam: documents.length > 0,
    comparableCount,
    hasLinkedDoctor: linkedDoctors.length > 0,
    hasMeds: medications.length > 0,
    hasFamilyHistory: familyHistory.length > 0,
  };
  const orgScore = computeOrganizationScore(orgSignal);

  return (
    <DashboardLayout userName={profile?.name} isDoctor={isDoctor}>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">

        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#E8E4D9" }}>Visão Geral de Saúde</h1>
          <p className="text-sm mt-1" style={{ color: "#9A9688" }}>Panorama completo do seu estado preventivo.</p>
        </div>

        {/* Score de Organização da Saúde (mesmo número da Home) */}
        <div className="p-6 rounded-3xl flex items-center gap-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#52B788" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40 * orgScore.percent / 100} ${2 * Math.PI * 40}`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: "#52B788" }}>{orgScore.percent}%</span>
            </div>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: "#E8E4D9" }}>Organização da Saúde</p>
            <p className="text-sm mt-1" style={{ color: "#9A9688" }}>{organizationLabel(orgScore.percent)}</p>
            <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>
              Mede a organização dos seus dados no HealthAxis. Não representa diagnóstico ou risco clínico.
            </p>
          </div>
        </div>

        <MetabolicAnalysisSection initialRun={metabolicRun} />

        <MedicalDisclaimer />
      </div>
    </DashboardLayout>
  );
}
