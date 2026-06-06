"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

interface Props {
  token: string;
}

export function ConnectAcceptClient({ token }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function accept() {
    setStatus("loading");
    const res = await fetch("/api/doctor/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (res.status === 401) {
      router.push(`/auth/login?redirect=/connect/${token}`);
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      setErrorMsg(data.error ?? "Erro ao aceitar convite.");
      setStatus("error");
      return;
    }

    setStatus("success");
    setTimeout(() => router.push("/profile"), 2000);
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <CheckCircle size={32} style={{ color: "#52B788" }} />
        <p className="text-sm font-medium" style={{ color: "#52B788" }}>Vínculo criado com sucesso!</p>
        <p className="text-xs" style={{ color: "#9A9688" }}>Redirecionando para o perfil…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status === "error" && (
        <p className="text-sm text-center" style={{ color: "#C1440E" }}>{errorMsg}</p>
      )}
      <button
        onClick={accept}
        disabled={status === "loading"}
        className="w-full py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "#52B788", color: "#0D0D0B" }}
      >
        {status === "loading" ? "Conectando…" : "Aceitar e vincular"}
      </button>
      <p className="text-xs text-center" style={{ color: "#5A5A50" }}>
        Não tem conta? Crie uma em <a href="/auth/signup" style={{ color: "#9A9688", textDecoration: "underline" }}>healthaxis</a> e volte neste link.
      </p>
    </div>
  );
}
