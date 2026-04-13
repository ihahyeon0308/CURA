import Link from "next/link";
import { getSearchResults } from "../../lib/api";
import { Nav } from "../../components/nav";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "hospital";
  const specialty = typeof params.specialty === "string" ? params.specialty : undefined;
  const district = typeof params.district === "string" ? params.district : undefined;
  const results = await getSearchResults({ q, specialty, district, entityType: "all" });

  return (
    <main className="shell">
      <Nav />
      <section className="hero">
        <div className="eyebrow">Unified Search</div>
        <h1 className="headline">Search across Seoul hospitals, specialties, and treatment value signals.</h1>
        <p className="subtle">
          The current seeded MVP emphasizes confidence-aware hospital ranking, not raw popularity.
        </p>
      </section>

      <section className="panel">
        <h2>Search context</h2>
        <div className="chip-row">
          <span className="chip">query: {q}</span>
          {specialty ? <span className="chip">specialty: {specialty}</span> : null}
          {district ? <span className="chip">district: {district}</span> : null}
        </div>
      </section>

      <section className="result-grid">
        {results.map((result) => (
          <article key={result.id} className="result-card">
            <div className="score-label">{result.entityType}</div>
            <h3>{result.name}</h3>
            <p className="subtle">{result.subtitle}</p>
            <div className="chip-row">
              <span className="chip">rating {result.ratingScore.toFixed(2)}</span>
              <span className="chip">price {result.priceScore.toFixed(2)}</span>
              <span className="chip">trust {result.trustScore.toFixed(2)}</span>
            </div>
            <p className="subtle">Confidence {result.confidenceScore.toFixed(2)}</p>
            <Link href={result.href} className="chip">
              Open detail
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
