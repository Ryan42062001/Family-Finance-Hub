import Link from "next/link";

const links = [
  ["Overview", "/dashboard"],
  ["Financial profile", "/financial-profile"],
  ["Planning", "/planning"],
  ["Scenario Lab", "/scenario-lab"],
] as const;

export default function AppHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/dashboard" aria-label="Family Finance Hub dashboard">
          <span className="brand-mark" aria-hidden="true">FF</span>
          <span><strong>Family Finance Hub</strong><small>Plan together. Move with confidence.</small></span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {links.map(([name, href]) => <Link key={href} href={href}>{name}</Link>)}
        </nav>
      </div>
    </header>
  );
}
