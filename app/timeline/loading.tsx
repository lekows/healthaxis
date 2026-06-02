import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/shared/Skeleton";

export default function TimelineLoading() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-3 w-80" />
        </div>

        {/* Year group 1 */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-14 rounded-full" />
          <div className="pl-2 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>

        {/* Year group 2 */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-14 rounded-full" />
          <div className="pl-2 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
