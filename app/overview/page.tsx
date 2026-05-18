import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge } from "@/components/ui";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { HealthOverview } from "@/components/dashboard/HealthOverview";

export default function HealthOverviewPage() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <HealthOverview />
        <div className="mt-8">
          <MedicalDisclaimer />
        </div>
      </div>
    </DashboardLayout>
  );
}
