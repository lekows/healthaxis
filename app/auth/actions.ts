"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

export async function updateUserRole(userId: string, role: "patient" | "doctor", crm?: string) {
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  if (role === "doctor" && crm) {
    await supabase.from("doctor_profiles")
      .upsert({ doctor_id: userId, crm_number: crm }, { onConflict: "doctor_id" });
  }
}

