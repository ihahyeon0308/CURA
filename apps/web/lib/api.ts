import type {
  HospitalDetail,
  PriceStats,
  RecommendationItem,
  RecommendationQuery,
  SearchQuery,
  SearchResultItem,
  Treatment,
} from "@cura/contracts";
import { SeedRepository } from "@cura/domain";

const repository = new SeedRepository();

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}

async function fetchJson<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    throw new Error("API_UNAVAILABLE");
  }
}

function toQueryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function getSearchResults(query: SearchQuery): Promise<SearchResultItem[]> {
  try {
    const data = await fetchJson<{ items: SearchResultItem[] }>(`/api/v1/search${toQueryString(query)}`);
    return data.items;
  } catch {
    return repository.search(query);
  }
}

export async function getHospitalDetail(hospitalId: string): Promise<HospitalDetail | undefined> {
  try {
    return await fetchJson<HospitalDetail>(`/api/v1/hospitals/${hospitalId}`);
  } catch {
    return repository.getHospitalDetail(hospitalId);
  }
}

export async function getHospitalSpecialtyDetail(
  hospitalId: string,
  specialtySlug: string,
): Promise<{
  hospital: HospitalDetail["hospital"];
  specialty: { slug: string; name: string; description: string };
  scoreCard: HospitalDetail["scoreCard"];
  treatments: Treatment[];
  reviews: HospitalDetail["reviews"];
} | undefined> {
  try {
    return await fetchJson(`/api/v1/hospitals/${hospitalId}/specialties/${specialtySlug}`);
  } catch {
    return repository.getHospitalSpecialtyDetail(hospitalId, specialtySlug);
  }
}

export async function getTreatmentDetail(slug: string): Promise<
  | {
      treatment: Treatment;
      priceStats: PriceStats;
      hospitals: Array<{
        hospital: HospitalDetail["hospital"];
        scoreCard: HospitalDetail["scoreCard"];
      }>;
      reviews: HospitalDetail["reviews"];
    }
  | undefined
> {
  try {
    return await fetchJson(`/api/v1/treatments/${slug}`);
  } catch {
    return repository.getTreatmentDetail(slug);
  }
}

export async function getRecommendations(query: RecommendationQuery): Promise<RecommendationItem[]> {
  try {
    const data = await fetchJson<{ items: RecommendationItem[] }>(`/api/v1/recommendations${toQueryString(query)}`);
    return data.items;
  } catch {
    return repository.getRecommendations(query);
  }
}
