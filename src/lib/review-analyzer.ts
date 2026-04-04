export interface PlaceSearchResult {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
}

export interface AnalyzeRequest {
  business_id?: string;
  place_id?: string;
  name: string;
  address?: string;
  business_type?: string;
  found_on_maps?: boolean;
}

export interface CompetitorInfo {
  name: string;
  rating?: number;
  review_count?: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ComparisonData {
  green: string[];
  red: string[];
  yellow: string[];
}

export interface TimelineData {
  "1_week": string[];
  "1_month": string[];
  "1_year": string[];
}

export interface GrowthPotential {
  score: number;
  summary: string;
}

export interface AnalyzeResponseData {
  competitors?: CompetitorInfo[];
  comparison?: ComparisonData;
  timeline?: TimelineData;
  growth_potential?: GrowthPotential;
}

export interface AnalyzeResponse {
  business_id?: string;
  updated_at?: string;
  data?: AnalyzeResponseData;
  // Fallback flat keys if python returns flat
  strengths?: string;
  weaknesses?: string;
  competitors?: string;
  suggestions?: string;
  time_1_week?: string;
  time_1_month?: string;
  time_1_year?: string;
  competitor_weakness_count?: number;
  full_report?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_REVIEW_ANALYZER_URL || 'http://localhost:8001';

export async function searchBusiness(query: string, location: string): Promise<PlaceSearchResult[]> {
  const url = new URL(`${BASE_URL}/api/search-place`);
  if (query) url.searchParams.append('query', query);
  if (location) url.searchParams.append('location', location);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error('Arama yapılamadı. Servis kapalı olabilir.');
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.places || [];
}

export async function analyzeCompetitors(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      if (res.status === 504) throw new Error('Analiz çok uzun sürdü, lütfen daha sonra tekrar deneyin.');
      throw new Error('Analiz servisi şu an kullanılamıyor.');
    }

    const data = await res.json();
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Analiz çok uzun sürdü (120 saniye), lütfen daha sonra tekrar deneyin.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
