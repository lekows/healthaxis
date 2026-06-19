import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TimelineEventCard } from "@/components/dashboard/EventCards";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getTimelineEvents, getProfile } from "@/lib/supabase/queries";
import { getIsDoctor } from "@/lib/supabase/doctor-queries";

export default async function TimelinePage() {
  const [profile, events, isDoctor] = await Promise.all([getProfile(), getTimelineEvents(), getIsDoctor()]);

  const years = [...new Set(events.map(e => new Date(e.date).getFullYear()))].sort((a, b) => b - a);

  return (
    <DashboardLayout userName={profile?.name} isDoctor={isDoctor}>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-ink">Linha do Tempo</h1>
          <p className="text-ink-muted text-sm mt-1">Histórico cronológico de consultas, exames e eventos de saúde.</p>
        </div>

        {years.map(year => {
          const yearEvents = events.filter(e => new Date(e.date).getFullYear() === year);
          return (
            <div key={year}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest text-cream text-xs font-semibold mb-6">
                {year}
              </div>
              <div className="pl-2">
                {yearEvents.map((event, i) => (
                  <TimelineEventCard
                    key={event.id}
                    date={event.date}
                    type={event.type}
                    title={event.title}
                    description={event.description ?? ""}
                    icon={event.icon}
                    isLast={i === yearEvents.length - 1}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {events.length === 0 && (
          <p className="text-ink-muted text-sm">Nenhum evento registrado ainda.</p>
        )}

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
