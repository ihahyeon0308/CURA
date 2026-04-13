import type { Hospital, HospitalScoreCard, PriceRecord, ReviewRecord } from "@cura/contracts";
import { clamp, average, median, round, variance, weightedAverage } from "../utils/math";

function normalizeRatings(review: ReviewRecord): number {
  const values = Object.values(review.ratings).map((score) => score / 5);
  return average(values);
}

function bayesianScore(values: number[], prior = 0.68, smoothing = 4): number {
  if (values.length === 0) {
    return prior;
  }

  const raw = average(values);
  return ((values.length / (values.length + smoothing)) * raw) + ((smoothing / (values.length + smoothing)) * prior);
}

function comparabilityAdjustedPrice(priceRecords: PriceRecord[]): number {
  if (priceRecords.length === 0) {
    return 0.5;
  }

  const amounts = priceRecords.map((record) => record.normalizedAmountKrw);
  const medianAmount = median(amounts);
  const weighted = weightedAverage(
    priceRecords.map((record) => {
      const distanceRatio = medianAmount === 0 ? 1 : Math.abs(record.normalizedAmountKrw - medianAmount) / medianAmount;
      const fairness = clamp(1 - distanceRatio);
      return {
        value: 0.7 * fairness + 0.3 * record.comparabilityScore,
        weight: record.comparabilityScore,
      };
    }),
  );

  return round(weighted);
}

export function buildScoreCard(
  hospital: Hospital,
  hospitalReviews: ReviewRecord[],
  hospitalPrices: PriceRecord[],
): HospitalScoreCard {
  const publishedReviews = hospitalReviews.filter((review) => review.moderationStatus === "published");
  const ratingComponent = bayesianScore(publishedReviews.map(normalizeRatings));
  const trustComponent = bayesianScore(publishedReviews.map((review) => review.trustScore), 0.6, 3);
  const priceComponent = comparabilityAdjustedPrice(hospitalPrices);
  const confidenceComponent = clamp(
    (Math.log(1 + publishedReviews.length) / Math.log(6)) * 0.55 +
      average(hospitalPrices.map((price) => price.comparabilityScore)) * 0.25 +
      trustComponent * 0.2,
  );

  const balanced = confidenceComponent * (0.5 * ratingComponent + 0.25 * priceComponent + 0.25 * trustComponent);
  const value = confidenceComponent * (0.35 * ratingComponent + 0.45 * priceComponent + 0.2 * trustComponent);
  const quality = confidenceComponent * (0.7 * ratingComponent + 0.1 * priceComponent + 0.2 * trustComponent);

  return {
    rating: round(ratingComponent),
    price: round(priceComponent),
    trust: round(trustComponent),
    confidence: round(confidenceComponent),
    balanced: round(balanced),
    value: round(value),
    quality: round(quality),
  };
}

export function buildPriceStats(priceRecords: PriceRecord[]) {
  const amounts = priceRecords.map((record) => record.normalizedAmountKrw);
  const comparability = average(priceRecords.map((record) => record.comparabilityScore));

  const comparabilityLabel =
    comparability >= 0.85 ? "high" : comparability >= 0.65 ? "medium" : comparability > 0 ? "low" : "not_comparable";

  let outlierStatus: "none" | "high" | "low" | "mixed" | "not_comparable" = "none";

  if (comparability === 0 || amounts.length === 0) {
    outlierStatus = "not_comparable";
  } else if (amounts.some((amount) => amount > median(amounts) * 1.25) && amounts.some((amount) => amount < median(amounts) * 0.75)) {
    outlierStatus = "mixed";
  }

  return {
    count: amounts.length,
    meanKrw: Math.round(average(amounts)),
    medianKrw: Math.round(median(amounts)),
    variance: round(variance(amounts)),
    comparabilityLabel,
    outlierStatus,
  };
}
