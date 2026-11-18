"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { trustedRequestUrl } from "@/lib/auth/trusted-origin";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  // FFH-P08: with two-factor sign-in on, the new session needs its code before anything else.
  const { data: status } = await supabase.rpc("my_security_status");
  if (status?.two_factor_on === true && status?.session_ok !== true) redirect("/auth/two-factor");

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "";
  const trusted = trustedRequestUrl(`${origin}/auth/callback`);
  if (!trusted.trusted) {
    redirect("/auth/sign-up?error=Authentication%20origin%20is%20not%20configured.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: trusted.url.href,
    },
  });

  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/login?message=Check%20your%20email%20to%20confirm%20your%20account.");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
