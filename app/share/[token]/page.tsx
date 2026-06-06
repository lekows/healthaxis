import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, FileText, FlaskConical } from "lucide-react";
import { MedicalDisclaimer } from "@/components/shared/MedicalDisclaimer";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedExamPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: tokenInfo } = await supabase
    .rpc("resolve_shared_token", { p_token: token })
    .single();

  if (!tokenInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0D0D0B" }}>
        <div className="max-w-sm w-full text-center space-y-4 rounded-3xl p-8"
          style={{ background: "#141412", border: "1px solid rgba(193,68,14,0.2)" }}>
          <AlertTriangle size={32} style={{ color: "#C1440E", margin: "0 auto" }} />
          <h1 className="text-lg font-bold" style={{ color: "#E8E4D9" }}>Link inválido ou expirado</h1>
          <p className="text-sm" style={{ color: "#9A9688" }}>
            Este link de compartilhamento não é mais válido. Peça ao paciente um novo QR code.
          </p>
        </div>
      </div>
    );
  }

  const info = tokenInfo as {
    patient_id: string;
    patient_name: string;
    document_ids: string[];
    expires_at: string;
  };

  // Busca os documentos compartilhados
  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, date, lab, type, status, tags")
    .in("id", info.document_ids)
    .eq("user_id", info.patient_id);

  // Busca biomarcadores do paciente vinculados a esses documentos (não há relação direta, então busca todos)
  const { data: biomarkers } = await supabase
    .from("biomarkers")
    .select("*")
    .eq("user_id", info.patient_id)
    .order("category");

  // Marca como visualizado (best-effort)
  await supabase
    .from("shared_exam_tokens")
    .update({ viewed_at: new Date().toISOString() })
    .eq("token", token)
    .is("viewed_at", null);

  const categories = [...new Set((biomarkers ?? []).map(b => b.category))];
  const expiryLabel = new Date(info.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen" style={{ background: "#0D0D0B", color: "#E8E4D9" }}>
      <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "#5A5A50" }}>HealthAxis · Dados Compartilhados</p>
            <h1 className="text-xl font-bold mt-1" style={{ color: "#E8E4D9" }}>{info.patient_name}</h1>
            <p className="text-sm mt-0.5" style={{ color: "#9A9688" }}>Acesso expira em {expiryLabel}</p>
          </div>
          <div className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(244,162,97,0.08)", border: "1px solid rgba(244,162,97,0.2)", color: "#F4A261" }}>
            Compartilhamento temporário
          </div>
        </div>

        {/* Documentos */}
        {(documents ?? []).length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
              <FileText size={14} style={{ color: "#52B788" }} /> Laudos ({documents!.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {documents!.map(d => (
                <div key={d.id} className="rounded-2xl p-4 space-y-1" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-sm font-semibold" style={{ color: "#E8E4D9" }}>{d.title}</p>
                  {d.lab && <p className="text-xs" style={{ color: "#5A5A50" }}>{d.lab}</p>}
                  <p className="text-xs" style={{ color: "#5A5A50" }}>
                    {new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(d.tags ?? []).map((tag: string) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#9A9688" }}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Biomarcadores */}
        {categories.map(cat => {
          const items = (biomarkers ?? []).filter(b => b.category === cat);
          return (
            <div key={cat}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#9A9688" }}>
                <FlaskConical size={14} style={{ color: "#52B788" }} /> {cat}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map(b => {
                  const statusColors: Record<string, string> = {
                    optimal: "#52B788", attention: "#F4A261", high: "#C1440E", low: "#F4A261", critical: "#C1440E",
                  };
                  return (
                    <div key={b.id} className="rounded-2xl p-4 space-y-1" style={{ background: "#141412", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-xs truncate" style={{ color: "#9A9688" }}>{b.name}</p>
                      <p className="text-lg font-bold" style={{ color: statusColors[b.status] ?? "#E8E4D9" }}>
                        {b.value} <span className="text-xs font-normal" style={{ color: "#5A5A50" }}>{b.unit}</span>
                      </p>
                      {b.last_date && (
                        <p className="text-xs" style={{ color: "#5A5A50" }}>
                          {new Date(b.last_date).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <MedicalDisclaimer />
      </div>
    </div>
  );
}
