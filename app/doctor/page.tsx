import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile, getMyInvites, getDoctorCockpitPatients } from "@/lib/supabase/doctor-queries";
import { DoctorDashboardClient } from "@/components/doctor/DoctorDashboardClient";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { Stethoscope } from "lucide-react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function DoctorPage() {
  const [profile, doctorProfile, invites, patients] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getMyInvites(),
    getDoctorCockpitPatients(),
  ]);

  if (!doctorProfile) redirect("/doctor/setup");

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3002";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${proto}://${host}`;

  const activeInvite = invites[0] ?? null;

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <Stethoscope size={19} style={{ color: "#52B788" }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Face do médico</p>
              <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>Cockpit cardiometabólico</h1>
              <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
                CRM {doctorProfile.crm}/{doctorProfile.crm_uf}
                {doctorProfile.specialty ? ` · ${doctorProfile.specialty}` : ""}
              </p>
            </div>
          </div>
          <div className="px-4 py-3 rounded-2xl max-w-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "#9A9688" }}>
              Apoio à decisão clínica com humano no comando: o HealthAxis organiza, calcula, rastreia e alerta; o médico revisa e decide.
            </p>
          </div>
        </div>

        <DoctorDashboardClient
          initialInvite={activeInvite}
          patients={patients}
          baseUrl={baseUrl}
        />

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
