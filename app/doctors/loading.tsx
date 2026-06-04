import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/shared/Skeleton";

export default function DoctorsLoading() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-14 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full" />)}
      </div>
    </DashboardLayout>
  );
}
