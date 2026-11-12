import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import MobileNavigation from "@/components/MobileNavigation";
import DesktopNavLink from "@/components/DesktopNavLink";
import ThemeToggle from "@/components/ThemeToggle";

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
    <>
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href={authenticated ? "/dashboard" : "/"} aria-label={authenticated ? "Family Finance Hub dashboard" : "Family Finance Hub home"}>
          <span className="brand-mark" aria-hidden="true">FF</span>
          <span><strong>Family Finance Hub</strong><small>Plan together. Move with confidence.</small></span>
        </Link>
        <div className="header-actions">
          {/* App sections are only shown to signed-in users; sign-in/sign-up pages show just the brand. */}
          {authenticated ? (
            <nav className="site-nav" aria-label="Primary navigation">
              {links.map(([name, href]) => <DesktopNavLink key={href} href={href} label={name} />)}
              <form action={logout}><button className="nav-sign-out" type="submit">Sign out</button></form>
            </nav>
          ) : null}
          <ThemeToggle />
          {authenticated ? <details className="mobile-account-menu"><summary>Account</summary><div><span>Household account</span><form action={logout}><button className="nav-sign-out" type="submit">Sign out</button></form></div></details> : null}
        </div>
      </div>
    </header>
    {authenticated ? <MobileNavigation /> : null}
    </>
  );
}
