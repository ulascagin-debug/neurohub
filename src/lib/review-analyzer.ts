// ── v1 Types ──────────────────────────────────────────────────
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

// ── v2+ Types ─────────────────────────────────────────────────

export interface IntensitySummary {
  avg_intensity: number;
  critical_count: number;
  high_count: number;
  urgent_reviews: Array<{
    text: string;
    rating: number;
    business: string;
    intensity_score: number;
    signals: string[];
  }>;
  level_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface TrendSignal {
  category: string;
  direction: 'rising' | 'falling' | 'stable' | 'critical';
  recent_frequency_pct: number;
  older_frequency_pct: number;
  business_impact: string;
}

export interface TimeSeries {
  trend_signals: TrendSignal[];
  critical_events: Array<{
    keyword: string;
    count_in_recent_30: number;
    interpretation: string;
    opportunity: string;
  }>;
  rating_trend: { direction: string; recent_avg: number; older_avg: number };
  data_quality: 'strong' | 'moderate' | 'weak';
  reviews_analyzed: number;
  note?: string;
}

export interface SegmentData {
  count: number;
  percentage: number;
  avg_rating: number;
  top_complaints: string[];
  top_praises: string[];
  sentiment_score: number;
  opportunity: string;
}

export interface SegmentOpportunity {
  segment: string;
  segment_size_pct: number;
  avg_rating: number;
  gap: string;
  action: string;
  estimated_impact: string;
}

export interface SegmentAnalysis {
  dominant_segment: string;
  most_dissatisfied_segment: string | null;
  segments: Record<string, SegmentData>;
  segment_opportunities: SegmentOpportunity[];
}

export interface PriorityAction {
  action: string;
  source: string;
  impact_level: string;
  ease_level: string;
  priority_score: number;
  priority_label: string;
  timeframe: string;
}

export interface PriorityMatrix {
  prioritized_actions: PriorityAction[];
  quick_wins: PriorityAction[];
  this_week: PriorityAction[];
  this_month: PriorityAction[];
  summary: string;
}

export interface CompetitorProfile {
  name: string;
  avg_rating: number;
  review_count: number;
  threat_score: number;
  threat_level: 'high' | 'medium' | 'low';
  strongest_category: string | null;
  weakest_category: string | null;
  top_weaknesses: string[];
  top_strengths: string[];
  how_to_beat: string;
  monthly_loss_estimate: string;
  intensity_avg: number;
  critical_review_count: number;
}

export interface CompetitorProfiles {
  profiles: Record<string, CompetitorProfile>;
  biggest_threat: string | null;
  easiest_to_beat: string | null;
  threat_summary: string;
}

export interface PriceBreakdownItem {
  count: number;
  label: string;
  action: string;
  examples: string[];
}

export interface PricePerception {
  has_price_issue: boolean;
  total_price_complaints: number;
  price_complaint_ratio: number;
  breakdown: Record<string, PriceBreakdownItem>;
  dominant_type: string | null;
  dominant_label: string | null;
  dominant_action: string | null;
  price_score: number;
  strategic_message: string;
}

// ── Full Analyze Response ─────────────────────────────────────
export interface AnalyzeResponse {
  // v1 legacy
  business_id?: string;
  updated_at?: string;
  strengths?: string;
  weaknesses?: string;
  competitors?: any[];
  suggestions?: string;
  full_report?: string;
  growth_potential?: { score: number; summary: string };
  recommendations?: { weekly: string[]; monthly: string[]; yearly: string[] };
  marketing_messages?: { ad_copies: string[]; social_posts: string[] };
  top_3_competitors?: any[];
  competitor_issues?: Record<string, string[]>;
  comparison_matrix?: any;
  hidden_sector_wounds?: any[];
  layered_analysis?: Record<string, Record<string, any>>;

  // v2+ fields
  intensity_summary?: IntensitySummary;
  time_series?: TimeSeries;
  segment_analysis?: SegmentAnalysis;
  priority_matrix?: PriorityMatrix;
  competitor_profiles?: CompetitorProfiles;
  price_perception?: PricePerception;

  stats?: {
    mode: string;
    total_reviews: number;
    businesses_analyzed: number;
    avg_rating: number;
  };
}

// ── API Client ────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_REVIEW_ANALYZER_URL || 'http://localhost:8001';

export async function searchBusiness(query: string, location: string): Promise<PlaceSearchResult[]> {
  const url = new URL(`${BASE_URL}/api/search-place`);
  if (query) url.searchParams.append('query', query);
  if (location) url.searchParams.append('location', location);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) throw new Error('Arama yapılamadı. Servis kapalı olabilir.');
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

    return await res.json();
  } catch (error: any) {
    if (error.name === 'AbortError') throw new Error('Analiz çok uzun sürdü (120 saniye).');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
