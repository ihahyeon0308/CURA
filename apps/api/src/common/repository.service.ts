import { Injectable } from "@nestjs/common";
import type {
  CommunityPost,
  CreateReviewInput,
  Hospital,
  HospitalDetail,
  PriceRecord,
  RecommendationItem,
  RecommendationQuery,
  ReviewRecord,
  SearchQuery,
  SearchResultItem,
  Specialty,
  Treatment,
} from "@cura/contracts";
import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { PostgresService } from "./postgres.service";

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

interface CommunityPostRow extends QueryResultRow {
  id: string;
  hospital_id: string;
  specialty_slug: string | null;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
}

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
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

function variance(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const mean = average(values);
  return average(values.map((value) => (value - mean) ** 2));
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

function buildPriceStats(priceRecords: PriceRecord[]) {
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

function rowToCommunityPost(row: CommunityPostRow): CommunityPost {
  const post: CommunityPost = {
    id: row.id,
    hospitalId: row.hospital_id,
    title: row.title,
    body: row.body,
    authorName: row.author_name,
    createdAt: row.created_at,
  };

  if (row.specialty_slug) {
    post.specialtySlug = row.specialty_slug;
  }

  return post;
}

@Injectable()
export class RepositoryService {
  constructor(private readonly postgres: PostgresService) {}

  private getHospitalRelatedData(hospitalId: string, allReviews: ReviewRecord[], allPrices: PriceRecord[], posts: CommunityPost[]) {
    return {
      reviews: allReviews.filter((review) => review.hospitalId === hospitalId),
      prices: allPrices.filter((price) => price.hospitalId === hospitalId),
      posts: posts.filter((post) => post.hospitalId === hospitalId),
    };
  }

  private async getHospitals(): Promise<Hospital[]> {
    const result = await this.postgres.query<HospitalRow>("SELECT * FROM hospitals ORDER BY name ASC");
    return result.rows.map(rowToHospital);
  }

  private async getSpecialties(): Promise<Specialty[]> {
    const result = await this.postgres.query<SpecialtyRow>("SELECT * FROM specialties ORDER BY name ASC");
    return result.rows.map(rowToSpecialty);
  }

  private async getTreatments(): Promise<Treatment[]> {
    const result = await this.postgres.query<TreatmentRow>("SELECT * FROM treatments ORDER BY name ASC");
    return result.rows.map(rowToTreatment);
  }

  private async getReviews(): Promise<ReviewRecord[]> {
    const result = await this.postgres.query<ReviewRow>("SELECT * FROM reviews ORDER BY visit_month DESC");
    return result.rows.map(rowToReview);
  }

  private async getPriceRecords(): Promise<PriceRecord[]> {
    const result = await this.postgres.query<PriceRecordRow>("SELECT * FROM price_records ORDER BY observed_at DESC");
    return result.rows.map(rowToPriceRecord);
  }

  private async getCommunityPostsInternal(): Promise<CommunityPost[]> {
    const result = await this.postgres.query<CommunityPostRow>("SELECT * FROM community_posts ORDER BY created_at DESC");
    return result.rows.map(rowToCommunityPost);
  }

  async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const [hospitals, specialties, treatments, reviews, priceRecords] = await Promise.all([
      this.getHospitals(),
      this.getSpecialties(),
      this.getTreatments(),
      this.getReviews(),
      this.getPriceRecords(),
    ]);
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

  async getHospitalDetail(hospitalId: string): Promise<HospitalDetail | undefined> {
    const [hospitals, specialties, treatments, reviews, priceRecords, communityPosts] = await Promise.all([
      this.getHospitals(),
      this.getSpecialties(),
      this.getTreatments(),
      this.getReviews(),
      this.getPriceRecords(),
      this.getCommunityPostsInternal(),
    ]);
    const hospital = hospitals.find((candidate) => candidate.id === hospitalId);

    if (!hospital) {
      return undefined;
    }

    const related = this.getHospitalRelatedData(hospital.id, reviews, priceRecords, communityPosts);
    const scoreCard = buildScoreCard(hospital, related.reviews, related.prices);

    return {
      hospital,
      scoreCard,
      specialties: hospital.specialties.map((specialtySlug) => ({
        specialty: specialties.find((specialty) => specialty.slug === specialtySlug)!,
        reviewCount: related.reviews.filter((review) => review.specialtySlug === specialtySlug).length,
        confidenceScore: scoreCard.confidence,
      })),
      featuredTreatments: treatments.filter((treatment) => hospital.specialties.includes(treatment.specialtySlug)),
      summary: hospital.summary,
      reviews: related.reviews,
      communityPosts: related.posts,
    };
  }

  async getPriceAnalytics(hospitalId: string, treatmentSlug: string): Promise<{
    treatment: Treatment | undefined;
    stats: ReturnType<typeof buildPriceStats>;
    sourceMix: Record<string, number>;
  }> {
    const [treatments, priceRecords] = await Promise.all([this.getTreatments(), this.getPriceRecords()]);
    const treatmentPrices = priceRecords.filter(
      (priceRecord) => priceRecord.hospitalId === hospitalId && priceRecord.treatmentSlug === treatmentSlug,
    );

    return {
      treatment: treatments.find((treatment) => treatment.slug === treatmentSlug),
      stats: buildPriceStats(treatmentPrices),
      sourceMix: treatmentPrices.reduce<Record<string, number>>((acc, record) => {
        acc[record.sourceType] = (acc[record.sourceType] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }

  async getHospitalSpecialtyDetail(hospitalId: string, specialtySlug: string): Promise<
    | {
        hospital: HospitalDetail["hospital"];
        specialty: Specialty;
        scoreCard: HospitalDetail["scoreCard"];
        treatments: Treatment[];
        reviews: HospitalDetail["reviews"];
      }
    | undefined
  > {
    const [detail, specialties, treatments, priceRecords] = await Promise.all([
      this.getHospitalDetail(hospitalId),
      this.getSpecialties(),
      this.getTreatments(),
      this.getPriceRecords(),
    ]);
    if (!detail) {
      return undefined;
    }

    const specialty = specialties.find((item) => item.slug === specialtySlug);

    if (!specialty) {
      return undefined;
    }

    const specialtyReviews = detail.reviews.filter((review) => review.specialtySlug === specialtySlug);
    const specialtyTreatments = treatments.filter((treatment) => treatment.specialtySlug === specialtySlug);

    return {
      hospital: detail.hospital,
      specialty,
      scoreCard: buildScoreCard(
        detail.hospital,
        specialtyReviews,
        priceRecords.filter(
          (priceRecord) =>
            priceRecord.hospitalId === hospitalId &&
            specialtyTreatments.some((treatment) => treatment.slug === priceRecord.treatmentSlug),
        ),
      ),
      treatments: specialtyTreatments,
      reviews: specialtyReviews,
    };
  }

  async getRecommendations(query: RecommendationQuery): Promise<RecommendationItem[]> {
    const [hospitals, reviews, priceRecords] = await Promise.all([this.getHospitals(), this.getReviews(), this.getPriceRecords()]);
    const candidates = hospitals.filter((hospital) => hospital.specialties.includes(query.specialty));

    return candidates
      .filter((hospital) => (query.district ? hospital.district === query.district : true))
      .map((hospital) => {
        const relatedReviews = reviews.filter((review) => review.hospitalId === hospital.id);
        const relatedPrices = priceRecords.filter((price) => price.hospitalId === hospital.id);
        const relevantReviews = relatedReviews.filter((review) => review.specialtySlug === query.specialty);
        const relevantPrices = query.treatment
          ? relatedPrices.filter((price) => price.treatmentSlug === query.treatment)
          : relatedPrices;
        const scoreCard = buildScoreCard(hospital, relevantReviews, relevantPrices);
        const score = scoreCard[query.mode];

        return {
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          district: hospital.district,
          mode: query.mode,
          score,
          scoreCard,
          specialtyMatch: query.specialty,
          evidenceCount: relevantReviews.length,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  async createReview(input: CreateReviewInput): Promise<ReviewRecord> {
    const id = `rev_${randomUUID()}`;
    const trustScore = input.evidenceType === "receipt" ? 0.78 : 0.64;
    const result = await this.postgres.query<ReviewRow>(
      `INSERT INTO reviews (
        id,
        hospital_id,
        specialty_slug,
        treatment_slug,
        title,
        body,
        visit_month,
        evidence_type,
        trust_score,
        moderation_status,
        ratings,
        quoted_price_krw,
        paid_price_krw
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::date, $8, $9, 'pending', $10::jsonb, $11, $12
      )
      RETURNING *`,
      [
        id,
        input.hospitalId,
        input.specialtySlug,
        input.treatmentSlug ?? null,
        input.title,
        input.body,
        input.visitMonth,
        input.evidenceType,
        trustScore,
        JSON.stringify(input.ratings),
        input.quotedPriceKrw ?? null,
        input.paidPriceKrw ?? null,
      ],
    );

    return rowToReview(result.rows[0]!);
  }

  getCommunityPosts(): Promise<CommunityPost[]> {
    return this.getCommunityPostsInternal();
  }

  async getTreatmentDetail(treatmentSlug: string): Promise<
    | {
        treatment: Treatment;
        priceStats: ReturnType<typeof buildPriceStats>;
        hospitals: Array<{
          hospital: HospitalDetail["hospital"];
          scoreCard: HospitalDetail["scoreCard"];
        }>;
        reviews: HospitalDetail["reviews"];
      }
    | undefined
  > {
    const [treatments, reviews, priceRecords, hospitals] = await Promise.all([
      this.getTreatments(),
      this.getReviews(),
      this.getPriceRecords(),
      this.getHospitals(),
    ]);
    const treatment = treatments.find((candidate) => candidate.slug === treatmentSlug);

    if (!treatment) {
      return undefined;
    }

    const relatedReviews = reviews.filter((review) => review.treatmentSlug === treatmentSlug);
    const relatedPrices = priceRecords.filter((priceRecord) => priceRecord.treatmentSlug === treatmentSlug);
    const hospitalsForTreatment = hospitals.filter(
      (hospital) =>
        relatedReviews.some((review) => review.hospitalId === hospital.id) ||
        relatedPrices.some((priceRecord) => priceRecord.hospitalId === hospital.id),
    );

    return {
      treatment,
      priceStats: buildPriceStats(relatedPrices),
      hospitals: hospitalsForTreatment.map((hospital) => ({
        hospital,
        scoreCard: buildScoreCard(
          hospital,
          relatedReviews.filter((review) => review.hospitalId === hospital.id),
          relatedPrices.filter((priceRecord) => priceRecord.hospitalId === hospital.id),
        ),
      })),
      reviews: relatedReviews,
    };
  }
}
