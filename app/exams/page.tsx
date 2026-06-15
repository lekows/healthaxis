import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getBiomarkers, getBiomarkerHistory, getDocuments, getProfile } from "@/lib/supabase/queries";
import { getIsDoctor } from "@/lib/supabase/doctor-queries";
import { ExamsTabsClient } from "@/components/exams/ExamsTabsClient";

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

  return (
    <DashboardLayout userName={profile?.name} isDoctor={isDoctor}>
      <ExamsTabsClient
        biomarkers={biomarkers}
        historyBySlug={historyBySlug}
        categories={categories}
        documents={documents}
        userName={profile?.name}
      />
    </DashboardLayout>
  );
}
