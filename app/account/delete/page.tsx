import Link from "next/link";
import { redirect } from "next/navigation";
import DeleteAccountForm from "@/components/account/DeleteAccountForm";
import { readSecurityStatus } from "@/lib/auth/account-security";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// FFH-P08 Part C: says exactly what deletion removes before asking for confirmation (R4).
export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  if (!me) redirect("/auth/login");
  const status = await readSecurityStatus(supabase);
  if (!status?.sessionOk) redirect("/auth/login");

  const { data: mine } = await supabase.from("household_members").select("household_id, role").eq("user_id", me).limit(1);
  const membership = mine?.[0];
  const { data: households } = membership ? await supabase.from("households").select("name").eq("id", membership.household_id).limit(1) : { data: [] };
  const { count: others } = membership
    ? await supabase.from("household_members").select("user_id", { count: "exact", head: true }).eq("household_id", membership.household_id).neq("user_id", me)
    : { count: 0 };
  const householdName = households?.[0]?.name ?? "your household";
  const ownerWithOthers = membership?.role === "owner" && (others ?? 0) > 0;

  return (
    <main className="page-shell account-page">
      <section className="hero-card">
        <div><p className="eyebrow">Account</p><h1>Delete my account</h1><p className="muted">This is permanent. There is no undo and no way to restore it later.</p></div>
      </section>
      <section className="panel">
        <h2>What will be removed</h2>
        {!membership ? (
          <ul><li>Your sign-in and your profile settings.</li></ul>
        ) : membership.role === "owner" ? (
          <ul>
            <li>Your sign-in and your profile settings.</li>
            <li>The household <b>{householdName}</b> and everything in it: accounts, income, bills, debts, retirement and HSA details, goals, monthly check-ins and any pending invitations.</li>
          </ul>
        ) : (
          <ul>
            <li>Your sign-in, your profile settings and your place in <b>{householdName}</b>.</li>
            <li>The household&apos;s money details stay with the household. Check-ins you saved stay, without your name on them.</li>
          </ul>
        )}
      </section>
      <section className="panel">
        {ownerWithOthers ? (
          <p className="form-error" role="status">You own a household that other people belong to. Remove them on the <Link href="/household">Household</Link> page first; ownership can&apos;t be handed over yet.</p>
        ) : (
          <>
            <h2>Confirm</h2>
            <DeleteAccountForm twoFactorOn={status.twoFactorOn} />
          </>
        )}
        <p><Link href="/account">Keep my account</Link></p>
      </section>
    </main>
  );
}
