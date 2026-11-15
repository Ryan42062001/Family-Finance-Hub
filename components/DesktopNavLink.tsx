"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Decorative outline icons for the sidebar (hidden from screen readers).
const icons: Record<string, React.ReactNode> = {
  "/plan": <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" /></>,
  "/dashboard": <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  "/financial-profile": <><path d="M4 5h16v14H4z" /><path d="M4 9h16" /><path d="M8 13h4M8 16h7" /></>,
  "/goals": <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
  "/planning": <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  "/scenario-lab": <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /><path d="M7.5 14h9" /></>,
};

export default function DesktopNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const selected = pathname === href || ((href === "/planning" || href === "/goals") && pathname.startsWith(`${href}/`));
  return <Link href={href} aria-current={selected ? "page" : undefined}>
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[href]}</svg>
    <span>{label}</span>
  </Link>;
}
