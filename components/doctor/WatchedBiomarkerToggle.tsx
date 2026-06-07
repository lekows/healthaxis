"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  patientId: string;
  slug: string;
  name: string;
  initialWatched: boolean;
}

export function WatchedBiomarkerToggle({ patientId, slug, name, initialWatched }: Props) {
  const [watched, setWatched] = useState(initialWatched);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation(); // não abrir o modal do card
    if (loading) return;
    setLoading(true);

    // Optimistic update
    const next = !watched;
    setWatched(next);

    try {
      const res = await fetch("/api/doctor/watched", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, slug, name }),
      });
      if (!res.ok) setWatched(!next); // rollback se falhar
    } catch {
      setWatched(!next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={watched ? "Deixar de monitorar" : "Monitorar este marcador"}
      className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
      style={{
        background: watched ? "rgba(82,183,136,0.18)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${watched ? "rgba(82,183,136,0.4)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {watched
        ? <Eye size={12} style={{ color: "#52B788" }} />
        : <EyeOff size={12} style={{ color: "#5A5A50" }} />
      }
    </button>
  );
}
