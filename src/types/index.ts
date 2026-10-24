export type SupportedLang = 'en' | 'hi' | 'es' | 'fr';

export interface User {
  id: string;
  email: string;
  name: string;
  grade?: string;
  isBackend?: boolean;
  isSupabase?: boolean;
}

export interface Streak {
  n: number;
  last: string | null;
}

export interface Attempt {
  d: number;
  k: string;
  s: number;
  t: number;
  tp: Record<string, [number, number]>;
  id?: string;
  created_at?: string;
}

export interface MaterialSection {
  source?: string;
  citation?: string;
  text: string;
  n?: number;
}

export interface StudyPlanDay {
  day: number;
  theme?: string;
  topic?: string;
  topics?: string[];
  steps?: string[];
  sources?: string[];
}

export interface StudyPlan {
  title?: string;
  study_method?: string;
  schedule?: StudyPlanDay[];
}

export interface KeyPoint {
  text: string;
  citations: string[];
}

export interface ShortNotes {
  visual?: {
    svg?: string;
  };
  key_points?: KeyPoint[];
}

export interface Question {
  id?: string;
  question?: string;
  text?: string;
  options?: string[];
  o?: string[];
  ans?: string;
  correct_index?: number;
  topic?: string;
  citations?: string[];
  p?: number | string;
}

export interface QuizSubmissionReview {
  question_id: string;
  is_correct: boolean;
  correct_option: string;
  sources?: string[];
  topic: string;
}

export interface QuizSubmissionResult {
  score: number;
  total: number;
  weak_areas: string[];
  review: QuizSubmissionReview[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
  created_at?: string;
}

export interface ActiveDoc {
  S: Array<{ t: string; p: number | string; w: string[]; set: Set<string>; topic?: string }>;
  N: number;
  idf: (x: string) => number;
  topics: string[];
  kw: string[];
  used: Set<any>;
  unit: string;
  title: string;
  textSample: string;
}
