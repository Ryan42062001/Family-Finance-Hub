const cards = [
  { title: "Net Worth", value: "$0", note: "Add accounts to get started" },
  { title: "Monthly Cash Flow", value: "$0", note: "Income minus planned spending" },
  { title: "Savings Rate", value: "0%", note: "Track progress over time" },
  { title: "Financial Health", value: "—", note: "Coming in a later phase" },
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Private household workspace</p>
          <h1>Family Finance Hub</h1>
        </div>
        <nav aria-label="Primary navigation">
          {['Dashboard', 'Budget', 'Goals', 'Retirement', 'Debts', 'Scenarios', 'Settings'].map((item, index) => (
            <a className={index === 0 ? 'nav-link active' : 'nav-link'} href="#" key={item}>{item}</a>
          ))}
        </nav>
        <div className="privacy-note">Your household data stays isolated from every other household.</div>
      </aside>

      <section className="content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Phase 1 · Secure Foundation</p>
            <h2>Household Dashboard</h2>
            <p className="muted">A clean starting point for your financial roadmap.</p>
          </div>
          <button type="button">Add account</button>
        </header>

        <div className="metric-grid">
          {cards.map((card) => (
            <article className="metric-card" key={card.title}>
              <p>{card.title}</p>
              <strong>{card.value}</strong>
              <span>{card.note}</span>
            </article>
          ))}
        </div>

        <div className="panel-grid">
          <article className="panel">
            <p className="eyebrow">Next dollar</p>
            <h3>Money Priority Engine</h3>
            <p className="muted">Once your household profile is complete, this area will rank the best next uses for your money.</p>
            <div className="placeholder-list">
              <span>1. Capture employer match</span>
              <span>2. Build emergency reserves</span>
              <span>3. Fund tax-advantaged accounts</span>
            </div>
          </article>

          <article className="panel">
            <p className="eyebrow">Goals</p>
            <h3>Your Financial Roadmap</h3>
            <p className="muted">Goals, payoff targets, and savings milestones will live here.</p>
            <div className="progress-track"><div className="progress-fill" /></div>
          </article>
        </div>
      </section>
    </main>
  );
}
