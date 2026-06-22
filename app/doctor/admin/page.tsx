import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Users, Search, AlertTriangle, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";
import { getProfile } from "@/lib/supabase/queries";
import {
  getAllPatientsForClinicalAdmin,
  getClinicalAdminProfile,
} from "@/lib/supabase/clinical-admin-queries";

export const dynamic = "force-dynamic";

export default async function DoctorAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const [profile, clinicalAdmin] = await Promise.all([
    getProfile(),
    getClinicalAdminProfile(),
  ]);

  // Não-admin vai direto para o dashboard do paciente, sem entrar na cadeia
  // /doctor → /doctor/setup (evita "flap" de redirecionamentos).
  if (!clinicalAdmin) redirect("/dashboard");

  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() || undefined;
  const patients = await getAllPatientsForClinicalAdmin({ search: query, limit: 100, admin: clinicalAdmin });

  return (
    <DashboardLayout userName={profile?.name} isDoctor>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <Link href="/doctor" className="inline-flex items-center gap-2 text-xs font-semibold mb-5 transition-opacity hover:opacity-80" style={{ color: "#52B788" }}>
            <ArrowLeft size={14} /> Voltar ao cockpit médico
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(244,162,97,0.1)", border: "1px solid rgba(244,162,97,0.22)" }}>
                <ShieldCheck size={19} style={{ color: "#F4A261" }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>Admin clínico</p>
                <h1 className="text-2xl font-bold mt-1" style={{ color: "#E8E4D9" }}>Pacientes cadastrados</h1>
                <p className="text-sm mt-1" style={{ color: "#9A9688" }}>
                  Visualização administrativa auditada · {clinicalAdmin.role}
                </p>
              </div>
            </div>

            <div className="px-4 py-3 rounded-2xl max-w-xl" style={{ background: "rgba(244,162,97,0.08)", border: "1px solid rgba(244,162,97,0.2)" }}>
              <p className="text-xs leading-relaxed" style={{ color: "#F4A261" }}>
                Esta tela não cria vínculo médico-paciente. O uso é restrito a supervisão, suporte, auditoria e operação interna. Todo acesso é registrado.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Users size={18} style={{ color: "#52B788" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>{patients.length}</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Pacientes listados</p>
          </div>
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <ShieldCheck size={18} style={{ color: "#52B788" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>ON</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Acesso administrativo ativo</p>
          </div>
          <div className="rounded-3xl p-5" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
            <AlertTriangle size={18} style={{ color: "#F4A261" }} />
            <p className="text-3xl font-bold mt-4" style={{ color: "#E8E4D9" }}>Auditado</p>
            <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Acesso registrado em log</p>
          </div>
        </div>

        <section className="rounded-3xl p-5 lg:p-6" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9A9688" }}>Lista administrativa</h2>
              <p className="text-xs mt-1" style={{ color: "#5A5A50" }}>Busca inicial por nome na tabela profiles.</p>
            </div>

            <form className="relative w-full lg:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#5A5A50" }} />
              <input
                name="q"
                defaultValue={query}
                placeholder="Buscar paciente"
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#E8E4D9" }}
              />
            </form>
          </div>

          {patients.length === 0 ? (
            <div className="rounded-3xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
              <Users size={28} className="mx-auto" style={{ color: "#5A5A50" }} />
              <p className="text-sm font-medium mt-3" style={{ color: "#E8E4D9" }}>Nenhum paciente encontrado</p>
              <p className="text-xs mt-1" style={{ color: "#9A9688" }}>Revise o termo de busca ou cadastros existentes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "#5A5A50" }}>
                    <th className="text-left py-3 font-medium">Nome</th>
                    <th className="text-left py-3 font-medium">Perfil</th>
                    <th className="text-left py-3 font-medium">Sexo</th>
                    <th className="text-left py-3 font-medium">Nascimento</th>
                    <th className="text-left py-3 font-medium">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <td className="py-4 font-medium" style={{ color: "#E8E4D9" }}>{patient.name ?? "Sem nome"}</td>
                      <td className="py-4" style={{ color: "#9A9688" }}>{patient.role ?? "patient"}</td>
                      <td className="py-4" style={{ color: "#9A9688" }}>{patient.sex ?? "-"}</td>
                      <td className="py-4" style={{ color: "#9A9688" }}>{patient.dob ? new Date(patient.dob).toLocaleDateString("pt-BR") : "-"}</td>
                      <td className="py-4" style={{ color: "#9A9688" }}>{patient.created_at ? new Date(patient.created_at).toLocaleDateString("pt-BR") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
