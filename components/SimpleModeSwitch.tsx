"use client";
import { usePathname } from "next/navigation";
import { setSimpleMode } from "@/app/account/actions";

// FFH-P05: per-user Simple view switch in the account menu. Only changes what the
// signed-in person sees; the server checks the value and the return page.
export default function SimpleModeSwitch({ simple }: { simple: boolean }) {
  const pathname = usePathname();
  return <form action={setSimpleMode} className="simple-mode-switch">
    <input type="hidden" name="simple_mode" value={simple ? "off" : "on"} />
    <input type="hidden" name="return_to" value={pathname} />
    <span className="simple-mode-label"><b>Simple view</b><small>{simple ? "On: fewer screens, just the plan" : "Off: every tool is shown"}</small></span>
    <button type="submit" role="switch" aria-checked={simple} aria-label="Simple view" className={simple ? "simple-mode-toggle on" : "simple-mode-toggle"}><span /></button>
  </form>;
}
