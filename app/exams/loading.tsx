import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/shared/Skeleton";

export default function ExamsLoading() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-9 w-24 rounded-2xl" />
        </div>

        {/* Anomaly bar */}
        <Skeleton className="h-20" />

        {/* Category 1 */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        </div>

        {/* Category 2 */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        </div>

        {/* Laudos */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-32" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
