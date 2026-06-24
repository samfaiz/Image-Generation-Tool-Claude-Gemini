/**
 * API client for the Laravel backend using Sanctum SPA (cookie) auth.
 *
 * Flow: GET /sanctum/csrf-cookie once to receive the XSRF-TOKEN cookie, then
 * send it back as the X-XSRF-TOKEN header on every mutating request. All calls
 * use `credentials: "include"` so the session cookie travels cross-port.
 * Requires both apps on `localhost` (see .env.local).
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }

  /** First validation message, if any. */
  firstError(): string | null {
    const key = Object.keys(this.errors)[0];
    return key ? this.errors[key][0] : null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

let csrfReady = false;

async function ensureCsrf(): Promise<void> {
  if (csrfReady && readCookie("XSRF-TOKEN")) return;
  await fetch(`${API_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  csrfReady = true;
}

type RequestOpts = {
  method?: string;
  body?: unknown;
  /** multipart FormData passes through untouched (no JSON content-type). */
  form?: FormData;
};

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const mutating = method !== "GET" && method !== "HEAD";

  if (mutating) await ensureCsrf();

  const headers: Record<string, string> = { Accept: "application/json" };
  const xsrf = readCookie("XSRF-TOKEN");
  if (mutating && xsrf) headers["X-XSRF-TOKEN"] = xsrf;

  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form; // browser sets multipart boundary
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body,
    credentials: "include",
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { message?: string }).message ?? `Request failed (${res.status})`,
      (data as { errors?: Record<string, string[]> }).errors ?? {},
    );
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type User = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
};

export type CredentialStatus = {
  has_claude: boolean;
  has_gemini: boolean;
  claude_last4: string | null;
  gemini_last4: string | null;
  claude_verified: boolean;
  gemini_verified: boolean;
  imagen_model: string | null; // null = Auto (latest available)
  flash_model: string | null; // null = Auto (latest available)
};

export type ModelCatalog = {
  predict: string[]; // Imagen models (no reference image)
  generate: string[]; // Gemini Flash Image models (with reference image)
};

export type MarketRead = {
  summary: string;
  competitor_visuals: { name: string; common_traits: string }[];
  visual_cliches_to_avoid: string[];
  differentiation_angles: string[];
  palette_direction: string;
};

export type ClaudeJson = {
  subject: string;
  style: string;
  composition: string;
  color_palette: string[];
  lighting: string;
  mood: string;
  differentiators_vs_competitors: string[];
  must_include_elements: string[];
  negative_prompt: string;
  aspect_ratio: string;
  final_prompt: string;
};

export type Generation = {
  id: number;
  idea: string;
  industry: string;
  competitors: string;
  elements: string | null;
  reference_url: string | null;
  claude_json: ClaudeJson | null;
  market_read: MarketRead | null;
  final_prompt: string | null;
  aspect_ratio: string;
  provider: string | null;
  image_path: string | null;
  status: "pending" | "prompted" | "generating" | "completed" | "failed";
  error: string | null;
  has_reference: boolean;
  reference_count: number;
  image_url: string | null;
  image_urls: string[];
  created_at: string;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

export const MAX_REFERENCE_IMAGES = 4;

export type IdeationInput = {
  idea: string;
  industry: string;
  competitors: string;
  elements?: string;
  reference_url?: string;
  /** Up to MAX_REFERENCE_IMAGES — all are passed to Claude, the first to Gemini. */
  references?: File[];
  aspect_ratio?: string;
  /** Optional market-research output to feed into the prompt engineer. */
  market_read?: MarketRead;
};

export type MarketInput = {
  idea: string;
  industry: string;
  competitors: string;
  template?: string;
  style_tags?: string[];
  mood_tags?: string[];
};

export type CompetitorsInput = {
  industry: string;
  product_context?: string;
};

export type OptimizeIdeaInput = {
  idea: string;
  industry?: string;
  competitors?: string;
  template?: string;
  subcategory?: string;
  fields?: Record<string, string>;
};

export type OptimizedIdea = {
  optimized_idea: string;
  improvements: string[];
};

export type ConceptSuggestion = {
  title: string;
  hook: string;
  template_id: string;
  idea: string;
  elements: string;
  aspect_ratio: string;
  style_tags: string[];
  mood_tags: string[];
};

export type InspireInput = {
  company_name: string;
  what_company_does: string;
  industry?: string;
};

export type ClarifyQuestion = {
  id: string;
  question: string;
  options: string[];
};

export type ClarifyInput = {
  idea: string;
  industry?: string;
  competitors?: string;
  template?: string;
  style_tags?: string[];
  mood_tags?: string[];
  /** Structured fields already filled in the briefing, keyed by HUMAN LABEL
   *  (e.g. "Brand primary color"). Claude reads these as KNOWN FACTS and skips
   *  questions about anything already supplied. */
  fields?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const api = {
  // Auth
  register: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => request<User>("/api/register", { method: "POST", body: payload }),

  login: (payload: { email: string; password: string; remember?: boolean }) =>
    request<User>("/api/login", { method: "POST", body: payload }),

  logout: () => request<void>("/api/logout", { method: "POST" }),

  me: () => request<User>("/api/user"),

  // Credentials vault
  getCredentials: () => request<CredentialStatus>("/api/credentials"),

  saveCredentials: (payload: {
    claude_key?: string;
    gemini_key?: string;
    imagen_model?: string | null;
    flash_model?: string | null;
    verify?: boolean;
  }) =>
    request<{ credentials: CredentialStatus; verify_errors: Record<string, string> }>(
      "/api/credentials",
      { method: "PUT", body: payload },
    ),

  clearCredentials: () => request<void>("/api/credentials", { method: "DELETE" }),

  // Live image-model catalog for the user's Gemini key (includes future models).
  getModels: () => request<ModelCatalog>("/api/models"),

  // Generations
  suggestCompetitors: (input: CompetitorsInput) =>
    request<{ competitors: string[] }>("/api/generations/competitors", {
      method: "POST",
      body: input,
    }),

  optimizeIdea: (input: OptimizeIdeaInput) =>
    request<OptimizedIdea>("/api/generations/optimize-idea", {
      method: "POST",
      body: input,
    }),

  inspire: (input: InspireInput) =>
    request<{ suggestions: ConceptSuggestion[] }>("/api/generations/inspire", {
      method: "POST",
      body: input,
    }),

  marketResearch: (input: MarketInput) =>
    request<{ market_read: MarketRead }>("/api/generations/market", {
      method: "POST",
      body: input,
    }),

  clarifyBrief: (input: ClarifyInput) =>
    request<{ questions: ClarifyQuestion[] }>("/api/generations/clarify", {
      method: "POST",
      body: input,
    }),

  createGeneration: (input: IdeationInput) => {
    const form = new FormData();
    form.append("idea", input.idea);
    form.append("industry", input.industry);
    form.append("competitors", input.competitors);
    if (input.elements) form.append("elements", input.elements);
    if (input.reference_url) form.append("reference_url", input.reference_url);
    for (const f of input.references ?? []) {
      form.append("references[]", f);
    }
    form.append("aspect_ratio", input.aspect_ratio ?? "9:16");
    if (input.market_read) {
      form.append("market_read", JSON.stringify(input.market_read));
    }
    return request<Generation>("/api/generations", { method: "POST", form });
  },

  generateImage: (id: number, variations = 3) =>
    request<Generation>(`/api/generations/${id}/image`, {
      method: "POST",
      body: { variations },
    }),

  listGenerations: () => request<Paginated<Generation>>("/api/generations"),

  getGeneration: (id: number) => request<Generation>(`/api/generations/${id}`),

  deleteGeneration: (id: number) =>
    request<void>(`/api/generations/${id}`, { method: "DELETE" }),
};
