import Link from "next/link";
import type { BillsView } from "@/lib/bills/bills-view";
import { formatCents } from "@/lib/bills/schedule";

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// FFH-P09: household-shared summary of the Bills page on Your plan. Actual payments only; links to /bills.
export default function UpcomingBillsSummary({ view }: { view: BillsView | null }) {
  if (!view) return <section className="bento-card plan-bills" aria-labelledby="plan-bills-heading">
    <h2 id="plan-bills-heading">Upcoming bills</h2>
    <p className="muted">Bills can&apos;t be shown right now.</p>
    <Link className="secondary-button" href="/bills">Open Bills</Link>
  </section>;
  const next = view.upcoming.slice(0, 3);
  return <section className="bento-card plan-bills" aria-labelledby="plan-bills-heading">
    <div className="plan-bills-head">
      <h2 id="plan-bills-heading">Upcoming bills</h2>
      <Link href="/bills">See all bills →</Link>
    </div>
    <p><strong>{formatCents(view.upcomingTotalCents)}</strong> due in the next 30 days ({view.upcoming.length} {view.upcoming.length === 1 ? "payment" : "payments"}).{view.reminders.length ? <> <b>{view.reminders.length} due soon.</b></> : null}</p>
    {next.length ? <ul className="bill-occurrences">{next.map((o) => <li key={`${o.bill.kind}-${o.bill.id}-${o.date}`}><span>{dateLabel(o.date)}</span><span>{o.bill.name}</span><b>{formatCents(o.bill.paymentCents)}</b></li>)}</ul>
      : view.scheduled.length + view.unscheduled.length ? <p className="muted">{view.scheduled.length ? "Nothing is due in the next 30 days." : "Add due dates to your bills to see what's coming up."}</p> : null}
  </section>;
}
