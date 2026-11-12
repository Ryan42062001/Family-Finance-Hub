"use client";
import { createContext, useEffect, useState, type ReactNode } from "react";
import { decodeFragment } from "@/lib/url-fragment";

const sections = [
  { id: "accounts", name: "Accounts" },
  { id: "income", name: "Income" },
  { id: "expenses", name: "Expenses" },
  { id: "debts", name: "Debts" },
  { id: "retirement", name: "Retirement" },
  { id: "goals", name: "Goals" },
] as const;
export const ProfileSectionSelectionContext = createContext<string>("accounts");
function hashSection() {
  const id = decodeFragment(window.location.hash);
  return id !== null && sections.some(section=>section.id===id) ? id : "accounts";
}
export default function ProfileWorkspace({ children }: { children: ReactNode }) {
  const [active, setActive] = useState("accounts");
  useEffect(()=>{
    const sync = () => setActive(hashSection());
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  return <ProfileSectionSelectionContext.Provider value={active}>
    <div className="profile-desktop-workspace">
      {/* Desktop: a tab row across the top. Phones use the expandable sections instead. */}
      <nav className="profile-jump-nav profile-workspace-navigation" aria-label="Financial profile sections">
        <div className="profile-workspace-links">
          {sections.map(section=><a key={section.id} href={`#${section.id}`}
            aria-current={active === section.id ? "location" : undefined}
            onClick={()=>setActive(section.id)}>{section.name}</a>)}
        </div>
      </nav>
      <div className="form-section-grid profile-workspace-panels">{children}</div>
    </div>
  </ProfileSectionSelectionContext.Provider>;
}
