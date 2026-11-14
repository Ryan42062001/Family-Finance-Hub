"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { INVITE_COOKIE, INVITE_COOKIE_MAX_AGE_SECONDS, inviteLink, isInviteToken, newInviteToken, parseInviteLabel, parseInviteRole } from "@/lib/household/invitations";

// FFH-P06 household invitations. Every write is checked by the database: the invitations
// table is owner-only (RLS), and membership changes go only through the accept / set-role /
// remove functions, which enforce owner-only, single-use, 7-day and never-the-owner rules.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/auth/login");
  return { supabase, userId };
}

async function ownHousehold(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("households").select("id").order("created_at").limit(1);
  return data?.[0]?.id as string | undefined;
}

function done(message: string): never {
  revalidatePath("/household");
  redirect(`/household?notice=${message}`);
}

export type InviteState = { link: string | null; error: string | null };

// Returns the link to show ONCE; only its hash is stored.
export async function createInvitation(_previous: InviteState, formData: FormData): Promise<InviteState> {
  const { supabase } = await signedIn();
  const householdId = await ownHousehold(supabase);
  if (!householdId) return { link: null, error: "You need a household before you can invite anyone." };
  const role = parseInviteRole(formData.get("role"));
  const label = parseInviteLabel(formData.get("label"));
  if (!role || label === undefined) return { link: null, error: "Choose Member or Viewer, and keep the name to 60 characters." };

  const { token, hash } = newInviteToken();
  const link = inviteLink(process.env.NEXT_PUBLIC_SITE_URL, token);
  if (!link) return { link: null, error: "Invitations aren't available because the site address isn't configured." };
  const { error } = await supabase.from("household_invitations").insert({ household_id: householdId, role, label, token_hash: hash });
  if (error) return { link: null, error: "Only the household owner can invite people." };
  revalidatePath("/household");
  return { link, error: null };
}

export async function cancelInvitation(formData: FormData) {
  const { supabase } = await signedIn();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) done("invalid");
  const { error, count } = await supabase.from("household_invitations").delete({ count: "exact" }).eq("id", id).is("accepted_at", null);
  done(error || !count ? "not_allowed" : "cancelled");
}

export async function changeMemberRole(formData: FormData) {
  const { supabase } = await signedIn();
  const householdId = await ownHousehold(supabase);
  const userId = String(formData.get("user_id") ?? "");
  const role = parseInviteRole(formData.get("role"));
  if (!householdId || !UUID.test(userId) || !role) done("invalid");
  const { error } = await supabase.rpc("set_household_member_role", { p_household_id: householdId, p_user_id: userId, p_role: role });
  done(error ? "not_allowed" : "role_changed");
}

export async function removeMember(formData: FormData) {
  const { supabase } = await signedIn();
  const householdId = await ownHousehold(supabase);
  const userId = String(formData.get("user_id") ?? "");
  if (!householdId || !UUID.test(userId) || formData.get("confirm") !== "yes") done("invalid");
  const { error } = await supabase.rpc("remove_household_member", { p_household_id: householdId, p_user_id: userId });
  done(error ? "not_allowed" : "removed");
}

async function accept(token: string) {
  const { supabase } = await signedIn();
  const jar = await cookies();
  jar.delete(INVITE_COOKIE);
  if (!isInviteToken(token)) redirect("/invite/invalid");
  const { error } = await supabase.rpc("accept_household_invitation", { p_token: token });
  if (error) {
    const already = /already belong/i.test(error.message ?? "");
    redirect(already ? "/invite/already-member" : "/invite/invalid");
  }
  revalidatePath("/", "layout");
  redirect("/plan?notice=joined");
}

export async function acceptInvitation(formData: FormData) {
  await accept(String(formData.get("token") ?? ""));
}

// Signed out: remember the link in a short-lived, httpOnly cookie, then sign in. After
// signing in (or creating an account), the "create your household" screen offers to join.
export async function rememberInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!isInviteToken(token)) redirect("/invite/invalid");
  const jar = await cookies();
  jar.set(INVITE_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: INVITE_COOKIE_MAX_AGE_SECONDS });
  redirect(formData.get("next") === "sign-up" ? "/auth/sign-up" : "/auth/login");
}

export async function acceptRememberedInvitation() {
  const jar = await cookies();
  await accept(jar.get(INVITE_COOKIE)?.value ?? "");
}

export async function forgetRememberedInvitation() {
  const jar = await cookies();
  jar.delete(INVITE_COOKIE);
  redirect("/onboarding");
}
