import Link from "next/link";
import { QrCode } from "lucide-react";

export function ShareWithDoctorCard() {
  return (
    <div className="rounded-3xl p-6 flex flex-col gap-4"
      style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>Compartilhar com médico</p>
        <QrCode size={16} style={{ color: "#52B788" }} />
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "#9A9688" }}>
        Gere um QR Code temporário para seu médico visualizar seus exames organizados durante a consulta.
      </p>

      <Link href="/share"
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-opacity hover:opacity-90"
        style={{ background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.2)" }}>
        Gerar QR Code
      </Link>
    </div>
  );
}
