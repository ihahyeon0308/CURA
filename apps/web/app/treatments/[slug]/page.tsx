import { notFound } from "next/navigation";
import { Nav } from "../../../components/nav";
import { getTreatmentDetail } from "../../../lib/api";

export default async function TreatmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getTreatmentDetail(slug);

  if (!detail) {
    notFound();
  }

  return (
    <main className="shell">
      <Nav />
      <section className="hero">
        <div className="eyebrow">{detail.treatment.specialtySlug}</div>
        <h1 className="headline">{detail.treatment.name}</h1>
        <p className="subtle">
          {detail.treatment.coverageType} - {detail.treatment.comparabilityTier}
        </p>
        <div className="chip-row">
          {detail.treatment.normalizationHints.map((hint) => (
            <span key={hint} className="chip">
              {hint}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Price comparability</h2>
        <div className="metric-grid">
          <article className="metric-card">
            <div className="score-label">Count</div>
            <div className="score">{detail.priceStats.count}</div>
          </article>
          <article className="metric-card">
            <div className="score-label">Mean</div>
            <div className="score">{detail.priceStats.meanKrw.toLocaleString()}</div>
          </article>
          <article className="metric-card">
            <div className="score-label">Median</div>
            <div className="score">{detail.priceStats.medianKrw.toLocaleString()}</div>
          </article>
          <article className="metric-card">
            <div className="score-label">Comparability</div>
            <div className="score">{detail.priceStats.comparabilityLabel}</div>
          </article>
        </div>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>Hospitals in this cohort</h2>
          <div className="stack">
            {detail.hospitals.map((item) => (
              <div key={item.hospital.id}>
                <strong>{item.hospital.name}</strong>
                <div className="subtle">
                  balanced {item.scoreCard.balanced.toFixed(2)} - price {item.scoreCard.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Linked reviews</h2>
          <div className="stack">
            {detail.reviews.map((review) => (
              <article key={review.id} className="result-card">
                <h3>{review.title}</h3>
                <p>{review.body}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
