import type { HospitalScoreCard } from "@cura/contracts";

export function ScoreCard({ scoreCard }: { scoreCard: HospitalScoreCard }) {
  const entries = [
    ["Rating", scoreCard.rating],
    ["Price", scoreCard.price],
    ["Trust", scoreCard.trust],
    ["Confidence", scoreCard.confidence],
    ["Balanced", scoreCard.balanced],
    ["Value", scoreCard.value],
    ["Quality", scoreCard.quality],
  ] as const;

  return (
    <div className="metric-grid">
      {entries.map(([label, value]) => (
        <article key={label} className="metric-card">
          <div className="score-label">{label}</div>
          <div className="score">{value.toFixed(2)}</div>
        </article>
      ))}
    </div>
  );
}
