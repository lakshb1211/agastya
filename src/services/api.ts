import {
  User,
  StudyPlan,
  ShortNotes,
  Question,
  QuizSubmissionResult,
  ChatMessage
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
const TOKEN_KEY = 'agastya_jwt_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = { ...((options.headers as Record<string, string>) || {}) };
  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    const error = new Error(errorDetail) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

// ---------------- Backend Health ----------------
let isBackendAvailable: boolean | null = null;

export async function checkApiHealth(): Promise<{ connected: boolean; service?: string; version?: string; error?: string }> {
  try {
    const res = await apiRequest<{ status: string; service: string; version: string }>('/api/health');
    isBackendAvailable = res.status === 'healthy';
    return { connected: true, service: res.service, version: res.version };
  } catch (err: any) {
    isBackendAvailable = false;
    return { connected: false, error: err.message };
  }
}

export function getApiAvailability(): boolean | null {
  return isBackendAvailable;
}

// ---------------- Auth ----------------
export async function apiRegister(email: string, password: string, name: string, grade = 'School'): Promise<{ token: string; user: User }> {
  const res = await apiRequest<{ token: string; user: User }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, grade }),
  });
  if (res.token) setAuthToken(res.token);
  return res;
}

export async function apiLogin(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.token) setAuthToken(res.token);
  return res;
}

export async function apiGetMe(): Promise<User> {
  return apiRequest<User>('/api/auth/me');
}

export function apiLogout() {
  setAuthToken(null);
}

// ---------------- Streaks ----------------
export async function apiGetStreak(): Promise<{ streak_count: number; last_active_date: string | null; is_active_today: boolean }> {
  return apiRequest('/api/streak');
}

export async function apiPingStreak(): Promise<{ streak_count: number; last_active_date: string; is_active_today: boolean }> {
  return apiRequest('/api/streak/ping', { method: 'POST' });
}

// ---------------- Materials ----------------
export async function apiCreateMaterial(fileOrText: File | string, title = ''): Promise<{
  id: string;
  title: string;
  created_at: string;
  section_count: number;
  topics: string[];
  sources: string[];
  study_plan: StudyPlan;
  short_notes: ShortNotes;
  next_step: string;
}> {
  const formData = new FormData();
  if (typeof fileOrText === 'string') {
    formData.append('pasted_text', fileOrText);
  } else if (fileOrText instanceof File) {
    formData.append('file', fileOrText);
  } else {
    throw new Error('Invalid material payload. Provide a File or text string.');
  }

  if (title) {
    formData.append('title', title);
  }

  return apiRequest('/api/materials', {
    method: 'POST',
    body: formData,
  });
}

export async function apiGetMaterial(materialId: string) {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}`);
}

export async function apiGetStudyPlan(materialId: string): Promise<StudyPlan> {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}/study-plan`);
}

export async function apiGetNotes(materialId: string, language = 'english', topic: string | null = null): Promise<ShortNotes> {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, topic }),
  });
}

export async function apiExplain(materialId: string, question: string, language = 'english'): Promise<{
  available_in_material: boolean;
  answer: string;
  sources: string[];
}> {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, language }),
  });
}

// ---------------- Quizzes ----------------
export async function apiCreateQuiz(
  materialId: string,
  kind = 'diagnostic',
  questionCount = 5,
  topics: string[] = []
): Promise<{
  quiz_id: string;
  material_id: string;
  kind: string;
  questions: Question[];
  submission_instructions: string;
}> {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, question_count: questionCount, topics }),
  });
}

export async function apiGetQuiz(quizId: string) {
  return apiRequest(`/api/quizzes/${encodeURIComponent(quizId)}`);
}

export async function apiSubmitQuiz(quizId: string, answers: Record<string, number>, confidence = 3): Promise<QuizSubmissionResult> {
  return apiRequest(`/api/quizzes/${encodeURIComponent(quizId)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, confidence }),
  });
}

export async function apiGetProgress(materialId: string) {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}/progress`);
}

// ---------------- Doubts Chatbot ----------------
export async function apiChat(
  query: string,
  history: ChatMessage[] = [],
  materialId: string | null = null,
  language = 'en'
): Promise<{ id: string; query: string; reply: string; language: string; created_at: string }> {
  return apiRequest('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history, material_id: materialId, language }),
  });
}

// ---------------- Summary ----------------
export async function apiGetSummary(): Promise<{
  total_quizzes: number;
  overall_accuracy_percent: number;
  streak_count: number;
  weak_topics: string[];
  recent_attempts: Array<{ id: string; score: number; total: number; kind: string; created_at: string }>;
}> {
  return apiRequest('/api/progress/summary');
}
