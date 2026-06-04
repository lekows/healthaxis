import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { EmptyState } from "@/components/shared/EmptyState";
import { getDoctors, getProfile } from "@/lib/supabase/queries";
import { Stethoscope, ExternalLink, Calendar, FileText } from "lucide-react";

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function MonthsAgoLabel({ dateStr }: { dateStr: string | null }) {
  const days = daysSince(dateStr);
  if (days < 30) return <span style={{ color: "#52B788" }}>Recente</span>;
  if (days < 365) return <span style={{ color: "#F4A261" }}>{Math.floor(days / 30)} meses atrás</span>;
  return <span style={{ color: "#C1440E" }}>{Math.floor(days / 365)} ano{days >= 730 ? "s" : ""} atrás</span>;
}

export default async function DoctorsPage() {
  const [profile, doctors] = await Promise.all([getProfile(), getDoctors()]);

  return (
    <DashboardLayout userName={profile?.name}>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">

        <div>
          <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Saúde preventiva</p>
          <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>Meus Médicos</h1>
          <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
            Médicos identificados nos seus exames. {doctors.length > 0 && `${doctors.length} encontrado${doctors.length > 1 ? "s" : ""}.`}
          </p>
        </div>

        {doctors.length === 0 && (
          <EmptyState
            icon={Stethoscope}
            title="Nenhum médico identificado ainda"
            description="Envie exames laboratoriais — o HealthAxis extrai automaticamente o médico solicitante de cada laudo."
            action={{ label: "Enviar exame", href: "/documents" }}
          />
        )}

        <div className="space-y-4">
          {doctors.map((doc) => {
            const days = daysSince(doc.last_exam_date);
            const needsAttention = days > 180;
            const cfmUrl = `https://portal.cfm.org.br/busca-medicos/?q=${encodeURIComponent(doc.name)}`;
            const doctoraliaUrl = `https://www.doctoralia.com.br/pesquisa?q=${encodeURIComponent(doc.name)}`;

            return (
              <div key={doc.id} className="rounded-3xl p-5"
                style={{ background: "#141412", border: `1px solid ${needsAttention ? "rgba(244,162,97,0.2)" : "rgba(255,255,255,0.07)"}` }}>

                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-base font-bold"
                    style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>
                    {doc.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-base font-semibold" style={{ color: "#E8E4D9" }}>{doc.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#9A9688" }}>
                          {doc.crm
                            ? <>CRM {doc.crm}{doc.crm_uf ? `/${doc.crm_uf}` : ""}{doc.specialty ? ` · ${doc.specialty}` : ""}</>
                            : <span style={{ color: "#5A5A50" }}>CRM não encontrado{doc.specialty ? ` · ${doc.specialty}` : ""}</span>
                          }
                        </p>
                      </div>

                      {needsAttention && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
                          style={{ background: "rgba(244,162,97,0.08)", border: "1px solid rgba(244,162,97,0.2)" }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#F4A261" }} />
                          <span className="text-xs font-medium" style={{ color: "#F4A261" }}>Consulta em atraso</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs" style={{ color: "#5A5A50" }}>
                      <div className="flex items-center gap-1.5">
                        <FileText size={11} />
                        <span>{doc.exam_count} exame{doc.exam_count > 1 ? "s" : ""} solicitado{doc.exam_count > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} />
                        <span>Último exame: <MonthsAgoLabel dateStr={doc.last_exam_date} /></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <a href={cfmUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#9A9688" }}>
                        <ExternalLink size={11} /> Ver no CFM
                      </a>
                      <a href={doctoraliaUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#9A9688" }}>
                        <ExternalLink size={11} /> Buscar no Doctoralia
                      </a>
                      <a href={doctoraliaUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: "#52B788", color: "#0D0D0B" }}>
                        Agendar consulta
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {doctors.length > 0 && <MedicalDisclaimer />}
      </div>
    </DashboardLayout>
  );
}
