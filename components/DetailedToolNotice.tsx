import { createClient } from "@/lib/supabase/server";
import { readSimpleMode } from "@/lib/profile/view-mode";
import { setSimpleMode } from "@/app/account/actions";

// FFH-P05: shown at the top of detailed tools when the signed-in user has Simple view
// on. The tool still works; this only explains why it is not in the menu.
export default async function DetailedToolNotice({ path }: { path: string }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!(await readSimpleMode(supabase, data?.claims?.sub))) return null;
  return <aside className="detailed-tool-notice" aria-label="Simple view">
    <p><b>You&apos;re using Simple view.</b> This is a detailed tool, so it&apos;s hidden from your menu. It still works here.</p>
    <form action={setSimpleMode}>
      <input type="hidden" name="simple_mode" value="off" />
      <input type="hidden" name="return_to" value={path} />
      <button className="secondary-button" type="submit">Switch to detailed view</button>
    </form>
  </aside>;
}
