import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile, getLinkedPatients } from "@/lib/supabase/doctor-queries";
import { getDoctorAppointments } from "@/lib/supabase/appointment-queries";
import { DoctorAgendaClient } from "@/components/doctor/DoctorAgendaClient";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { appointmentsEnabled } from "@/lib/feature-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DoctorAgendaPage() {
  if (!appointmentsEnabled) redirect("/doctor");

  const [profile, doctorProfile, appointments, linkedPatients] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getDoctorAppointments(),
    getLinkedPatients(),
  ]);

  if (!doctorProfile) redirect("/doctor/setup");

  const patients = linkedPatients.map((l) => ({ id: l.patient_id, name: l.patient?.name ?? "Paciente" }));

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
        <DoctorAgendaClient appointments={appointments} patients={patients} />
        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
