import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Streak,
  Attempt,
  SupportedLang,
  ActiveDoc,
  StudyPlan,
  ShortNotes
} from '../types';
import { tr, formatStreak } from '../services/i18n';
import {
  fetchStreak,
  syncActiveStreak,
  fetchAttempts,
  clearAllAttempts
} from '../services/storage';
import {
  checkApiHealth,
  apiGetMe,
  apiLogin,
  apiRegister,
  apiLogout,
  getAuthToken
} from '../services/api';
import { supabase, isSupabaseConfigured, getSupabaseStatus } from '../lib/supabase.js';

export type ViewType = 'home' | 'learn' | 'progress' | 'account' | 'journey';
export type StudioTab = 'material' | 'ask' | 'quiz' | 'plan' | 'progress';

interface AppContextType {
  view: ViewType;
  setView: (v: ViewType) => void;
  go: (v: ViewType) => void;
  studioTab: StudioTab;
  setStudioTab: (t: StudioTab) => void;
  goToStep: (step: string) => void;
  lang: SupportedLang;
  setLang: (l: SupportedLang) => void;
  t: (text: string) => string;
  user: User | null;
  authStatus: { connected: boolean; message: string; isApi?: boolean };
  login: (em: string, pw: string) => Promise<{ success: boolean; message?: string }>;
  register: (em: string, pw: string, nm: string, gr: string) => Promise<{ success: boolean; message?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
  streak: Streak;
  latestScore: number;
  refreshProgress: () => Promise<void>;
  clearHistory: () => Promise<void>;
  toastMsg: string | null;
  showToast: (msg: string) => void;
  activeDoc: ActiveDoc | null;
  setActiveDoc: (doc: ActiveDoc | null) => void;
  backendMaterialId: string | null;
  setBackendMaterialId: (id: string | null) => void;
  studyPlan: StudyPlan | null;
  setStudyPlan: (p: StudyPlan | null) => void;
  shortNotes: ShortNotes | null;
  setShortNotes: (n: ShortNotes | null) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [view, setView] = useState<ViewType>('home');
  const [studioTab, setStudioTab] = useState<StudioTab>('material');
  const [lang, setLang] = useState<SupportedLang>('en');
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<{ connected: boolean; message: string; isApi?: boolean }>({
    connected: false,
    message: 'Local Mode'
  });
  const [streak, setStreak] = useState<Streak>({ n: 0, last: null });
  const [latestScore, setLatestScore] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<ActiveDoc | null>(null);
  const [backendMaterialId, setBackendMaterialId] = useState<string | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [shortNotes, setShortNotes] = useState<ShortNotes | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Translation shortcut
  const t = (text: string) => tr(text, lang);

  const go = (targetView: ViewType) => {
    setView(targetView);
    window.location.hash = targetView;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const goToStep = (step: string) => {
    go('learn');
    if (step === 'pdf' || step === 'material') {
      setStudioTab('material');
    } else if (step === 'quiz') {
      setStudioTab('quiz');
    } else if (step === 'ask') {
      setStudioTab('ask');
    } else if (step === 'progress') {
      go('progress');
    } else if (step === 'plan') {
      setStudioTab('plan');
    }
  };

  // Synchronize hash routing
  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash.replace('#', '') as ViewType;
      if (['home', 'learn', 'progress', 'account', 'journey'].includes(h)) {
        setView(h);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Update HTML lang attribute
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Load progress metrics (streak & score)
  const refreshProgress = async () => {
    try {
      const s = await fetchStreak(user);
      setStreak(s);
      const attempts = await fetchAttempts(user);
      if (attempts.length > 0) {
        const last = attempts[attempts.length - 1];
        const pct = last.t > 0 ? Math.round((last.s / last.t) * 100) : 0;
        setLatestScore(pct);
      } else {
        setLatestScore(0);
      }
    } catch (e) {
      console.warn('Error refreshing progress:', e);
    }
  };

  // Initialize auth & check backend health
  useEffect(() => {
    async function init() {
      // 1. Check API Health
      const apiHealth = await checkApiHealth();
      if (apiHealth.connected) {
        setAuthStatus({
          connected: true,
          message: 'Agastya API server connected',
          isApi: true
        });
      } else {
        const sbStatus = getSupabaseStatus();
        setAuthStatus(sbStatus);
      }

      // 2. Check Backend JWT session
      const token = getAuthToken();
      if (token) {
        try {
          const me = await apiGetMe();
          if (me && me.id) {
            const u: User = { ...me, isBackend: true };
            setUser(u);
            await fetchStreak(u);
            return;
          }
        } catch {
          apiLogout();
        }
      }

      // 3. Check Supabase Auth
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const u: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || (session.user.email || '').split('@')[0],
              grade: session.user.user_metadata?.grade || 'School',
              isSupabase: true
            };
            setUser(u);
          }
        } catch (e) {
          console.warn('Supabase session check error:', e);
        }
      }

      // 4. Check Local user
      const localName = localStorage.getItem('agastya-user');
      if (localName && !user) {
        const localUsers = JSON.parse(localStorage.getItem('agastya-users') || '{}');
        const found = Object.values(localUsers).find((u: any) => u.name === localName) as any;
        if (found) {
          setUser({
            id: found.id || 'local-user',
            email: found.email,
            name: found.name,
            grade: found.grade || 'School'
          });
        }
      }
    }

    init().then(refreshProgress);
  }, []);

  const login = async (em: string, pw: string) => {
    // 1. Try backend API
    try {
      const res = await apiLogin(em, pw);
      if (res && res.user) {
        const u = { ...res.user, isBackend: true };
        setUser(u);
        localStorage.setItem('agastya-user', u.name);
        await refreshProgress();
        return { success: true };
      }
    } catch (err: any) {
      console.warn('Backend login attempt failed, trying Supabase / local:', err);
    }

    // 2. Try Supabase
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
        if (!error && data.user) {
          const u: User = {
            id: data.user.id,
            email: data.user.email || em,
            name: data.user.user_metadata?.full_name || em.split('@')[0],
            grade: data.user.user_metadata?.grade || 'School',
            isSupabase: true
          };
          setUser(u);
          localStorage.setItem('agastya-user', u.name);
          await refreshProgress();
          return { success: true };
        }
      } catch (e) {
        console.warn('Supabase login error:', e);
      }
    }

    // 3. Fallback to Local Auth
    const localUsers = JSON.parse(localStorage.getItem('agastya-users') || '{}');
    const existing = localUsers[em];
    if (existing) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
      const hash = Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, '0')).join('');
      if (existing.hash === hash) {
        const u: User = {
          id: existing.id || 'local-user',
          email: em,
          name: existing.name,
          grade: existing.grade || 'School'
        };
        setUser(u);
        localStorage.setItem('agastya-user', u.name);
        await refreshProgress();
        return { success: true };
      }
    }

    return { success: false, message: 'Incorrect email or password.' };
  };

  const register = async (em: string, pw: string, nm: string, gr: string) => {
    // 1. Try Backend API
    try {
      const res = await apiRegister(em, pw, nm, gr);
      if (res && res.user) {
        const u = { ...res.user, isBackend: true };
        setUser(u);
        localStorage.setItem('agastya-user', u.name);
        await syncActiveStreak(u);
        await refreshProgress();
        return { success: true };
      }
    } catch (err: any) {
      console.warn('Backend register failed, trying Supabase / local:', err);
    }

    // 2. Try Supabase
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: em,
          password: pw,
          options: {
            data: { full_name: nm, grade: gr }
          }
        });
        if (!error && data.user) {
          const u: User = {
            id: data.user.id,
            email: em,
            name: nm,
            grade: gr,
            isSupabase: true
          };
          setUser(u);
          localStorage.setItem('agastya-user', nm);
          await refreshProgress();
          return { success: true, needsConfirmation: !data.session };
        }
      } catch (e: any) {
        console.warn('Supabase signup error:', e);
      }
    }

    // 3. Fallback to Local Storage
    const localUsers = JSON.parse(localStorage.getItem('agastya-users') || '{}');
    if (localUsers[em]) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
    const hash = Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, '0')).join('');
    localUsers[em] = {
      id: 'local-' + Date.now(),
      email: em,
      name: nm,
      grade: gr,
      hash,
      created: Date.now()
    };
    localStorage.setItem('agastya-users', JSON.stringify(localUsers));

    const u: User = {
      id: localUsers[em].id,
      email: em,
      name: nm,
      grade: gr
    };
    setUser(u);
    localStorage.setItem('agastya-user', nm);
    await syncActiveStreak(u);
    await refreshProgress();
    return { success: true };
  };

  const logout = async () => {
    apiLogout();
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    localStorage.removeItem('agastya-user');
    setUser(null);
    await refreshProgress();
  };

  const clearHistory = async () => {
    await clearAllAttempts(user);
    await refreshProgress();
  };

  return (
    <AppContext.Provider
      value={{
        view,
        setView,
        go,
        studioTab,
        setStudioTab,
        goToStep,
        lang,
        setLang,
        t,
        user,
        authStatus,
        login,
        register,
        logout,
        streak,
        latestScore,
        refreshProgress,
        clearHistory,
        toastMsg,
        showToast,
        activeDoc,
        setActiveDoc,
        backendMaterialId,
        setBackendMaterialId,
        studyPlan,
        setStudyPlan,
        shortNotes,
        setShortNotes,
        isChatOpen,
        setIsChatOpen
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
