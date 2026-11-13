import { redirect } from "next/navigation";
import { cancelInvitation, changeMemberRole, removeMember } from "@/app/household/actions";
import InviteForm from "@/components/household/InviteForm";
import { createClient } from "@/lib/supabase/server";
import { householdNotice } from "@/lib/household/notices";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ notice?: string | string[] }> };
const roleName = { owner: "Owner", member: "Member", viewer: "Viewer" } as const;
// The current time, read once per request on the server (kept out of render for purity).
function nowIso() { return new Date().toISOString(); }
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// FFH-P06: who is in the household, and (for the owner) invitations and role controls.
export default async function HouseholdPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  if (!me) redirect("/auth/login");
  const { data: households } = await supabase.from("households").select("id, name").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const { data: members } = await supabase.from("household_members").select("user_id, role, created_at").eq("household_id", household.id).order("created_at");
  const isOwner = (members ?? []).some((member) => member.user_id === me && member.role === "owner");
  // RLS returns invitations only to the owner. Accepted ones give members their labels;
  // pending ones (not accepted, not expired) are listed for cancelling.
  const { data: invitations } = isOwner
    ? await supabase.from("household_invitations").select("id, role, label, created_at, expires_at, accepted_at, accepted_by").eq("household_id", household.id).order("created_at", { ascending: false })
    : { data: [] as never[] };
  const { data: pendingRows } = isOwner
    ? await supabase.from("household_invitations").select("id, role, label, expires_at").eq("household_id", household.id).is("accepted_at", null).gt("expires_at", nowIso()).order("created_at", { ascending: false })
    : { data: [] as never[] };
  const labelFor = new Map((invitations ?? []).filter((invite) => invite.accepted_by).map((invite) => [invite.accepted_by as string, invite.label as string | null]));
  const pending = pendingRows ?? [];
  const notice = householdNotice((await searchParams).notice);

  return (
    <main className="page-shell household-page">
      <section className="hero-card">
        <div><p className="eyebrow">Household</p><h1>{household.name}</h1><p className="muted">Everyone listed here can see this household&apos;s money. Members can also edit it; viewers can only look.</p></div>
      </section>
      {notice ? <p className={notice.ok ? "form-success" : "form-error"} role="status">{notice.text}</p> : null}

      <section className="panel">
        <h2>People</h2>
        <ul className="household-people">
          {(members ?? []).map((member) => {
            const self = member.user_id === me;
            const name = self ? "You" : labelFor.get(member.user_id) ?? "Household member";
            return <li key={member.user_id} className="household-person">
              <span><strong>{name}</strong><small>{roleName[member.role as keyof typeof roleName]} · joined {day(member.created_at)}</small></span>
              {isOwner && member.role !== "owner" ? <span className="household-person-actions">
                <form action={changeMemberRole}>
                  <input type="hidden" name="user_id" value={member.user_id} />
                  <input type="hidden" name="role" value={member.role === "member" ? "viewer" : "member"} />
                  <button type="submit" className="secondary-button">{member.role === "member" ? "Make viewer" : "Make member"}</button>
                </form>
                <details className="household-remove">
                  <summary>Remove</summary>
                  <form action={removeMember}>
                    <input type="hidden" name="user_id" value={member.user_id} />
                    <input type="hidden" name="confirm" value="yes" />
                    <p>They will lose access to this household right away.</p>
                    <button type="submit" className="danger-button">Yes, remove {name}</button>
                  </form>
                </details>
              </span> : null}
            </li>;
          })}
        </ul>
      </section>

      {isOwner ? <>
        <section className="panel">
          <h2>Invite someone</h2>
          <p className="muted">You&apos;ll get a link to send them yourself, by text or email. It works once and expires in 7 days.</p>
          <InviteForm />
        </section>
        <section className="panel">
          <h2>Waiting to be accepted</h2>
          {pending.length ? <ul className="household-people">
            {pending.map((invite) => <li key={invite.id} className="household-person">
              <span><strong>{invite.label ?? "Unnamed invitation"}</strong><small>{roleName[invite.role as keyof typeof roleName]} · expires {day(invite.expires_at)}</small></span>
              <form action={cancelInvitation}><input type="hidden" name="id" value={invite.id} /><button type="submit" className="secondary-button">Cancel</button></form>
            </li>)}
          </ul> : <p className="empty-state">No invitations waiting.</p>}
        </section>
      </> : <p className="muted">Only the household owner can invite people or change roles.</p>}
    </main>
  );
}
