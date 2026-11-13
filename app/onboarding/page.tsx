import { redirect } from "next/navigation";
import { createHousehold } from "@/app/onboarding/actions";
import { cookies } from "next/headers";
import { acceptRememberedInvitation, forgetRememberedInvitation } from "@/app/household/actions";
import { INVITE_COOKIE, isInviteToken } from "@/lib/household/invitations";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const { data: households } = await supabase.from("households").select("id").limit(1);

  if (households?.length) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  // FFH-P06: someone who opened an invite link before signing in can join instead.
  const hasInvite = isInviteToken((await cookies()).get(INVITE_COOKIE)?.value);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Private household setup</p>
          <h1>Create your household</h1>
          <p className="muted">
            Your household is the private boundary for every financial record in Family Finance Hub.
          </p>
        </div>
      </section>

      {hasInvite ? <section className="panel invite-card">
        <h2>You have an invitation</h2>
        <p className="muted">You opened a link to join someone&apos;s household. Join it instead of creating your own.</p>
        <div className="invite-actions">
          <form action={acceptRememberedInvitation}><button type="submit">Join that household</button></form>
          <form action={forgetRememberedInvitation}><button type="submit" className="secondary-button">Ignore it and create my own</button></form>
        </div>
      </section> : null}

      <section className="panel">
        <h2>Household setup</h2>
        <form action={createHousehold} className="auth-form">
          <label htmlFor="displayName">Your name</label>
          <input id="displayName" name="displayName" type="text" maxLength={100} autoComplete="name" />

          <label htmlFor="householdName">Household name</label>
          <input
            id="householdName"
            name="householdName"
            type="text"
            maxLength={100}
            placeholder="Smith Household"
            required
          />

          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit">Create household</button>
        </form>
      </section>
    </main>
  );
}
