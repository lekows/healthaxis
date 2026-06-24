import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile } from "@/lib/supabase/doctor-queries";
import { getMyCarePlan } from "@/lib/supabase/care-plan-queries";
import { CarePlanCheckIn } from "@/components/patient/CarePlanCheckIn";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { ClipboardList, Target, Repeat } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(date: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("pt-BR");
}

const GOAL_STATUS_LABELS: Record<string, string> = { open: "Em andamento", met: "Atingida", missed: "Não atingida", paused: "Pausada" };

export default async function CarePlanPage() {
  const [profile, doctorProfile, plan] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getMyCarePlan(),
  ]);

  return (
    <DashboardLayout userName={profile?.name} isDoctor={!!doctorProfile}>
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <ClipboardList size={19} style={{ color: "#52B788" }} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Acompanhamento</p>
            <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>Meu plano de cuidado</h1>
          </div>
        </div>

        {!plan ? (
          <div className="rounded-3xl p-8 text-center" style={{ background: "#141412", border: "1px dashed rgba(255,255,255,0.12)" }}>
            <ClipboardList size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
            <p className="text-sm font-semibold mt-3" style={{ color: "#E8E4D9" }}>Você ainda não tem um plano ativo</p>
            <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: "#9A9688" }}>
              Quando seu médico criar um plano de cuidado para você, as metas e os hábitos aparecem aqui — e você poderá registrar check-ins de adesão.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{plan.title}</h2>
              {plan.summary && <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9A9688" }}>{plan.summary}</p>}
            </div>

            {plan.goals.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#9A9688" }}>
                  <Target size={14} style={{ color: "#52B788" }} /> Metas
                </h3>
                <div className="space-y-2">
                  {plan.goals.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div>
                        <p className="text-sm" style={{ color: "#E8E4D9" }}>{g.description}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>{[g.metric, g.target, g.due_date ? `até ${formatDate(g.due_date)}` : null].filter(Boolean).join(" · ")}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#9A9688" }}>{GOAL_STATUS_LABELS[g.status] ?? g.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {plan.habits.filter((h) => h.active).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "#9A9688" }}>
                  <Repeat size={14} style={{ color: "#52B788" }} /> Hábitos
                </h3>
                <div className="space-y-2">
                  {plan.habits.filter((h) => h.active).map((h) => (
                    <div key={h.id} className="p-4 rounded-2xl" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-sm" style={{ color: "#E8E4D9" }}>{h.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#5A5A50" }}>{[h.frequency, h.notes].filter(Boolean).join(" · ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <CarePlanCheckIn planId={plan.id} />
          </>
        )}

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
