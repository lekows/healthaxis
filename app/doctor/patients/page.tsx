import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile, getDoctorCockpitPatients } from "@/lib/supabase/doctor-queries";
import { PatientPortfolioClient, type PortfolioFilter } from "@/components/doctor/PatientPortfolioClient";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { Users } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Definido localmente (server): importar um VALOR de um módulo "use client" para
// um Server Component vira uma client-reference (proxy), e usá-lo como array
// lança em runtime. O tipo acima é apagado na compilação, então é seguro.
const VALID_FILTERS: PortfolioFilter[] = ["all", "review", "followup", "pending_ai", "new_exam", "stale"];

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const [profile, doctorProfile, patients] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getDoctorCockpitPatients(),
  ]);

  if (!doctorProfile) redirect("/doctor/setup");

  const requested = (await searchParams)?.filter;
  const initialFilter: PortfolioFilter = VALID_FILTERS.includes(requested as PortfolioFilter)
    ? (requested as PortfolioFilter)
    : "all";

  const reviewCount = patients.filter((p) => p.signal === "review").length;
  const pendingAiTotal = patients.reduce((total, p) => total + p.pending_ai, 0);

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Users size={19} style={{ color: "#52B788" }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Face do médico</p>
              <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>Pacientes</h1>
              <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
                {patients.length} vinculado(s) · {reviewCount} para revisar · {pendingAiTotal} IA pendente(s)
              </p>
            </div>
          </div>
        </div>

        <PatientPortfolioClient patients={patients} initialFilter={initialFilter} />

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
