import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addHsaAccount,
  addHsaPerson,
  deleteAlternateMarriedHsaAllocation,
  deleteHsaTaxYearProfile,
  saveAlternateMarriedHsaAllocation,
  saveHsaTaxYearProfile,
  updateHsaAccountContract,
} from "./actions";

export const dynamic = "force-dynamic";
type PageProps = { searchParams: Promise<{ message?: string }> };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function PersonOptions({ people, includeUnknown = false }: { people: Array<{ id: string; display_name: string; relationship: string }>; includeUnknown?: boolean }) {
  return <>{includeUnknown ? <option value="">Unknown / not assigned</option> : null}{people.map((person) => <option key={person.id} value={person.id}>{person.display_name} · {person.relationship.replaceAll("_", " ")}</option>)}</>;
}

function MonthFields({ rows = [] }: { rows?: Array<{ month: number; eligibility_status: string; coverage_status: string; evidence_status: string }> }) {
  const byMonth = new Map(rows.map((row) => [Number(row.month), row]));
  return <div className="record-list">{MONTHS.map((label, offset) => {
    const month = offset + 1;
    const row = byMonth.get(month);
    return <div className="record-row" key={month}>
      <span><strong>{label}</strong><small>Eligibility, coverage, and evidence for month {month}</small></span>
      <div className="data-form edit-form">
        <label>Eligibility<select name={`eligibility_${month}`} defaultValue={row?.eligibility_status ?? "unknown"}><option value="unknown">Unknown</option><option value="eligible">Eligible</option><option value="ineligible">Ineligible</option></select></label>
        <label>Coverage<select name={`coverage_${month}`} defaultValue={row?.coverage_status ?? "unknown"}><option value="unknown">Unknown</option><option value="self_only">Self-only</option><option value="family">Family</option><option value="none">None</option></select></label>
        <label>Evidence<select name={`evidence_${month}`} defaultValue={row?.evidence_status ?? "unknown"}><option value="unknown">Unknown / not supplied</option><option value="confirmed">Confirmed fact</option><option value="planning_assumption">Planning assumption</option></select></label>
      </div>
    </div>;
  })}</div>;
}

export default async function HsaProfilePage({ searchParams }: PageProps) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");
  const { data: households } = await supabase.from("households").select("id, name").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const [peopleResult, hsaResult, profileResult, monthResult, allocationResult] = await Promise.all([
    supabase.from("household_people").select("id, display_name, relationship, birth_date, is_active").eq("household_id", household.id).order("display_name"),
    supabase.from("retirement_accounts").select("id, owner_person_id, name, balance, monthly_employee_contribution, monthly_employer_contribution, employee_contributed_ytd, employer_contributed_ytd, hsa_ytd_tax_year, hsa_eligible, hsa_coverage_type").eq("household_id", household.id).eq("account_type", "hsa").order("created_at"),
    supabase.from("person_hsa_tax_year_profiles").select("id, person_id, tax_year, medicare_effective_on, last_month_rule_status, testing_period_status, confirmed_at, data_version").eq("household_id", household.id).order("tax_year", { ascending: false }).order("person_id"),
    supabase.from("person_hsa_month_statuses").select("id, person_id, tax_year, month, eligibility_status, coverage_status, evidence_status").eq("household_id", household.id).order("tax_year", { ascending: false }).order("person_id").order("month"),
    supabase.from("household_hsa_married_allocations").select("id, tax_year, person_one_id, person_two_id, person_one_ordinary_amount, person_two_ordinary_amount, confirmed_at").eq("household_id", household.id).order("tax_year", { ascending: false }),
  ]);
  const firstError = [peopleResult, hsaResult, profileResult, monthResult, allocationResult].find((item) => item.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const people = (peopleResult.data ?? []).filter((person) => person.is_active);
  const hsas = hsaResult.data ?? [];
  const profiles = profileResult.data ?? [];
  const months = monthResult.data ?? [];
  const allocations = allocationResult.data ?? [];
  const personName = (id: string | null) => people.find((person) => person.id === id)?.display_name ?? "Unknown person";
  const money = (value: number | string | null) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value ?? 0));
  const currentTaxYear = new Date().getUTCFullYear();

  return <main className="page-shell">
    <section className="hero-card">
      <div><p className="eyebrow">FFH-D005 HSA input contract</p><h1>HSA legal-fact profile</h1><p className="muted">Record the person, tax-year, monthly eligibility/coverage, Medicare timing, and contribution facts the Money Priority Engine will use. This page captures facts only; it does not calculate legal contribution room.</p></div>
      <div className="hero-actions"><Link className="secondary-button" href="/financial-profile">Financial profile</Link><Link className="secondary-button" href="/planning/retirement">Retirement planning</Link></div>
    </section>
    {message ? <p className="success-banner">{message}</p> : null}
    <section className="dashboard-notice"><div><strong>Legacy HSA fields are not full-year certifications.</strong><p>Existing account-level eligibility/coverage values are shown only as legacy hints. New person/month facts default to unknown and must be explicitly supplied. No spouse, owner, Medicare status, or equal/alternate allocation is inferred from account existence.</p></div></section>

    <div className="form-section-grid">
      <section className="panel">
        <h2>Financial people</h2>
        <p className="muted">A spouse can have HSA legal facts even without an HSA account or app login.</p>
        <form className="data-form" action={addHsaPerson}>
          <label>Name<input name="display_name" maxLength={100} required /></label>
          <label>Relationship<select name="relationship" defaultValue="other"><option value="self">Self</option><option value="spouse_partner">Spouse / partner</option><option value="child">Child</option><option value="dependent_adult">Dependent adult</option><option value="other">Other</option></select></label>
          <label>Birth date<input name="birth_date" type="date" /></label>
          <button type="submit">Add financial person</button>
        </form>
        <div className="record-list">{people.map((person) => <div className="record-row" key={person.id}><span><strong>{person.display_name}</strong><small>{person.relationship.replaceAll("_", " ")} · {person.birth_date ?? "birth date unknown"}</small></span></div>)}</div>
      </section>

      <section className="panel">
        <h2>HSA accounts & YTD</h2>
        <p className="muted">Accounts are destinations and contribution ledgers. Owner assignment is explicit. YTD totals used later for legal-capacity math require a tax year.</p>
        <form className="data-form" action={addHsaAccount}>
          <label>Account name<input name="name" maxLength={100} required placeholder="Fidelity HSA" /></label>
          <label>Owner<select name="owner_person_id" defaultValue=""><PersonOptions people={people} includeUnknown /></select></label>
          <label>Balance<input name="balance" type="number" min="0" step="0.01" required /></label>
          <label>Your monthly contribution<input name="monthly_employee_contribution" type="number" min="0" step="0.01" required /></label>
          <label>Employer monthly contribution<input name="monthly_employer_contribution" type="number" min="0" step="0.01" required /></label>
          <label>Employee contributed YTD<input name="employee_contributed_ytd" type="number" min="0" step="0.01" /></label>
          <label>Employer contributed YTD<input name="employer_contributed_ytd" type="number" min="0" step="0.01" /></label>
          <label>YTD tax year<input name="hsa_ytd_tax_year" type="number" min="2004" max="9999" step="1" placeholder={String(currentTaxYear)} /></label>
          <button type="submit">Add HSA account</button>
        </form>
        <div className="record-list">{hsas.map((account) => <div className="record-row" key={account.id}><span><strong>{account.name}</strong><small>{personName(account.owner_person_id)} · {money(account.balance)} · YTD year {account.hsa_ytd_tax_year ?? "unbound"}</small><small>Legacy hint only: eligible {account.hsa_eligible === null ? "unknown" : String(account.hsa_eligible)} · coverage {account.hsa_coverage_type ?? "unknown"}</small></span><details className="edit-panel"><summary>Edit owner / YTD contract</summary><form className="data-form edit-form" action={updateHsaAccountContract}><input type="hidden" name="id" value={account.id} /><label>Owner<select name="owner_person_id" defaultValue={account.owner_person_id ?? ""}><PersonOptions people={people} includeUnknown /></select></label><label>Employee contributed YTD<input name="employee_contributed_ytd" type="number" min="0" step="0.01" defaultValue={account.employee_contributed_ytd ?? ""} /></label><label>Employer contributed YTD<input name="employer_contributed_ytd" type="number" min="0" step="0.01" defaultValue={account.employer_contributed_ytd ?? ""} /></label><label>YTD tax year<input name="hsa_ytd_tax_year" type="number" min="2004" max="9999" step="1" defaultValue={account.hsa_ytd_tax_year ?? ""} /></label><button type="submit">Save HSA contract</button></form></details></div>)}</div>
      </section>
    </div>

    <section className="panel">
      <h2>Person + tax-year monthly HSA facts</h2>
      <p className="muted">Unknown is intentionally non-affirmative. Use “planning assumption” for future months that are expected but not yet confirmed. Medicare timing and last-month-rule reliance are explicit person/tax-year facts and are never inferred.</p>
      {people.length ? <details className="edit-panel"><summary>Add / replace a person tax-year profile</summary><form className="data-form" action={saveHsaTaxYearProfile}><label>Person<select name="person_id" required><PersonOptions people={people} /></select></label><label>Tax year<input name="tax_year" type="number" min="2004" max="9999" step="1" defaultValue={currentTaxYear} required /></label><label>Medicare effective date<input name="medicare_effective_on" type="date" /></label><label>Last-month rule<select name="last_month_rule_status" defaultValue="unknown"><option value="unknown">Unknown / not decided</option><option value="not_elected">Not elected</option><option value="elected">Explicitly elected</option></select></label><label>Testing-period status<select name="testing_period_status" defaultValue="unknown"><option value="unknown">Unknown</option><option value="not_applicable">Not applicable</option><option value="pending">Pending</option><option value="satisfied">Satisfied</option><option value="failed">Failed</option></select></label><MonthFields /><button type="submit">Save person/year/month facts</button></form></details> : <p className="empty-state">Add a financial person before recording HSA legal facts.</p>}

      <div className="record-list">{profiles.map((profile) => {
        const rows = months.filter((row) => row.person_id === profile.person_id && Number(row.tax_year) === Number(profile.tax_year));
        return <div className="record-row" key={profile.id}><span><strong>{personName(profile.person_id)} · {profile.tax_year}</strong><small>Medicare effective: {profile.medicare_effective_on ?? "unknown"} · last-month: {profile.last_month_rule_status ?? "unknown"} · testing: {profile.testing_period_status ?? "unknown"}</small></span><div className="record-actions"><details className="edit-panel"><summary>Edit 12-month facts</summary><form className="data-form edit-form" action={saveHsaTaxYearProfile}><input type="hidden" name="person_id" value={profile.person_id} /><input type="hidden" name="tax_year" value={profile.tax_year} /><label>Medicare effective date<input name="medicare_effective_on" type="date" defaultValue={profile.medicare_effective_on ?? ""} /></label><label>Last-month rule<select name="last_month_rule_status" defaultValue={profile.last_month_rule_status ?? "unknown"}><option value="unknown">Unknown / not decided</option><option value="not_elected">Not elected</option><option value="elected">Explicitly elected</option></select></label><label>Testing-period status<select name="testing_period_status" defaultValue={profile.testing_period_status ?? "unknown"}><option value="unknown">Unknown</option><option value="not_applicable">Not applicable</option><option value="pending">Pending</option><option value="satisfied">Satisfied</option><option value="failed">Failed</option></select></label><MonthFields rows={rows} /><button type="submit">Save changes</button></form></details><form action={deleteHsaTaxYearProfile}><input type="hidden" name="id" value={profile.id} /><button className="danger-button" type="submit">Delete year</button></form></div></div>;
      })}</div>
    </section>

    <section className="panel">
      <h2>Optional alternate married-family ordinary allocation</h2>
      <p className="muted">Do not enter the equal default. Absence of a row means no alternate agreement is persisted; FFH policy derives the equal default later. This form records only a household-confirmed alternate tax-year split and does not calculate or validate the statutory family limit.</p>
      {people.length >= 2 ? <form className="data-form" action={saveAlternateMarriedHsaAllocation}><label>Tax year<input name="tax_year" type="number" min="2004" max="9999" step="1" defaultValue={currentTaxYear} required /></label><label>First person<select name="person_one_id" required><PersonOptions people={people} /></select></label><label>First ordinary-base amount<input name="person_one_ordinary_amount" type="number" min="0" step="0.01" required /></label><label>Second person<select name="person_two_id" required><PersonOptions people={people} /></select></label><label>Second ordinary-base amount<input name="person_two_ordinary_amount" type="number" min="0" step="0.01" required /></label><button type="submit">Save alternate allocation</button></form> : <p className="empty-state">At least two financial people are required for an alternate married allocation.</p>}
      <div className="record-list">{allocations.map((allocation) => <div className="record-row" key={allocation.id}><span><strong>{allocation.tax_year} alternate agreement</strong><small>{personName(allocation.person_one_id)} {money(allocation.person_one_ordinary_amount)} · {personName(allocation.person_two_id)} {money(allocation.person_two_ordinary_amount)}</small></span><form action={deleteAlternateMarriedHsaAllocation}><input type="hidden" name="id" value={allocation.id} /><button className="danger-button" type="submit">Remove alternate</button></form></div>)}</div>
    </section>
  </main>;
}
