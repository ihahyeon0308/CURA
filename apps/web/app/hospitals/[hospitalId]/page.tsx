import { notFound } from "next/navigation";
import { getHospitalDetail } from "../../../lib/api";
import { Nav } from "../../../components/nav";
import { ScoreCard } from "../../../components/score-card";

export default async function HospitalDetailPage({ params }: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await params;
  const detail = await getHospitalDetail(hospitalId);

  if (!detail) {
    notFound();
  }

  return (
    <main className="shell">
      <Nav />
      <section className="hero">
        <div className="eyebrow">{detail.hospital.district}</div>
        <div className="hero-grid">
          <div className="stack">
            <h1 className="headline">{detail.hospital.name}</h1>
            <p className="subtle">{detail.summary}</p>
            <ul className="inline-list">
              {detail.hospital.specialties.map((specialty) => (
                <li key={specialty}>{specialty}</li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2>Decision support summary</h2>
            <p className="subtle">
              Scores blend structured review quality, price comparability, and trust-weighted evidence. Confidence
              reduces the public score when the specialty evidence base is thin.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Scorecard</h2>
        <ScoreCard scoreCard={detail.scoreCard} />
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>Specialty coverage</h2>
          <div className="stack">
            {detail.specialties.map((item) => (
              <div key={item.specialty.slug}>
                <strong>{item.specialty.name}</strong>
                <div className="subtle">
                  {item.reviewCount} reviews - confidence {item.confidenceScore.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Featured treatments</h2>
          <ul className="stack">
            {detail.featuredTreatments.map((treatment) => (
              <li key={treatment.id}>
                <strong>{treatment.name}</strong>
                <div className="subtle">
                  {treatment.coverageType} - {treatment.comparabilityTier} - {treatment.normalizationHints.join(", ")}
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <h2>Recent reviews</h2>
          <div className="stack">
            {detail.reviews.map((review) => (
              <article key={review.id} className="result-card">
                <h3>{review.title}</h3>
                <p>{review.body}</p>
                <div className="chip-row">
                  <span className="chip">trust {review.trustScore.toFixed(2)}</span>
                  <span className="chip">evidence {review.evidenceType}</span>
                  <span className="chip">{review.specialtySlug}</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Community posts</h2>
          <div className="stack">
            {detail.communityPosts.map((post) => (
              <article key={post.id} className="post-card">
                <h3>{post.title}</h3>
                <p>{post.body}</p>
                <div className="subtle">
                  {post.authorName} - {new Date(post.createdAt).toLocaleDateString("en-US")}
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
