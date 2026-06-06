import { createClient } from "@/lib/supabase/server";
import { ConnectAcceptClient } from "@/components/doctor/ConnectAcceptClient";
import { Stethoscope, AlertTriangle } from "lucide-react";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ConnectPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: doctorInfo } = await supabase
    .rpc("resolve_doctor_invite", { p_token: token })
    .single();

  if (!doctorInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0D0D0B" }}>
        <div className="max-w-sm w-full text-center space-y-4 rounded-3xl p-8"
          style={{ background: "#141412", border: "1px solid rgba(193,68,14,0.2)" }}>
          <AlertTriangle size={32} style={{ color: "#C1440E", margin: "0 auto" }} />
          <h1 className="text-lg font-bold" style={{ color: "#E8E4D9" }}>Convite inválido ou expirado</h1>
          <p className="text-sm" style={{ color: "#9A9688" }}>
            Este link de convite não é mais válido. Peça ao médico um novo convite.
          </p>
        </div>
      </div>
    );
  }

  const info = doctorInfo as {
    doctor_id: string;
    doctor_name: string;
    crm: string;
    crm_uf: string;
    specialty: string | null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0D0D0B" }}>
      <div className="max-w-sm w-full space-y-6">

        {/* Cabeçalho */}
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>HealthAxis</p>
          <h1 className="text-xl font-bold" style={{ color: "#E8E4D9" }}>Convite de Médico</h1>
        </div>

        {/* Card do médico */}
        <div className="rounded-3xl p-6 space-y-4" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-base font-bold shrink-0"
              style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)", color: "#52B788" }}>
              <Stethoscope size={22} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "#E8E4D9" }}>{info.doctor_name}</p>
              <p className="text-sm" style={{ color: "#9A9688" }}>
                CRM {info.crm}/{info.crm_uf}
                {info.specialty ? ` · ${info.specialty}` : ""}
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-4 space-y-2 text-sm" style={{ background: "rgba(82,183,136,0.05)", border: "1px solid rgba(82,183,136,0.15)" }}>
            <p className="font-medium" style={{ color: "#52B788" }}>Ao aceitar, você concorda que:</p>
            <ul className="space-y-1.5" style={{ color: "#9A9688" }}>
              <li>• Este médico poderá ver que você é paciente dele no HealthAxis</li>
              <li>• Você controla quais exames compartilhar — nada é automático</li>
              <li>• Você pode desfazer este vínculo a qualquer momento</li>
            </ul>
          </div>

          <ConnectAcceptClient token={token} />
        </div>

        <p className="text-xs text-center" style={{ color: "#5A5A50" }}>
          Ao aceitar, seu consentimento é registrado com data e hora (LGPD Art. 7º, I).
        </p>
      </div>
    </div>
  );
}
