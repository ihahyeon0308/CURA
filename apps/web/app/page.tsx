import Link from "next/link";
import { SeedRepository } from "@cura/domain";
import { Nav } from "../components/nav";

const repository = new SeedRepository();

export default function HomePage() {
  const hospitals = repository.getHospitals();
  const specialties = repository.getSpecialties();

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
              <span className="chip">{hospitals.length} seeded hospitals</span>
              <span className="chip">{specialties.length} specialty lanes</span>
              <span className="chip">typed API and web MVP</span>
            </div>
          </div>
          <div className="panel">
            <h2>What is implemented</h2>
            <ul className="stack">
              <li>Unified search over hospitals and specialties</li>
              <li>Hospital detail pages with scorecards and community context</li>
              <li>Recommendation views for specialty and treatment scenarios</li>
              <li>Seeded review, pricing, and trust scoring domain logic</li>
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
