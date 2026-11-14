import type { Metadata } from "next";
import Link from "next/link";
import { acceptInvitation, rememberInvitation } from "@/app/household/actions";
import { createClient } from "@/lib/supabase/server";
import { isInviteToken } from "@/lib/household/invitations";

export const dynamic = "force-dynamic";
// The link itself is the secret: never send it to another site as a referrer.
export const metadata: Metadata = { title: "Household invitation · Family Finance Hub", referrer: "no-referrer", robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ token: string }> };

// FFH-P06: where an invite link lands. Nothing about the household is shown before the
// person accepts; the database checks the link when they do.
export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  if (token === "already-member") {
    return <main className="page-shell"><section className="panel invite-card"><h1>You&apos;re already in a household</h1><p className="muted">Each account can belong to one household. To join this one, sign in with a different account or ask the person who invited you for help.</p><Link className="secondary-button" href="/plan">Go to your plan</Link></section></main>;
  }
  if (!isInviteToken(token)) {
    return <main className="page-shell"><section className="panel invite-card"><h1>This invitation isn&apos;t valid</h1><p className="muted">It may have expired, already been used or been cancelled. Ask the person who invited you for a new link.</p><Link className="secondary-button" href="/">Go to the home page</Link></section></main>;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  return (
    <main className="page-shell">
      <section className="panel invite-card">
        <p className="eyebrow">Household invitation</p>
        <h1>You&apos;ve been invited to join a household</h1>
        <p className="muted">Joining lets you see the household&apos;s money plan together. Each account can belong to one household.</p>
        {signedIn ? <form action={acceptInvitation}>
          <input type="hidden" name="token" value={token} />
          <button type="submit">Join the household</button>
        </form> : <div className="invite-actions">
          <form action={rememberInvitation}><input type="hidden" name="token" value={token} /><input type="hidden" name="next" value="sign-in" /><button type="submit">Sign in to join</button></form>
          <form action={rememberInvitation}><input type="hidden" name="token" value={token} /><input type="hidden" name="next" value="sign-up" /><button type="submit" className="secondary-button">Create an account</button></form>
        </div>}
      </section>
    </main>
  );
}
