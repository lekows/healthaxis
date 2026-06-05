"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string };

export async function updateProfile(data: {
  name: string;
  dob: string | null;
  sex: "masculino" | "feminino" | "outro" | null;
  blood: string | null;
  height: number | null;
  weight: number | null;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada. Faça login novamente." };

    const { error } = await supabase.from("profiles").update({
      name:   data.name,
      dob:    data.dob    || null,
      sex:    data.sex    || null,
      blood:  data.blood  || null,
      height: data.height ?? null,
      weight: data.weight ?? null,
    }).eq("id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar perfil." };
  }
}
