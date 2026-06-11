// Form service to fetch forms with filtering
const API_BASE = import.meta.env.VITE_BACKEND_URL;

export interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: any;
}

export interface Form {
  _id: string;
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  questions: FormField[];
  websiteUrl: string;
  created_by: string;
  isActive: boolean;
  is_published: boolean;
  response_count: number;
}

export interface FormsResponse {
  items: Form[];
}

/**
 * Fetch all forms with optional filtering
 * @param filters - Optional filters (websiteUrl, doc_id, created_by)
 * @returns Promise with forms data
 */
export async function fetchForms(filters?: {
  websiteUrl?: string;
  doc_id?: string;
  created_by?: string;
}): Promise<FormsResponse> {
  if (!API_BASE) {
    throw new Error("VITE_BACKEND_URL is not set in .env");
  }

  // Build query parameters
  const params = new URLSearchParams();
  
  if (filters?.websiteUrl) {
    params.append("websiteUrl", filters.websiteUrl);
  }
  
  if (filters?.doc_id) {
    params.append("doc_id", filters.doc_id);
  }
  
  if (filters?.created_by) {
    params.append("created_by", filters.created_by);
  }
  
  // Add cache buster
  params.append("_", Date.now().toString());

  const url = `${API_BASE.replace(/\/+$/, "")}/forms/all?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch forms: ${response.status}`);
  }

  return await response.json();
}

/**
 * Find a form by category/title with fuzzy matching
 * @param forms - Array of forms
 * @param category - Category name to search for
 * @returns Matching form or null
 */
export function findFormByCategory(forms: Form[], category: string): Form | null {
  // Normalizer: lowercase + remove non-alnum
  const normalize = (s?: string) =>
    (s ?? "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  // Simple Levenshtein distance for fuzzy matching
  const levenshtein = (a: string, b: string) => {
    const A = a || "";
    const B = b || "";
    const m = A.length;
    const n = B.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array(n + 1).fill(0)
    );
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          A[i - 1] === B[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
      }
    }
    return dp[m][n];
  };

  const normalizedCategory = normalize(category);

  // 1) exact normalized match
  let matchingForm = forms.find(
    (f) => normalize(f.title) === normalizedCategory
  );

  // 2) includes (e.g., "customerfeedback" includes "feedback")
  if (!matchingForm) {
    matchingForm = forms.find((f) => {
      const nt = normalize(f.title);
      return (
        nt.includes(normalizedCategory) || normalizedCategory.includes(nt)
      );
    });
  }

  // 3) fuzzy fallback (small typos) - threshold = 2
  if (!matchingForm) {
    matchingForm = forms.find((f) => {
      const nt = normalize(f.title);
      const dist = levenshtein(nt, normalizedCategory);
      return dist <= 2;
    });
  }

  return matchingForm || null;
}

/**
 * Normalize form fields to ensure consistent structure
 * @param form - Form object
 * @returns Form with normalized questions array
 */
export function normalizeFormFields(form: Form): Form {
  // Use fields if questions is empty
  const fieldsArray = (form.questions && form.questions.length > 0) 
    ? form.questions 
    : (form.fields || []);

  const normalizedQuestions = fieldsArray.map((q: any, idx: number) => ({
    id:
      q.id ||
      q._id ||
      q.key ||
      `q_${idx}_${Math.random().toString(36).slice(2, 9)}`,
    type: q.type || q.kind || "text",
    label: q.label || q.text || q.question || `Question ${idx + 1}`,
    required: !!q.required,
    placeholder: q.placeholder || "",
    options: Array.isArray(q.options)
      ? q.options
      : q.options
      ? [q.options]
      : [],
    validation: q.validation || {},
  }));

  return {
    ...form,
    questions: normalizedQuestions,
  };
}
