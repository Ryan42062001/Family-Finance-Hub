"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/profile/view-mode";

// FFH-P05: turns the signed-in user's own Simple view on or off. Writes only the
// caller's own profile row (RLS: id = auth.uid()); the value must be exactly "on"
// or "off", and the user is sent back only to a fixed in-app page.
export async function setSimpleMode(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const choice = formData.get("simple_mode");
  if (choice !== "on" && choice !== "off") redirect(safeReturnPath(formData.get("return_to")));

  const { error } = await supabase.from("profiles").upsert({ id: userId, simple_mode: choice === "on" }, { onConflict: "id" });
  revalidatePath("/", "layout");
  const back = safeReturnPath(formData.get("return_to"));
  if (error) redirect(`${back}?message=${encodeURIComponent("Your view could not be changed. Please try again.")}`);
  redirect(back);
}
