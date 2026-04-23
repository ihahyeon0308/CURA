import type {
  Hospital,
  PriceRecord,
  ReviewRecord,
  SearchQuery,
  SearchResultItem,
  Specialty,
  Treatment,
} from "@cura/contracts";
import type { QueryResultRow } from "pg";
import { pool } from "./postgres";

interface HospitalRow extends QueryResultRow {
  id: string;
  name: string;
  district: string;
  care_level: Hospital["careLevel"];
  address: string;
  lat: number;
  lon: number;
  specialties: string[] | string;
  aliases: string[] | string;
  summary: string;
}

interface SpecialtyRow extends QueryResultRow {
  slug: string;
  name: string;
  description: string;
}

interface TreatmentRow extends QueryResultRow {
  id: string;
  slug: string;
  specialty_slug: string;
  name: string;
  service_class: string;
  coverage_type: Treatment["coverageType"];
  comparability_tier: Treatment["comparabilityTier"];
  normalization_hints: string[] | string;
}

interface ReviewRow extends QueryResultRow {
  id: string;
  hospital_id: string;
  specialty_slug: string;
  treatment_slug: string | null;
  title: string;
  body: string;
  visit_month: string;
  evidence_type: ReviewRecord["evidenceType"];
  trust_score: number;
  moderation_status: ReviewRecord["moderationStatus"];
  ratings: ReviewRecord["ratings"] | string;
  quoted_price_krw: number | null;
  paid_price_krw: number | null;
}

interface PriceRecordRow extends QueryResultRow {
  id: string;
  hospital_id: string;
  treatment_slug: string;
  coverage_type: PriceRecord["coverageType"];
  source_type: PriceRecord["sourceType"];
  amount_krw: number;
  normalized_amount_krw: number;
  observed_at: string;
  comparability_score: number;
  cohort_key: string;
}

function parseStringArray(value: string[] | string): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  return JSON.parse(value) as string[];
}

function parseRatings(value: ReviewRecord["ratings"] | string): ReviewRecord["ratings"] {
  if (typeof value === "string") {
    return JSON.parse(value) as ReviewRecord["ratings"];
  }

  return value;
}

function rowToHospital(row: HospitalRow): Hospital {
  return {
    id: row.id,
    name: row.name,
    district: row.district,
    careLevel: row.care_level,
    address: row.address,
    lat: Number(row.lat),
    lon: Number(row.lon),
    specialties: parseStringArray(row.specialties),
    aliases: parseStringArray(row.aliases),
    summary: row.summary,
  };
}

function rowToSpecialty(row: SpecialtyRow): Specialty {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
  };
}

function rowToTreatment(row: TreatmentRow): Treatment {
  return {
    id: row.id,
    slug: row.slug,
    specialtySlug: row.specialty_slug,
    name: row.name,
    serviceClass: row.service_class,
    coverageType: row.coverage_type,
    comparabilityTier: row.comparability_tier,
    normalizationHints: parseStringArray(row.normalization_hints),
  };
}

function rowToReview(row: ReviewRow): ReviewRecord {
  const review: ReviewRecord = {
    id: row.id,
    hospitalId: row.hospital_id,
    specialtySlug: row.specialty_slug,
    title: row.title,
    body: row.body,
    visitMonth: row.visit_month,
    evidenceType: row.evidence_type,
    trustScore: Number(row.trust_score),
    moderationStatus: row.moderation_status,
    ratings: parseRatings(row.ratings),
  };

  if (row.treatment_slug) {
    review.treatmentSlug = row.treatment_slug;
  }

  if (row.quoted_price_krw !== null) {
    review.quotedPriceKrw = row.quoted_price_krw;
  }

  if (row.paid_price_krw !== null) {
    review.paidPriceKrw = row.paid_price_krw;
  }

  return review;
}

function rowToPriceRecord(row: PriceRecordRow): PriceRecord {
  return {
    id: row.id,
    hospitalId: row.hospital_id,
    treatmentSlug: row.treatment_slug,
    coverageType: row.coverage_type,
    sourceType: row.source_type,
    amountKrw: Number(row.amount_krw),
    normalizedAmountKrw: Number(row.normalized_amount_krw),
    observedAt: row.observed_at,
    comparabilityScore: Number(row.comparability_score),
    cohortKey: row.cohort_key,
  };
}

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedAverage(items: Array<{ value: number; weight: number }>): number {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

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

function buildScoreCard(hospital: Hospital, hospitalReviews: ReviewRecord[], hospitalPrices: PriceRecord[]) {
  const publishedReviews = hospitalReviews.filter((review) => review.moderationStatus === "published");
  const ratingComponent = bayesianScore(publishedReviews.map(normalizeRatings));
  const trustComponent = bayesianScore(publishedReviews.map((review) => review.trustScore), 0.6, 3);
  const priceComponent = comparabilityAdjustedPrice(hospitalPrices);
  const confidenceComponent = clamp(
    (Math.log(1 + publishedReviews.length) / Math.log(6)) * 0.55 +
      average(hospitalPrices.map((price) => price.comparabilityScore)) * 0.25 +
      trustComponent * 0.2,
  );

  return {
    rating: round(ratingComponent),
    price: round(priceComponent),
    trust: round(trustComponent),
    confidence: round(confidenceComponent),
  };
}

export async function searchFromDatabase(query: SearchQuery): Promise<SearchResultItem[]> {
  const [hospitalResult, specialtyResult, treatmentResult, reviewResult, priceResult] = await Promise.all([
    pool.query<HospitalRow>("SELECT * FROM hospitals ORDER BY name ASC"),
    pool.query<SpecialtyRow>("SELECT * FROM specialties ORDER BY name ASC"),
    pool.query<TreatmentRow>("SELECT * FROM treatments ORDER BY name ASC"),
    pool.query<ReviewRow>("SELECT * FROM reviews ORDER BY visit_month DESC"),
    pool.query<PriceRecordRow>("SELECT * FROM price_records ORDER BY observed_at DESC"),
  ]);

  const hospitals = hospitalResult.rows.map(rowToHospital);
  const specialties = specialtyResult.rows.map(rowToSpecialty);
  const treatments = treatmentResult.rows.map(rowToTreatment);
  const reviews = reviewResult.rows.map(rowToReview);
  const priceRecords = priceResult.rows.map(rowToPriceRecord);

  const q = query.q?.trim();
  const entityType = query.entityType ?? "all";
  const baseHospitals = hospitals.filter((hospital) => {
    const districtMatches = query.district ? hospital.district === query.district : true;
    const specialtyMatches = query.specialty ? hospital.specialties.includes(query.specialty) : true;
    const qMatches = q
      ? includesText(hospital.name, q) ||
        hospital.aliases.some((alias) => includesText(alias, q)) ||
        hospital.specialties.some((specialty) => includesText(specialty, q))
      : true;

    return districtMatches && specialtyMatches && qMatches;
  });

  const hospitalItems: SearchResultItem[] = baseHospitals.map((hospital) => {
    const relatedReviews = reviews.filter((review) => review.hospitalId === hospital.id);
    const relatedPrices = priceRecords.filter((price) => price.hospitalId === hospital.id);
    const scoreCard = buildScoreCard(hospital, relatedReviews, relatedPrices);

    return {
      entityType: "hospital",
      id: hospital.id,
      name: hospital.name,
      district: hospital.district,
      subtitle: `${hospital.careLevel.replaceAll("_", " ")} - ${hospital.specialties.join(", ")}`,
      href: `/hospitals/${hospital.id}`,
      ratingScore: scoreCard.rating,
      priceScore: scoreCard.price,
      trustScore: scoreCard.trust,
      confidenceScore: scoreCard.confidence,
      matchedOn: q ? ["name", "specialties"] : ["district"],
    };
  });

  const specialtyItems: SearchResultItem[] = specialties
    .filter((specialty) => {
      if (!q) {
        return true;
      }

      return includesText(specialty.name, q) || includesText(specialty.description, q) || includesText(specialty.slug, q);
    })
    .map((specialty) => {
      const specialtyHospitals = hospitals.filter((hospital) => hospital.specialties.includes(specialty.slug));
      const specialtyReviews = reviews.filter((review) => review.specialtySlug === specialty.slug);
      const specialtyPrices = priceRecords.filter((priceRecord) =>
        treatments.find((treatment) => treatment.slug === priceRecord.treatmentSlug)?.specialtySlug === specialty.slug,
      );
      const aggregateHospital = specialtyHospitals[0] ?? hospitals[0]!;
      const scoreCard = buildScoreCard(aggregateHospital, specialtyReviews, specialtyPrices);

      return {
        entityType: "specialty",
        id: specialty.slug,
        name: specialty.name,
        subtitle: specialty.description,
        href: `/search?specialty=${specialty.slug}`,
        ratingScore: scoreCard.rating,
        priceScore: scoreCard.price,
        trustScore: scoreCard.trust,
        confidenceScore: scoreCard.confidence,
        matchedOn: ["specialty"],
      };
    });

  const treatmentItems: SearchResultItem[] = treatments
    .filter((treatment) => {
      if (!q) {
        return true;
      }

      return includesText(treatment.name, q) || includesText(treatment.slug, q) || includesText(treatment.specialtySlug, q);
    })
    .map((treatment) => {
      const treatmentPrices = priceRecords.filter((priceRecord) => priceRecord.treatmentSlug === treatment.slug);
      const treatmentReviews = reviews.filter((review) => review.treatmentSlug === treatment.slug);
      const aggregateHospital =
        hospitals.find((hospital) => treatmentReviews.some((review) => review.hospitalId === hospital.id)) ?? hospitals[0]!;
      const scoreCard = buildScoreCard(aggregateHospital, treatmentReviews, treatmentPrices);

      return {
        entityType: "treatment",
        id: treatment.slug,
        name: treatment.name,
        subtitle: `${treatment.specialtySlug} - ${treatment.coverageType} - ${treatment.comparabilityTier}`,
        href: `/treatments/${treatment.slug}`,
        ratingScore: scoreCard.rating,
        priceScore: scoreCard.price,
        trustScore: scoreCard.trust,
        confidenceScore: scoreCard.confidence,
        matchedOn: ["treatment"],
      };
    });

  return [...hospitalItems, ...specialtyItems, ...treatmentItems]
    .filter((item) => entityType === "all" || item.entityType === entityType)
    .filter((item) => (query.minRating ? item.ratingScore >= query.minRating : true))
    .sort((a, b) => b.confidenceScore + b.ratingScore - (a.confidenceScore + a.ratingScore));
}
