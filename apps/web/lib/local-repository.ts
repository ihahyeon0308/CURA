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

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

const specialties: Specialty[] = [
  { slug: "dermatology", name: "Dermatology", description: "Skin, laser, and outpatient procedural care." },
  { slug: "ophthalmology", name: "Ophthalmology", description: "Vision, cataract, and eye diagnostic care." },
  { slug: "orthopedics", name: "Orthopedics", description: "Joint, spine, and musculoskeletal care." },
  { slug: "health-screening", name: "Health Screening", description: "Checkups and package screening programs." },
];

const treatments: Treatment[] = [
  {
    id: "trt_mri_brain_contrast",
    slug: "mri-brain-contrast",
    specialtySlug: "orthopedics",
    name: "Brain MRI with Contrast",
    serviceClass: "diagnostic",
    coverageType: "mixed",
    comparabilityTier: "tier_2",
    normalizationHints: ["body-region", "contrast", "care-level"],
  },
  {
    id: "trt_cataract",
    slug: "cataract-surgery",
    specialtySlug: "ophthalmology",
    name: "Cataract Surgery",
    serviceClass: "surgery",
    coverageType: "mixed",
    comparabilityTier: "tier_2",
    normalizationHints: ["lens-class", "laterality", "follow-up"],
  },
  {
    id: "trt_laser",
    slug: "laser-toning",
    specialtySlug: "dermatology",
    name: "Laser Toning",
    serviceClass: "procedure",
    coverageType: "non_covered",
    comparabilityTier: "tier_2",
    normalizationHints: ["device-class", "session-count", "area"],
  },
  {
    id: "trt_screening",
    slug: "premium-screening-package",
    specialtySlug: "health-screening",
    name: "Premium Screening Package",
    serviceClass: "screening",
    coverageType: "mixed",
    comparabilityTier: "tier_3",
    normalizationHints: ["package-tier", "imaging", "lab-panel"],
  },
];

const hospitals: Hospital[] = [
  {
    id: "hos_gangnam_univ",
    name: "Gangnam University Hospital",
    district: "Gangnam-gu",
    careLevel: "tertiary_hospital",
    address: "372 Teheran-ro, Gangnam-gu, Seoul",
    lat: 37.5012,
    lon: 127.0396,
    specialties: ["ophthalmology", "orthopedics", "health-screening"],
    aliases: ["GUH", "Gangnam Univ Hospital"],
    summary: "Large tertiary center with strong specialty depth and broad diagnostic infrastructure.",
  },
  {
    id: "hos_mapo_skin",
    name: "Mapo Skin Clinic",
    district: "Mapo-gu",
    careLevel: "clinic",
    address: "128 World Cup-ro, Mapo-gu, Seoul",
    lat: 37.5561,
    lon: 126.9103,
    specialties: ["dermatology"],
    aliases: ["Mapo Skin", "Mapo Dermatology"],
    summary: "Specialty outpatient clinic focused on cosmetic and recurring skin procedures.",
  },
  {
    id: "hos_songpa_eye",
    name: "Songpa Vision Hospital",
    district: "Songpa-gu",
    careLevel: "specialty_hospital",
    address: "44 Olympic-ro, Songpa-gu, Seoul",
    lat: 37.5156,
    lon: 127.1001,
    specialties: ["ophthalmology"],
    aliases: ["Songpa Vision"],
    summary: "Eye-focused specialty hospital with high cataract procedure volume.",
  },
  {
    id: "hos_jongno_bone",
    name: "Jongno Bone and Joint Hospital",
    district: "Jongno-gu",
    careLevel: "hospital",
    address: "88 Jong-ro, Jongno-gu, Seoul",
    lat: 37.5703,
    lon: 126.9822,
    specialties: ["orthopedics", "health-screening"],
    aliases: ["Jongno Bone"],
    summary: "Mid-sized hospital with strong orthopedic outpatient and imaging service lines.",
  },
];

const reviews: ReviewRecord[] = [
  {
    id: "rev_1",
    hospitalId: "hos_gangnam_univ",
    specialtySlug: "ophthalmology",
    treatmentSlug: "cataract-surgery",
    title: "Detailed pre-op explanation and smooth process",
    body: "The care team explained lens options clearly. Waiting time was long, but the discharge process was organized.",
    visitMonth: "2026-02-01",
    evidenceType: "receipt",
    trustScore: 0.91,
    moderationStatus: "published",
    quotedPriceKrw: 2100000,
    paidPriceKrw: 2250000,
    ratings: {
      clinicalQuality: 5,
      priceFairness: 4,
      explanationClarity: 5,
      serviceExperience: 4,
      waitTime: 3,
      accessibility: 4,
      aftercare: 5,
    },
  },
  {
    id: "rev_2",
    hospitalId: "hos_songpa_eye",
    specialtySlug: "ophthalmology",
    treatmentSlug: "cataract-surgery",
    title: "Fast scheduling but higher final invoice",
    body: "Consultation moved quickly and staff were attentive, but final billing was above the initial quote after lens upgrade discussion.",
    visitMonth: "2026-01-01",
    evidenceType: "receipt",
    trustScore: 0.84,
    moderationStatus: "published",
    quotedPriceKrw: 1700000,
    paidPriceKrw: 2480000,
    ratings: {
      clinicalQuality: 4,
      priceFairness: 2,
      explanationClarity: 4,
      serviceExperience: 4,
      waitTime: 4,
      accessibility: 5,
      aftercare: 4,
    },
  },
  {
    id: "rev_3",
    hospitalId: "hos_mapo_skin",
    specialtySlug: "dermatology",
    treatmentSlug: "laser-toning",
    title: "Consistent sessions and transparent pricing",
    body: "The package details were disclosed upfront and session pacing was realistic.",
    visitMonth: "2026-03-01",
    evidenceType: "statement",
    trustScore: 0.79,
    moderationStatus: "published",
    quotedPriceKrw: 180000,
    paidPriceKrw: 180000,
    ratings: {
      clinicalQuality: 4,
      priceFairness: 5,
      explanationClarity: 4,
      serviceExperience: 4,
      waitTime: 4,
      accessibility: 4,
      aftercare: 3,
    },
  },
  {
    id: "rev_4",
    hospitalId: "hos_jongno_bone",
    specialtySlug: "orthopedics",
    treatmentSlug: "mri-brain-contrast",
    title: "Well organized MRI booking",
    body: "Imaging instructions were clear and appointment slots were available quickly.",
    visitMonth: "2026-02-01",
    evidenceType: "receipt",
    trustScore: 0.76,
    moderationStatus: "published",
    quotedPriceKrw: 690000,
    paidPriceKrw: 720000,
    ratings: {
      clinicalQuality: 4,
      priceFairness: 4,
      explanationClarity: 4,
      serviceExperience: 3,
      waitTime: 4,
      accessibility: 4,
      aftercare: 3,
    },
  },
];

const priceRecords: PriceRecord[] = [
  {
    id: "pr_1",
    hospitalId: "hos_gangnam_univ",
    treatmentSlug: "cataract-surgery",
    coverageType: "mixed",
    sourceType: "ugc_receipt",
    amountKrw: 2250000,
    normalizedAmountKrw: 2250000,
    observedAt: "2026-02-10",
    comparabilityScore: 0.92,
    cohortKey: "standard-monofocal-unilateral",
  },
  {
    id: "pr_2",
    hospitalId: "hos_songpa_eye",
    treatmentSlug: "cataract-surgery",
    coverageType: "mixed",
    sourceType: "ugc_receipt",
    amountKrw: 2480000,
    normalizedAmountKrw: 2480000,
    observedAt: "2026-01-18",
    comparabilityScore: 0.89,
    cohortKey: "standard-monofocal-unilateral",
  },
  {
    id: "pr_3",
    hospitalId: "hos_mapo_skin",
    treatmentSlug: "laser-toning",
    coverageType: "non_covered",
    sourceType: "ugc_receipt",
    amountKrw: 180000,
    normalizedAmountKrw: 180000,
    observedAt: "2026-03-06",
    comparabilityScore: 0.96,
    cohortKey: "device-a-single-session-face",
  },
  {
    id: "pr_4",
    hospitalId: "hos_jongno_bone",
    treatmentSlug: "mri-brain-contrast",
    coverageType: "mixed",
    sourceType: "ugc_receipt",
    amountKrw: 720000,
    normalizedAmountKrw: 720000,
    observedAt: "2026-02-21",
    comparabilityScore: 0.87,
    cohortKey: "brain-contrast-hospital",
  },
  {
    id: "pr_5",
    hospitalId: "hos_gangnam_univ",
    treatmentSlug: "premium-screening-package",
    coverageType: "mixed",
    sourceType: "official_api",
    amountKrw: 1450000,
    normalizedAmountKrw: 1450000,
    observedAt: "2026-02-15",
    comparabilityScore: 0.62,
    cohortKey: "premium-tier-a",
  },
];

const communityPosts: CommunityPost[] = [
  {
    id: "post_1",
    hospitalId: "hos_songpa_eye",
    specialtySlug: "ophthalmology",
    title: "Did anyone see a big lens upgrade gap here?",
    body: "I am comparing cataract quotes and noticed a large final jump after premium lens discussion.",
    authorName: "visionwatch",
    createdAt: "2026-03-11T10:00:00.000Z",
  },
  {
    id: "post_2",
    hospitalId: "hos_mapo_skin",
    specialtySlug: "dermatology",
    title: "Session package transparency was better than expected",
    body: "The clinic shared expected maintenance cycle and did not push a larger package.",
    authorName: "mapolocal",
    createdAt: "2026-03-14T09:30:00.000Z",
  },
];

function getHospitalRelatedData(hospitalId: string) {
  return {
    reviews: reviews.filter((review) => review.hospitalId === hospitalId),
    prices: priceRecords.filter((price) => price.hospitalId === hospitalId),
    posts: communityPosts.filter((post) => post.hospitalId === hospitalId),
  };
}

export class LocalRepository {
  search(query: SearchQuery): SearchResultItem[] {
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
      const related = getHospitalRelatedData(hospital.id);
      const scoreCard = buildScoreCard(hospital, related.reviews, related.prices);

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
        const aggregateHospital = hospitals.find((hospital) =>
          treatmentReviews.some((review) => review.hospitalId === hospital.id),
        ) ?? hospitals[0]!;
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

  getHospitalDetail(hospitalId: string): HospitalDetail | undefined {
    const hospital = hospitals.find((candidate) => candidate.id === hospitalId);

    if (!hospital) {
      return undefined;
    }

    const related = getHospitalRelatedData(hospital.id);
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

  getHospitalSpecialtyDetail(hospitalId: string, specialtySlug: string) {
    const detail = this.getHospitalDetail(hospitalId);

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

  getPriceAnalytics(hospitalId: string, treatmentSlug: string) {
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

  getTreatmentDetail(treatmentSlug: string) {
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

  getRecommendations(query: RecommendationQuery): RecommendationItem[] {
    const candidates = hospitals.filter((hospital) => hospital.specialties.includes(query.specialty));

    return candidates
      .filter((hospital) => (query.district ? hospital.district === query.district : true))
      .map((hospital) => {
        const related = getHospitalRelatedData(hospital.id);
        const relevantReviews = related.reviews.filter((review) => review.specialtySlug === query.specialty);
        const relevantPrices = query.treatment
          ? related.prices.filter((price) => price.treatmentSlug === query.treatment)
          : related.prices;
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

  createReview(input: CreateReviewInput): ReviewRecord {
    const review: ReviewRecord = {
      id: `rev_${reviews.length + 1}`,
      hospitalId: input.hospitalId,
      specialtySlug: input.specialtySlug,
      title: input.title,
      body: input.body,
      visitMonth: input.visitMonth,
      evidenceType: input.evidenceType,
      trustScore: input.evidenceType === "receipt" ? 0.78 : 0.64,
      moderationStatus: "pending",
      ratings: input.ratings,
    };

    if (input.treatmentSlug) {
      review.treatmentSlug = input.treatmentSlug;
    }

    if (typeof input.quotedPriceKrw === "number") {
      review.quotedPriceKrw = input.quotedPriceKrw;
    }

    if (typeof input.paidPriceKrw === "number") {
      review.paidPriceKrw = input.paidPriceKrw;
    }

    reviews.unshift(review);
    return review;
  }

  getCommunityPosts(): CommunityPost[] {
    return communityPosts;
  }
}

export const localRepository = new LocalRepository();
