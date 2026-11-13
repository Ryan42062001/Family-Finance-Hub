"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIMPLE_NAV_PATHS } from "@/lib/profile/view-mode";
const links = [
  { href: "/plan", label: "Plan", icon: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" /></> },
  { href: "/dashboard", label: "Home", icon: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></> },
  { href: "/financial-profile", label: "Profile", icon: <><path d="M4 5h16v14H4z" /><path d="M4 9h16" /><path d="M8 13h4M8 16h7" /></> },
  { href: "/planning", label: "Planning", icon: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></> },
  { href: "/scenario-lab", label: "Scenarios", icon: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /><path d="M7.5 14h9" /></> },
] as const;
export default function MobileNavigation({ simple = false }: { simple?: boolean }) {
  const pathname = usePathname();
  // FFH-P05: Simple view keeps only Plan, Home and Profile in the bottom bar.
  const shown = simple ? links.filter(({ href }) => (SIMPLE_NAV_PATHS as readonly string[]).includes(href)) : links;
  return <nav className={simple ? "mobile-bottom-nav mobile-bottom-nav-simple" : "mobile-bottom-nav"} aria-label="Mobile primary navigation">
    {shown.map(({ href, label, icon }) => {
      const active = pathname === href || (href === "/planning" && pathname.startsWith("/planning/"));
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "mobile-nav-active" : ""}>
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg><span>{label}</span>
      </Link>;
    })}
  </nav>;
}
