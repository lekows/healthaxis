import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BodyMap } from "@/components/dashboard/BodyMap";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";

export default function BodyMapPage() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#E8E4D9" }}>Mapa Corporal</h1>
          <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
            Visualize os sistemas monitorados e o status de cada biomarcador por região do corpo.
          </p>
        </div>

        <div className="rounded-3xl p-6" style={{ background: "#0D0D0B", border: "1px solid rgba(255,255,255,0.07)" }}>
          <BodyMap />
        </div>

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
