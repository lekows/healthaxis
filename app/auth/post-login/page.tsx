import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClinicalAdminProfile } from "@/lib/supabase/clinical-admin-queries";
import { getDoctorProfile } from "@/lib/supabase/doctor-queries";

export const dynamic = "force-dynamic";

export default async function PostLoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = await getClinicalAdminProfile();
  if (admin) redirect("/doctor/admin");

  const doctor = await getDoctorProfile();
  if (doctor) redirect("/doctor");

  redirect("/dashboard");
}
