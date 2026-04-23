import Link from "next/link";
import { Nav } from "../components/nav";

export default function HomePage() {
  return (
    <main className="shell">
      <Nav />
      <section className="hero">
        <div className="eyebrow">Seoul Hospital Decision Support</div>
        <div className="hero-grid">
          <div className="stack">
            <h1 className="headline">Compare hospitals with specialty context, price confidence, and community evidence.</h1>
            <p className="subtle">
              CURA surfaces Seoul hospital and clinic signals with explicit confidence so users can compare value without
              pretending every treatment is equally comparable.
            </p>
            <div className="chip-row">
              <span className="chip">postgresql-backed api</span>
              <span className="chip">confidence-aware ranking</span>
              <span className="chip">typed contracts</span>
            </div>
          </div>
          <div className="panel">
            <h2>What is implemented</h2>
            <ul className="stack">
              <li>Unified search over hospitals and specialties</li>
              <li>Hospital detail pages with scorecards and community context</li>
              <li>Recommendation views for specialty and treatment scenarios</li>
              <li>PostgreSQL-backed repository with migration and bootstrap seed</li>
            </ul>
            <Link href="/search" className="chip">
              Explore live MVP pages
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
