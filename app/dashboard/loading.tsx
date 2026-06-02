import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/shared/Skeleton";

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>

        {/* Score + quick stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <Skeleton className="lg:col-span-1 h-52" />
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>

        {/* Biomarcadores */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-40" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        </div>

        {/* Tendências */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        </div>

        {/* Bottom grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, col) => (
            <div key={col} className="space-y-3">
              <Skeleton className="h-3 w-36" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
}
