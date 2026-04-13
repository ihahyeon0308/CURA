import { notFound } from "next/navigation";
import { Nav } from "../../../../../components/nav";
import { ScoreCard } from "../../../../../components/score-card";
import { getHospitalSpecialtyDetail } from "../../../../../lib/api";

export default async function HospitalSpecialtyPage({
  params,
}: {
  params: Promise<{ hospitalId: string; specialtySlug: string }>;
}) {
  const { hospitalId, specialtySlug } = await params;
  const detail = await getHospitalSpecialtyDetail(hospitalId, specialtySlug);

  if (!detail) {
    notFound();
  }

  return (
    <main className="shell">
      <Nav />
      <section className="hero">
        <div className="eyebrow">{detail.specialty.name}</div>
        <h1 className="headline">
          {detail.hospital.name} <br />
          {detail.specialty.name}
        </h1>
        <p className="subtle">{detail.specialty.description}</p>
      </section>

      <section className="panel">
        <h2>Specialty scorecard</h2>
        <ScoreCard scoreCard={detail.scoreCard} />
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>Comparable treatments</h2>
          <ul className="stack">
            {detail.treatments.map((treatment) => (
              <li key={treatment.id}>
                <strong>{treatment.name}</strong>
                <div className="subtle">
                  {treatment.coverageType} - {treatment.comparabilityTier}
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Published reviews</h2>
          <div className="stack">
            {detail.reviews.map((review) => (
              <article key={review.id} className="result-card">
                <h3>{review.title}</h3>
                <p>{review.body}</p>
                <div className="chip-row">
                  <span className="chip">trust {review.trustScore.toFixed(2)}</span>
                  <span className="chip">visit {review.visitMonth}</span>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
