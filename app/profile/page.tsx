import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge } from "@/components/ui";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getProfile, getMedications, getFamilyHistory } from "@/lib/supabase/queries";
import { getLinkedDoctors, getWatchedBiomarkersByPatient } from "@/lib/supabase/doctor-queries";
import { createClient } from "@/lib/supabase/server";
import { Pill, Users, FlaskConical, Link2Off, Stethoscope } from "lucide-react";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { LinkedDoctorSection } from "@/components/patient/LinkedDoctorSection";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [profile, medications, familyHistory, linkedDoctors, watchedRaw] = await Promise.all([
    getProfile(),
    getMedications(),
    getFamilyHistory(),
    getLinkedDoctors(),
    user ? getWatchedBiomarkersByPatient(user.id) : Promise.resolve([]),
  ]);

  if (!profile) return null;

  const watchedByDoctor = watchedRaw.reduce<Record<string, { slug: string; name: string }[]>>(
    (acc, w) => {
      (acc[w.doctor_id] ??= []).push({ slug: w.slug, name: w.name });
      return acc;
    },
    {}
  );

  const initials = profile.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("");
  const age = profile.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const bmi = profile.height && profile.weight
    ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
    : null;

  return (
    <DashboardLayout userName={profile.name}>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Perfil de Saúde</h1>
            <p className="text-ink-muted text-sm mt-1">Informações pessoais e histórico de saúde.</p>
          </div>
          <ProfileEditModal profile={{
            name: profile.name,
            dob: profile.dob ?? null,
            sex: profile.sex ?? null,
            blood: profile.blood ?? null,
            height: profile.height ?? null,
            weight: profile.weight ?? null,
          }} />
        </div>

        {!profile.sex && (
          <div className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <FlaskConical size={15} style={{ color: "#52B788" }} />
            <p className="text-sm" style={{ color: "#9A9688" }}>
              Preencha seu <strong style={{ color: "#E8E4D9" }}>sexo biológico</strong> no perfil para receber faixas de referência laboratoriais personalizadas.
            </p>
          </div>
        )}

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-forest flex items-center justify-center">
              <span className="text-2xl font-bold text-cream">{initials}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">{profile.name}</h2>
              {age && <p className="text-ink-muted text-sm">{age} anos · {profile.dob}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Sexo biológico", value: profile.sex === "masculino" ? "Masculino" : profile.sex === "feminino" ? "Feminino" : profile.sex === "outro" ? "Outro" : "—" },
              { label: "Tipo sanguíneo", value: profile.blood ?? "—" },
              { label: "Altura", value: profile.height ? `${profile.height} cm` : "—" },
              { label: "Peso atual", value: profile.weight ? `${profile.weight} kg` : "—" },
              { label: "IMC", value: bmi ?? "—" }
            ].map(({ label, value }) => (
              <div key={label} className="bg-canvas-subtle rounded-2xl p-4">
                <p className="text-xs text-ink-faint uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-ink mt-1">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        {medications.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <Pill size={14} className="text-forest" /> Medicamentos em uso
            </h2>
            <div className="space-y-3">
              {medications.map(m => (
                <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border-soft bg-cream">
                  <div className="w-9 h-9 rounded-xl bg-forest-pale flex items-center justify-center shrink-0">
                    <Pill size={15} className="text-forest" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{m.name}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{m.dose} · {m.frequency}</p>
                  </div>
                  {m.prescribed && <Badge variant="success">Prescrito</Badge>}
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-faint mt-3">
              ⚠️ Nunca altere, suspenda ou inicie medicamentos sem orientação médica.
            </p>
          </div>
        )}

        {familyHistory.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users size={14} className="text-forest" /> Histórico familiar
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {familyHistory.map(fh => (
                <div key={fh.id} className="flex items-start gap-3 p-4 rounded-2xl border border-border-soft bg-cream">
                  <div className="w-2 h-2 rounded-full bg-terra mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{fh.condition}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{fh.relation} · início aos {fh.onset}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-faint mt-3">
              O histórico familiar é informativo e ajuda seu médico a contextualizar riscos. Não determina diagnóstico.
            </p>
          </div>
        )}

        <LinkedDoctorSection linkedDoctors={linkedDoctors} watchedByDoctor={watchedByDoctor} />

        <MedicalDisclaimer />
      </div>
    </DashboardLayout>
  );
}
