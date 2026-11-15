export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  subscription_tier: 'free' | 'starter' | 'pro' | 'agency' | 'custom';
  subscription_status: 'active' | 'expired' | 'pending_approval' | 'canceled';
  monthly_quota: number;
  used_this_month: number;
  quota_resets_at: string;
  is_suspended: boolean;
  created_at: string;
}

export interface UserSettings {
  id?: string;
  user_id?: string;
  wp_base_url: string;
  wp_api_user: string;
  wp_app_password_encrypted?: string;
  ai_provider: 'gemini' | 'openai';
  ai_api_key_encrypted?: string;
  publish_posture: 'always_draft' | 'auto_publish';
  daily_quota: number;
  cron_schedule: string;
  cron_timezone: string;
  is_automation_enabled: boolean;
  last_run_at: string | null;
  next_run_at?: string | null;
  schedule_info?: {
    cron: string;
    hours: number[];
    intervalHours: number;
    description: string;
    slotsFormatted: string[];
  };
}

export interface KeywordRecord {
  id: string;
  user_id: string;
  row_order: number;
  keyword: string;
  content_type: 'BlogPost' | 'Glossary' | 'CategoryPage' | 'LandingSection' | string;
  blogpost_subtype?: 'Guide' | 'HowTo' | 'Explainer' | 'Comparison' | 'Roundup' | 'Review' | 'BuyingGuide' | string | null;
  review_subtype?: string | null;
  cluster: string;
  funnel_stage?: 'TOFU' | 'MOFU' | 'BOFU' | string | null;
  local_modifier?: string | null;
  class_hint: 'A' | 'B' | 'C' | string;
  priority: number;
  status: 'planned' | 'in_progress' | 'published' | 'drafted' | 'failed' | 'paused';
  notes?: string | null;
  phase?: number | null;
  planned_month?: number | null;
  planned_week?: string | null;
  canonical_category?: string | null;
  suggested_tags?: string | null;
  cannibalization_group?: string | null;
  local_data_required?: 'YES' | 'NO' | string | null;
  pass_risk?: 'HIGH' | 'MED' | 'LOW' | string | null;
  wp_post_id?: number | null;
  published_url?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at?: string;
  executed_at?: string;
}

export interface UserPromptRecord {
  id: string;
  user_id: string;
  stage_key: string;
  system_prompt: string;
  user_prompt: string;
  is_customized: boolean;
  default_system_prompt?: string;
  updated_at: string;
}

export interface SiteBrandingInfo {
  siteUrl: string;
  domain: string;
  siteName: string;
  watermarkText: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  user_email?: string;
  gateway: 'payu' | 'usdt_crypto' | 'manual_admin';
  tier_requested: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  payu_txnid?: string;
  payu_mihpayid?: string;
  crypto_network?: string;
  crypto_tx_hash?: string;
  crypto_wallet_sent_from?: string;
  created_at: string;
}

export interface PipelineRunRecord {
  id: string;
  user_id: string;
  keyword_id: string | null;
  keyword_text: string;
  status: 'success' | 'failed' | 'cost_blocked';
  wp_post_id: number | null;
  wp_post_url: string | null;
  duration_seconds: number;
  fail_reasons: string | null;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceINR: number;
  priceUSDT: number;
  monthlyQuota: number;
  features: string[];
  popular?: boolean;
}

export interface AdminMetrics {
  totalUsers: number;
  paidUsers: number;
  totalRevenueINR: number;
  totalRevenueUSDT: number;
  totalArticlesGenerated: number;
}

// ── API CLIENT WRAPPER ──────────────────────────────────────────────

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wcap_token');
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('wcap_token', token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('wcap_token');
}

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running in local dev on port 3000, call backend directly on 3100 to avoid proxy socket hang up
    if (host === 'localhost' || host === '127.0.0.1' || window.location.port === '3000') {
      return `http://${host}:3100`;
    }
  }
  return '';
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.body);
  }

  const baseUrl = getApiBaseUrl();
  const targetUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  const res = await fetch(targetUrl, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    // Only clear token and reload if this is genuinely a SaaS session expiration
    const isUserAuthFailure =
      targetUrl.includes('/api/auth/me') ||
      data.error === 'unauthorized' ||
      data.code === 'SESSION_EXPIRED';

    if (isUserAuthFailure) {
      clearAuthToken();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.reload();
      }
      throw new Error('Session expired. Please log in again.');
    }

    throw new Error(data.error || data.message || 'Unauthorized');
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data as T;
}

