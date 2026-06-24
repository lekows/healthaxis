import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile, getDoctorNewExams } from "@/lib/supabase/doctor-queries";
import { DoctorExamsClient } from "@/components/doctor/DoctorExamsClient";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { FlaskConical } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DoctorExamsPage() {
  const [profile, doctorProfile, exams] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getDoctorNewExams(),
  ]);

  if (!doctorProfile) redirect("/doctor/setup");

  const unreviewed = exams.filter((e) => !e.reviewed).length;
  const altered = exams.filter((e) => e.altered_count > 0).length;

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <FlaskConical size={19} style={{ color: "#52B788" }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Face do médico</p>
              <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>Exames novos</h1>
              <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
                {exams.length} exame(s) recente(s) · {unreviewed} não revisado(s) · {altered} com alteração
              </p>
            </div>
          </div>
        </div>

        <DoctorExamsClient exams={exams} />

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
