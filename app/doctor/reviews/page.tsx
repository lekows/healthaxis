import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BrainCircuit, ShieldCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { AgentReviewCard } from "@/components/doctor/AgentReviewCard";
import { getProfile } from "@/lib/supabase/queries";
import { getDoctorProfile } from "@/lib/supabase/doctor-queries";
import {
  getAgentReviewHighlights,
  getAgentReviewSummary,
  getDoctorAgentReviewQueue,
} from "@/lib/supabase/agent-review-queries";

export default async function DoctorReviewsPage() {
  const [profile, doctorProfile, pendingReviews, allReviews] = await Promise.all([
    getProfile(),
    getDoctorProfile(),
    getDoctorAgentReviewQueue("pending", 50),
    getDoctorAgentReviewQueue("all", 50),
  ]);

  if (!doctorProfile) redirect("/doctor/setup");

  const reviewedCount = allReviews.filter((item) => item.human_decision !== "pending").length;

  return (
    <DashboardLayout userName={profile?.name} isDoctor>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
        <div>
          <Link href="/doctor" className="inline-flex items-center gap-2 text-xs font-semibold mb-5 transition-opacity hover:opacity-80" style={{ color: "#52B788" }}>
            <ArrowLeft size={14} /> Voltar ao cockpit médico
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
                <BrainCircuit size={19} style={{ color: "#52B788" }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Fila de revisão</p>
                <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>Revisão humana de IA</h1>
                <p className="text-sm mt-1" style={{ color: "#9A9688" }}>Aceitar, editar ou rejeitar análises antes de uso clínico.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <BrainCircuit size={18} style={{ color: "#F4A261" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: pendingReviews.length > 0 ? "#F4A261" : "#E8E4D9" }}>{pendingReviews.length}</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Pendentes</p>
          </div>
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <ShieldCheck size={18} style={{ color: "#52B788" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{reviewedCount}</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Já revisadas</p>
          </div>
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <ShieldCheck size={18} style={{ color: "#52B788" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{allReviews.length}</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Total recente</p>
          </div>
        </div>

        <section className="rounded-3xl p-5 lg:p-6" style={{ background: "rgba(244,162,97,0.06)", border: "1px solid rgba(244,162,97,0.18)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#F4A261" }}>Regra do fluxo</h2>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9A9688" }}>
            A IA organiza achados e pontos de atenção. O médico precisa aceitar, editar ou rejeitar antes que qualquer interpretação seja usada na assistência. Esta tela não prescreve e não fecha diagnóstico.
          </p>
        </section>

        {pendingReviews.length === 0 ? (
          <section className="rounded-3xl p-8 text-center" style={{ background: "#141412", border: "1px dashed rgba(255,255,255,0.12)" }}>
            <BrainCircuit size={30} className="mx-auto" style={{ color: "#5A5A50" }} />
            <p className="text-sm font-semibold mt-4" style={{ color: "#E8E4D9" }}>Nenhuma análise pendente</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Quando houver uma análise automatizada concluída, ela aparecerá aqui.</p>
          </section>
        ) : (
          <section className="space-y-4">
            {pendingReviews.map((review) => (
              <div key={review.id} className="space-y-3">
                <Link href={`/doctor/patient/${review.patient_id}`} className="inline-flex text-xs font-semibold transition-opacity hover:opacity-80" style={{ color: "#52B788" }}>
                  {review.patient?.name ?? "Paciente"} · abrir Patient 360
                </Link>
                <AgentReviewCard
                  agentRun={review}
                  patientId={review.patient_id}
                  summary={getAgentReviewSummary(review)}
                  highlights={getAgentReviewHighlights(review)}
                />
              </div>
            ))}
          </section>
        )}

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
