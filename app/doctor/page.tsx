import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile, getMyInvites, getLinkedPatients } from "@/lib/supabase/doctor-queries";
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
    getLinkedPatients(),
  ]);

  if (!doctorProfile) redirect("/doctor/setup");

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3002";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${proto}://${host}`;

  const activeInvite = invites[0] ?? null;

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <Stethoscope size={18} style={{ color: "#52B788" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#E8E4D9" }}>Painel do Médico</h1>
            <p className="text-sm mt-0.5" style={{ color: "#9A9688" }}>
              CRM {doctorProfile.crm}/{doctorProfile.crm_uf}
              {doctorProfile.specialty ? ` · ${doctorProfile.specialty}` : ""}
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
