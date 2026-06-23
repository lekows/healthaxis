"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Rede de segurança para o fluxo de recuperação de senha.
 *
 * O Supabase, ao verificar o link do e-mail, redireciona para a URL configurada
 * com os tokens no hash (ex.: `#access_token=...&type=recovery`). Se a Redirect
 * URL não estiver na allowlist, ele cai no Site URL (a home), onde nada trata o
 * token. Este componente, montado no layout raiz, detecta esse hash em qualquer
 * página e leva o usuário para `/auth/update-password`, preservando o hash para
 * que o client Supabase estabeleça a sessão de recuperação lá.
 */
export function RecoveryHashRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const type = params.get("type");
    const error = params.get("error") || params.get("error_code");

    if (type === "recovery") {
      if (pathname !== "/auth/update-password") {
        router.replace(`/auth/update-password${hash}`);
      }
      return;
    }

    // Link expirado/ inválido (ex.: otp_expired): orienta a pedir um novo.
    if (error && pathname !== "/auth/recover") {
      router.replace("/auth/recover");
    }
  }, [pathname, router]);

  return null;
}
