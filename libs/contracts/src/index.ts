export type CareLevel =
  | "clinic"
  | "hospital"
  | "general_hospital"
  | "tertiary_hospital"
  | "specialty_hospital";

export type CoverageType = "covered" | "non_covered" | "mixed" | "unknown";

export type ComparabilityTier = "tier_1" | "tier_2" | "tier_3" | "tier_4";

export type RecommendationMode = "balanced" | "value" | "quality";

export type EntityType = "hospital" | "doctor" | "specialty" | "treatment";

export interface Specialty {
  slug: string;
  name: string;
  description: string;
}

export interface Treatment {
  id: string;
  slug: string;
  specialtySlug: string;
  name: string;
  serviceClass: string;
  coverageType: CoverageType;
  comparabilityTier: ComparabilityTier;
  normalizationHints: string[];
}

export interface RatingBreakdown {
  clinicalQuality: number;
  priceFairness: number;
  explanationClarity: number;
  serviceExperience: number;
  waitTime: number;
  accessibility: number;
  aftercare: number;
}

export interface ReviewRecord {
  id: string;
  hospitalId: string;
  specialtySlug: string;
  treatmentSlug?: string;
  title: string;
  body: string;
  visitMonth: string;
  evidenceType: "none" | "receipt" | "statement";
  trustScore: number;
  moderationStatus: "published" | "pending";
  ratings: RatingBreakdown;
  quotedPriceKrw?: number;
  paidPriceKrw?: number;
}

export interface PriceRecord {
  id: string;
  hospitalId: string;
  treatmentSlug: string;
  coverageType: CoverageType;
  sourceType: "official_api" | "ugc_receipt" | "ugc_self_report";
  amountKrw: number;
  normalizedAmountKrw: number;
  observedAt: string;
  comparabilityScore: number;
  cohortKey: string;
}

export interface Hospital {
  id: string;
  name: string;
  district: string;
  careLevel: CareLevel;
  address: string;
  lat: number;
  lon: number;
  specialties: string[];
  aliases: string[];
  summary: string;
}

export interface CommunityPost {
  id: string;
  hospitalId: string;
  specialtySlug?: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface SearchResultItem {
  entityType: EntityType;
  id: string;
  name: string;
  district?: string;
  subtitle: string;
  href: string;
  ratingScore: number;
  priceScore: number;
  trustScore: number;
  confidenceScore: number;
  matchedOn: string[];
}

export interface HospitalScoreCard {
  rating: number;
  price: number;
  trust: number;
  confidence: number;
  balanced: number;
  value: number;
  quality: number;
}

export interface PriceStats {
  count: number;
  meanKrw: number;
  medianKrw: number;
  variance: number;
  comparabilityLabel: "high" | "medium" | "low" | "not_comparable";
  outlierStatus: "none" | "high" | "low" | "mixed" | "not_comparable";
}

export interface HospitalDetail {
  hospital: Hospital;
  scoreCard: HospitalScoreCard;
  specialties: Array<{
    specialty: Specialty;
    reviewCount: number;
    confidenceScore: number;
  }>;
  featuredTreatments: Treatment[];
  summary: string;
  reviews: ReviewRecord[];
  communityPosts: CommunityPost[];
}

export interface RecommendationItem {
  hospitalId: string;
  hospitalName: string;
  district: string;
  mode: RecommendationMode;
  score: number;
  scoreCard: HospitalScoreCard;
  specialtyMatch: string;
  evidenceCount: number;
}

export interface SearchQuery {
  q?: string;
  entityType?: EntityType | "all";
  district?: string;
  specialty?: string;
  minRating?: number;
}

export interface RecommendationQuery {
  specialty: string;
  treatment?: string;
  district?: string;
  mode: RecommendationMode;
}

export interface CreateReviewInput {
  hospitalId: string;
  specialtySlug: string;
  treatmentSlug?: string;
  title: string;
  body: string;
  visitMonth: string;
  evidenceType: "none" | "receipt" | "statement";
  ratings: RatingBreakdown;
  quotedPriceKrw?: number;
  paidPriceKrw?: number;
}
