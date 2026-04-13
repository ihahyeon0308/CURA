import type {
  CommunityPost,
  CreateReviewInput,
  Hospital,
  HospitalDetail,
  PriceRecord,
  RecommendationItem,
  RecommendationMode,
  RecommendationQuery,
  ReviewRecord,
  SearchQuery,
  SearchResultItem,
  Specialty,
  Treatment,
} from "@cura/contracts";
import { communityPosts, hospitals, priceRecords, reviews, specialties, treatments } from "../data/seed";
import { buildPriceStats, buildScoreCard } from "./scoring";

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function getHospitalRelatedData(hospitalId: string) {
  return {
    reviews: reviews.filter((review) => review.hospitalId === hospitalId),
    prices: priceRecords.filter((price) => price.hospitalId === hospitalId),
    posts: communityPosts.filter((post) => post.hospitalId === hospitalId),
  };
}

export class SeedRepository {
  getHospitals(): Hospital[] {
    return hospitals;
  }

  getSpecialties(): Specialty[] {
    return specialties;
  }

  getTreatments(): Treatment[] {
    return treatments;
  }

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
      treatmentSlug: input.treatmentSlug,
      title: input.title,
      body: input.body,
      visitMonth: input.visitMonth,
      evidenceType: input.evidenceType,
      trustScore: input.evidenceType === "receipt" ? 0.78 : 0.64,
      moderationStatus: "pending",
      quotedPriceKrw: input.quotedPriceKrw,
      paidPriceKrw: input.paidPriceKrw,
      ratings: input.ratings,
    };

    reviews.unshift(review);
    return review;
  }

  getCommunityPosts(): CommunityPost[] {
    return communityPosts;
  }

  getTreatmentDetail(treatmentSlug: string) {
    const treatment = treatments.find((candidate) => candidate.slug === treatmentSlug);

    if (!treatment) {
      return undefined;
    }

    const relatedReviews = reviews.filter((review) => review.treatmentSlug === treatmentSlug);
    const relatedPrices = priceRecords.filter((priceRecord) => priceRecord.treatmentSlug === treatmentSlug);
    const hospitalsForTreatment = hospitals.filter((hospital) =>
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
