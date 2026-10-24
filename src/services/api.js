// Frontend API Client for Agastya Learning Universe Backend
const API_BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'agastya_jwt_token';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiRequest(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
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
    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

// ---------------- Backend Health ----------------
let isBackendAvailable = null;

export async function checkApiHealth() {
  try {
    const res = await apiRequest('/api/health');
    isBackendAvailable = res.status === 'healthy';
    return { connected: true, service: res.service, version: res.version };
  } catch (err) {
    isBackendAvailable = false;
    return { connected: false, error: err.message };
  }
}

export function getApiAvailability() {
  return isBackendAvailable;
}

// ---------------- Auth ----------------
export async function apiRegister(email, password, name, grade = 'School') {
  const res = await apiRequest('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, grade }),
  });
  if (res.token) setAuthToken(res.token);
  return res;
}

export async function apiLogin(email, password) {
  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.token) setAuthToken(res.token);
  return res;
}

export async function apiGetMe() {
  return apiRequest('/api/auth/me');
}

export function apiLogout() {
  setAuthToken(null);
}

// ---------------- Streaks ----------------
export async function apiGetStreak() {
  return apiRequest('/api/streak');
}

export async function apiPingStreak() {
  return apiRequest('/api/streak/ping', { method: 'POST' });
}

// ---------------- Materials ----------------
export async function apiCreateMaterial(fileOrText, title = '') {
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

export async function apiGetMaterial(materialId) {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}`);
}

export async function apiGetStudyPlan(materialId) {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}/study-plan`);
}

export async function apiGetNotes(materialId, language = 'english', topic = null) {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, topic }),
  });
}

export async function apiExplain(materialId, question, language = 'english') {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, language }),
  });
}

// ---------------- Quizzes ----------------
export async function apiCreateQuiz(materialId, kind = 'diagnostic', questionCount = 5, topics = []) {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, question_count: questionCount, topics }),
  });
}

export async function apiGetQuiz(quizId) {
  return apiRequest(`/api/quizzes/${encodeURIComponent(quizId)}`);
}

export async function apiSubmitQuiz(quizId, answers, confidence = 3) {
  return apiRequest(`/api/quizzes/${encodeURIComponent(quizId)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, confidence }),
  });
}

export async function apiGetProgress(materialId) {
  return apiRequest(`/api/materials/${encodeURIComponent(materialId)}/progress`);
}

// ---------------- Doubts Chatbot ----------------
export async function apiChat(query, history = [], materialId = null, language = 'en') {
  return apiRequest('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history, material_id: materialId, language }),
  });
}

// ---------------- Summary ----------------
export async function apiGetSummary() {
  return apiRequest('/api/progress/summary');
}
