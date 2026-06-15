import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { DoctorSetupForm } from "@/components/doctor/DoctorSetupForm";
import { getDoctorProfile } from "@/lib/supabase/doctor-queries";
import { Stethoscope } from "lucide-react";

export default async function DoctorSetupPage() {
  const [profile, doctorProfile] = await Promise.all([getProfile(), getDoctorProfile()]);

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-6 lg:p-8 max-w-xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <Stethoscope size={18} style={{ color: "#52B788" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#E8E4D9" }}>Perfil Médico</h1>
            <p className="text-sm mt-0.5" style={{ color: "#9A9688" }}>Preencha seus dados para ativar a conta médica.</p>
          </div>
        </div>

        <DoctorSetupForm initialData={doctorProfile} />
      </div>
    </DashboardLayout>
  );
}
