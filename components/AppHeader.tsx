import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import MobileNavigation from "@/components/MobileNavigation";

const links = [
  ["Overview", "/dashboard"],
  ["Financial profile", "/financial-profile"],
  ["Planning", "/planning"],
  ["Scenario Lab", "/scenario-lab"],
] as const;

export default async function AppHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/dashboard" aria-label="Family Finance Hub dashboard">
          <span className="brand-mark" aria-hidden="true">FF</span>
          <span><strong>Family Finance Hub</strong><small>Plan together. Move with confidence.</small></span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {links.map(([name, href]) => <Link key={href} href={href}>{name}</Link>)}
          {authenticated ? <form action={logout}><button className="nav-sign-out" type="submit">Sign out</button></form> : null}
        </nav>
        {authenticated ? <details className="mobile-account-menu"><summary>Account</summary><div><span>Household account</span><form action={logout}><button className="nav-sign-out" type="submit">Sign out</button></form></div></details> : null}
      </div>
      {authenticated ? <MobileNavigation /> : null}
    </header>
  );
}
