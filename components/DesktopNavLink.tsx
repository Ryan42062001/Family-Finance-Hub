"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function DesktopNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const selected = pathname === href || (href === "/planning" && pathname.startsWith("/planning/"));
  return <Link href={href} aria-current={selected ? "page" : undefined}>{label}</Link>;
}
