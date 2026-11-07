"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  { href: "/dashboard", label: "Home", glyph: "⌂" },
  { href: "/financial-profile", label: "Profile", glyph: "▤" },
  { href: "/planning", label: "Planning", glyph: "▦" },
  { href: "/scenario-lab", label: "Scenarios", glyph: "◇" },
] as const;
export default function MobileNavigation() {
  const pathname = usePathname();
  return <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
    {links.map(({ href, label, glyph }) => {
      const active = pathname === href || (href === "/planning" && pathname.startsWith("/planning/"));
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "mobile-nav-active" : ""}>
        <span className="mobile-nav-icon" aria-hidden="true">{glyph}</span><span>{label}</span>
      </Link>;
    })}
  </nav>;
}
