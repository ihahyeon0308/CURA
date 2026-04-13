import { getRecommendations } from "../../lib/api";
import { Nav } from "../../components/nav";

export default async function RecommendationsPage() {
  const items = await getRecommendations({
    specialty: "ophthalmology",
    treatment: "cataract-surgery",
    district: "Gangnam-gu",
    mode: "balanced",
  });

  return (
    <main className="shell">
      <Nav />
      <section className="hero">
        <div className="eyebrow">Recommendations</div>
        <h1 className="headline">Balanced recommendations for ophthalmology and cataract comparison.</h1>
        <p className="subtle">
          Public ranking is confidence-adjusted so thin evidence does not overpower stronger but slightly more expensive
          hospitals.
        </p>
      </section>

      <section className="result-grid">
        {items.map((item) => (
          <article key={item.hospitalId} className="result-card">
            <div className="score-label">{item.district}</div>
            <h3>{item.hospitalName}</h3>
            <p className="subtle">{item.specialtyMatch}</p>
            <div className="score">{item.score.toFixed(2)}</div>
            <div className="chip-row">
              <span className="chip">rating {item.scoreCard.rating.toFixed(2)}</span>
              <span className="chip">price {item.scoreCard.price.toFixed(2)}</span>
              <span className="chip">trust {item.scoreCard.trust.toFixed(2)}</span>
              <span className="chip">confidence {item.scoreCard.confidence.toFixed(2)}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
