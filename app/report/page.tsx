import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, Button } from "@/components/ui";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getProfile, getBiomarkers, getMedications, getFamilyHistory, getPreventiveReminders } from "@/lib/supabase/queries";
import { getIsDoctor } from "@/lib/supabase/doctor-queries";
import { FileText, Download, Share2, Printer, CheckCircle2, AlertCircle } from "lucide-react";

export default async function ReportPage() {
  const [profile, biomarkers, medications, familyHistory, reminders, isDoctor] = await Promise.all([
    getProfile(),
    getBiomarkers(),
    getMedications(),
    getFamilyHistory(),
    getPreventiveReminders(),
    getIsDoctor(),
  ]);

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const attentionBiomarkers = biomarkers.filter(b => b.status !== "optimal");
  const optimalBiomarkers = biomarkers.filter(b => b.status === "optimal");
  const urgentReminders = reminders.filter(r => r.priority === "high");

  const age = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const bmi = profile?.height && profile?.weight
    ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
    : null;

  return (
    <DashboardLayout userName={profile?.name} isDoctor={isDoctor}>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Relatório para Consulta</h1>
            <p className="text-ink-muted text-sm mt-1">Resumo organizado para apresentar ao seu médico.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Printer size={14} /> Imprimir</Button>
            <Button variant="outline" size="sm"><Share2 size={14} /> Compartilhar</Button>
            <Button variant="primary" size="sm"><Download size={14} /> Exportar PDF</Button>
          </div>
        </div>

        <MedicalDisclaimer />

        <div className="bg-cream border border-border-soft rounded-3xl overflow-hidden">
          <div className="bg-forest text-cream p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <FileText size={16} className="text-cream" />
                  </div>
                  <span className="text-sm font-semibold opacity-80">HealthAxis · Relatório Clínico</span>
                </div>
                <h2 className="text-2xl font-bold mb-1">{profile?.name ?? "Usuário"}</h2>
                <p className="text-cream/70 text-sm">
                  {age ? `${age} anos · ` : ""}{profile?.blood ? `Tipo ${profile.blood} · ` : ""}{bmi ? `IMC ${bmi}` : ""}
                </p>
              </div>
              <div className="text-right text-sm text-cream/60">
                <p>Gerado em</p>
                <p className="font-medium text-cream">{today}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">

            <section>
              <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-forest text-cream text-xs flex items-center justify-center font-bold">1</span>
                Biomarcadores principais
              </h3>
              {attentionBiomarkers.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-terra uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertCircle size={11} /> Pontos de atenção
                  </p>
                  <div className="space-y-2">
                    {attentionBiomarkers.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-2xl bg-terra-pale border border-terra/10">
                        <span className="text-sm font-medium text-ink">{b.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-ink">{b.value} <span className="font-normal text-ink-faint">{b.unit}</span></span>
                          <Badge variant="warning">Atenção</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-forest uppercase tracking-wider mb-2 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Dentro dos parâmetros
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {optimalBiomarkers.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-2xl bg-forest-pale/50 border border-forest-light/10">
                      <span className="text-sm text-ink">{b.name}</span>
                      <span className="text-sm font-bold text-forest">{b.value} <span className="font-normal text-ink-faint text-xs">{b.unit}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="border-t border-border-soft" />

            <section>
              <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-forest text-cream text-xs flex items-center justify-center font-bold">2</span>
                Medicamentos e suplementos em uso
              </h3>
              <div className="space-y-2">
                {medications.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border-soft">
                    <CheckCircle2 size={14} className="text-forest-light shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-ink">{m.name}</span>
                      <span className="text-xs text-ink-faint ml-2">{m.dose} · {m.frequency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-border-soft" />

            <section>
              <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-forest text-cream text-xs flex items-center justify-center font-bold">3</span>
                Histórico familiar relevante
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {familyHistory.map(fh => (
                  <div key={fh.id} className="p-3 rounded-2xl border border-border-soft text-sm">
                    <span className="font-medium text-ink">{fh.condition}</span>
                    <span className="text-ink-faint ml-2">({fh.relation}, {fh.onset})</span>
                  </div>
                ))}
              </div>
            </section>

            {urgentReminders.length > 0 && (
              <>
                <div className="border-t border-border-soft" />
                <section>
                  <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-terra text-cream text-xs flex items-center justify-center font-bold">4</span>
                    Itens para discutir na consulta
                  </h3>
                  <div className="space-y-2">
                    {urgentReminders.map(r => (
                      <div key={r.id} className="flex items-start gap-3 p-3 rounded-2xl bg-terra-pale border border-terra/10">
                        <AlertCircle size={14} className="text-terra mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-ink">{r.title}</p>
                          <p className="text-xs text-ink-muted mt-0.5">{r.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <div className="bg-forest-pale rounded-2xl p-4 text-xs text-forest-mid leading-relaxed">
              <strong>Nota importante:</strong> Este relatório foi gerado pela plataforma HealthAxis com finalidade organizacional. Não constitui diagnóstico médico, prescrição ou laudo clínico. Todos os dados devem ser interpretados por um profissional de saúde habilitado.
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
