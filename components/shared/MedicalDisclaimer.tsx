"use client";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function MedicalDisclaimer({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("flex items-start gap-2 rounded-2xl p-3", className)}
        style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.12)" }}>
        <ShieldCheck size={13} style={{ color: "#52B788", marginTop: 2, flexShrink: 0 }} />
        <p className="text-xs leading-relaxed" style={{ color: "#9A9688" }}>
          Este painel organiza seus dados de saúde para apoiar suas consultas. Não substitui avaliação médica.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-3xl p-5", className)}
      style={{ background: "rgba(82,183,136,0.05)", border: "1px solid rgba(82,183,136,0.1)" }}>
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={15} style={{ color: "#52B788" }} />
        <span className="text-sm font-semibold" style={{ color: "#52B788" }}>Informação importante</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>
        O HealthAxis é uma plataforma de <strong style={{ color: "#E8E4D9" }}>organização e acompanhamento</strong> de dados de saúde.
        Não realizamos diagnósticos, não prescrevemos medicamentos e não substituímos a consulta médica.
        Todos os dados devem ser interpretados pelo seu profissional de saúde.
      </p>
    </div>
  );
}
