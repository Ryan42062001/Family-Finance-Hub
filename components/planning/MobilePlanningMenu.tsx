"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const tools = [
  { label: "Emergency fund", href: "/planning#emergency-fund" },
  { label: "Mortgage payoff", href: "/planning#mortgage" },
  { label: "Savings goal", href: "/planning#savings-goal" },
  { label: "Retirement pacing", href: "/planning/retirement" },
  { label: "Debt payoff", href: "/planning/debt" },
  { label: "Paycheck planner", href: "/planning/paycheck" },
];
export default function MobilePlanningMenu() {
  const pathname = usePathname();
  return <nav className="mobile-planning-selector" aria-label="Switch planning calculator">
    <span className="eyebrow">Other calculators</span>
    <div className="mobile-planning-options">
      {tools.map(item => <Link key={item.href} href={item.href}
        aria-current={pathname === item.href ? "page" : undefined}
        className={pathname === item.href ? "selected" : ""}>{item.label}</Link>)}
    </div>
  </nav>;
}
