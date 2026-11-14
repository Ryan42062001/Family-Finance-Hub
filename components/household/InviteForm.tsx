"use client";
import { useActionState, useState } from "react";
import { createInvitation, type InviteState } from "@/app/household/actions";
import { Choice, TextField } from "@/components/forms/Controls";

// FFH-P06: the new link is shown once, here, and never stored in readable form.
export default function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(createInvitation, { link: null, error: null });
  const [copied, setCopied] = useState(false);
  return <div className="invite-form-wrap">
    <form action={formAction} className="data-form friendly-form invite-form">
      <TextField name="label" label="Who is it for? (optional)" example="For example: Jordan" maxLength={60} />
      <Choice name="role" legend="What can they do?" variant="pills" options={[
        { value: "member", label: "Member – can view and edit" },
        { value: "viewer", label: "Viewer – can only look" },
      ]} />
      <button type="submit" disabled={pending}>{pending ? "Creating…" : "Create invite link"}</button>
    </form>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state.link ? <div className="invite-link-box" role="status">
      <p><strong>Send this link to them.</strong> It works once and expires in 7 days. For your privacy it is shown only now.</p>
      <div className="invite-link-row">
        <input readOnly value={state.link} aria-label="Invite link" onFocus={(event) => event.currentTarget.select()} />
        <button type="button" className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(state.link ?? ""); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Copied" : "Copy link"}</button>
      </div>
    </div> : null}
  </div>;
}
