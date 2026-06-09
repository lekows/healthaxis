import Link from "next/link";
import { Check, X, Lock, Info } from "lucide-react";
import type { OrganizationScore, NextAction } from "@/lib/health-organization-score";
import { organizationLabel } from "@/lib/health-organization-score";

interface Props {
  score: OrganizationScore;
  nextAction: NextAction | null;
}

export function HealthOrganizationScoreCard({ score, nextAction }: Props) {
  const { percent, criteria } = score;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;

  return (
    <div className="rounded-3xl p-6 flex flex-col gap-5"
      style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Score de Organização da Saúde</p>
        <span title="Mede a organização dos seus dados. Não representa diagnóstico ou risco clínico.">
          <Info size={15} style={{ color: "#5A5A50" }} />
        </span>
      </div>

      {/* Anel + label */}
      <div className="flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle cx="60" cy="60" r={r} fill="none" stroke="#52B788" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: "#52B788" }}>{percent}%</span>
          </div>
        </div>
        <p className="text-base font-semibold leading-snug" style={{ color: "#E8E4D9" }}>
          {organizationLabel(percent)}
        </p>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>
        Complete seus dados para gerar relatórios melhores e chegar mais preparado à consulta.
      </p>

      {/* Checklist */}
      <ul className="space-y-2.5">
        {criteria.map((c) => (
          <li key={c.key} className="flex items-center gap-2.5 text-sm">
            {!c.available ? (
              <Lock size={16} style={{ color: "#5A5A50" }} />
            ) : c.done ? (
              <span className="flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: "#52B788" }}>
                <Check size={12} style={{ color: "#0D0D0B" }} />
              </span>
            ) : (
              <span className="flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: "rgba(193,68,14,0.15)", border: "1px solid rgba(193,68,14,0.4)" }}>
                <X size={12} style={{ color: "#C1440E" }} />
              </span>
            )}
            <span style={{ color: c.done ? "#E8E4D9" : "#9A9688" }}>{c.label}</span>
            {!c.available && (
              <span className="text-xs ml-auto" style={{ color: "#5A5A50" }}>em breve</span>
            )}
          </li>
        ))}
      </ul>

      {nextAction && (
        <Link href={nextAction.href}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-center transition-opacity hover:opacity-90"
          style={{ background: "#52B788", color: "#0D0D0B" }}>
          Completar agora
        </Link>
      )}

      <p className="text-xs leading-relaxed" style={{ color: "#5A5A50" }}>
        Este score mede a organização dos seus dados no HealthAxis. Não representa diagnóstico ou risco clínico.
      </p>
    </div>
  );
}
