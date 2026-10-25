import type { ReactNode } from "react";
import ResponsiveDisclosure from "@/components/ResponsiveDisclosure";
export default function ProfileSection({ id, title, count, description, children }: {
  id: string; title: string; count: number; description: string; children: ReactNode;
}) {
  return <section className="panel profile-section-panel" id={id}>
    <ResponsiveDisclosure targetId={id} className="profile-section-disclosure"
      summary={<span className="profile-section-heading"><strong>{title}</strong><small>{count} {count === 1 ? "record" : "records"} · {description}</small></span>}>
      <div className="profile-section-body">{children}</div>
    </ResponsiveDisclosure>
  </section>;
}
