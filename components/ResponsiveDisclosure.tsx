"use client";
import { useEffect, useRef, type ReactNode } from "react";
/** Native disclosure: compact on phones, expanded on desktop; no financial writes. */
export default function ResponsiveDisclosure({ summary, children, className = "", targetId }: {
  summary: ReactNode; children: ReactNode; className?: string; targetId?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 761px)");
    const sync = () => { if (ref.current) ref.current.open = media.matches; };
    const revealHash = () => {
      if (!targetId || decodeURIComponent(window.location.hash.slice(1)) !== targetId) return;
      if (ref.current) ref.current.open = true;
      requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block: "start" }));
    };
    sync();
    revealHash();
    media.addEventListener("change", sync);
    window.addEventListener("hashchange", revealHash);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("hashchange", revealHash); };
  }, [targetId]);
  return <details ref={ref} className={className}><summary>{summary}</summary>{children}</details>;
}
