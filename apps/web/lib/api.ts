import type {
  HospitalDetail,
  PriceStats,
  RecommendationItem,
  RecommendationQuery,
  SearchQuery,
  SearchResultItem,
  Treatment,
} from "@cura/contracts";

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}

function localBaseUrl() {
  return "http://localhost:3000";
}

function resolveCandidates() {
  const primary = apiBaseUrl();
  return primary === localBaseUrl() ? [primary] : [primary, localBaseUrl()];
}

async function fetchJson<T>(path: string): Promise<T> {
  const candidates = resolveCandidates();
  let lastError: unknown;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });

      if (response.status === 404) {
        throw new Error("NOT_FOUND");
      }

      if (!response.ok) {
        throw new Error("API_UNAVAILABLE");
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        throw error;
      }

      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("API_UNAVAILABLE");
}

function toQueryString(params: object) {
  const search = new URLSearchParams();

  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if ((typeof value === "string" || typeof value === "number") && value !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function getSearchResults(query: SearchQuery): Promise<SearchResultItem[]> {
  const data = await fetchJson<{ items: SearchResultItem[] }>(`/api/v1/search${toQueryString(query)}`);
  return data.items;
}

export async function getHospitalDetail(hospitalId: string): Promise<HospitalDetail | undefined> {
  try {
    return await fetchJson<HospitalDetail>(`/api/v1/hospitals/${hospitalId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }

    throw error;
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
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }

    throw error;
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
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }

    throw error;
  }
}

export async function getRecommendations(query: RecommendationQuery): Promise<RecommendationItem[]> {
  const data = await fetchJson<{ items: RecommendationItem[] }>(`/api/v1/recommendations${toQueryString(query)}`);
  return data.items;
}
