import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile, getLinkedDoctors } from "@/lib/supabase/doctor-queries";
import { getMyAppointments } from "@/lib/supabase/appointment-queries";
import { PatientAppointmentsClient } from "@/components/patient/PatientAppointmentsClient";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { appointmentsEnabled } from "@/lib/feature-flags";
import { CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  if (!appointmentsEnabled) redirect("/dashboard");

  const [profile, doctorProfile, appointments, linkedDoctors] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getMyAppointments(),
    getLinkedDoctors(),
  ]);

  const doctors = linkedDoctors.map((l) => ({ id: l.doctor_id, name: l.doctor?.name ?? "Médico" }));

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <CalendarDays size={19} style={{ color: "#52B788" }} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Acompanhamento</p>
            <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>Minhas consultas</h1>
          </div>
        </div>

        <PatientAppointmentsClient appointments={appointments} doctors={doctors} />
        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
