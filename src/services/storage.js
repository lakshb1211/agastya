import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { apiGetStreak, apiPingStreak } from './api.js';

const SK = 'agastya-streak';
const AK = 'agastya-attempts';
const MK = 'agastya-materials';

// Helper for local storage
function ls(k, d) {
  try {
    const v = localStorage.getItem(k);
    if (v) return JSON.parse(v);
  } catch (e) {
    console.error('LocalStorage read error:', e);
  }
  return d;
}

function sv(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

// ---------------- STREAKS ----------------
export function ymd(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function dd(a) {
  const p = a.split('-');
  const t = new Date();
  return Math.round(
    (new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(+p[0], p[1] - 1, +p[2])) / 864e5
  );
}

export async function fetchStreak(user = null) {
  if (user && user.isBackend) {
    try {
      const res = await apiGetStreak();
      const streakObj = { n: res.streak_count, last: res.last_active_date };
      sv(SK, streakObj);
      return streakObj;
    } catch (e) {
      console.warn('Backend fetchStreak error, falling back to local:', e);
    }
  }

  if (isSupabaseConfigured && user) {
    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('streak_count, last_active_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        const streakObj = { n: data.streak_count, last: data.last_active_date };
        sv(SK, streakObj);
        return streakObj;
      }
    } catch (e) {
      console.warn('Supabase fetchStreak error, falling back to local:', e);
    }
  }

  const s = ls(SK, { n: 0, last: null });
  if (s.last && dd(s.last) > 1 && s.n) {
    s.n = 0;
    sv(SK, s);
  }
  return s;
}

export async function syncActiveStreak(user = null) {
  if (user && user.isBackend) {
    try {
      const res = await apiPingStreak();
      const streakObj = { n: res.streak_count, last: res.last_active_date };
      sv(SK, streakObj);
      return streakObj;
    } catch (e) {
      console.warn('Backend streak ping error, using local streak:', e);
    }
  }

  const s = ls(SK, { n: 0, last: null });
  const d = s.last ? dd(s.last) : null;

  if (d === 0) return s;

  s.n = d === 1 ? s.n + 1 : 1;
  s.last = ymd(new Date());
  sv(SK, s);

  if (isSupabaseConfigured && user) {
    try {
      await supabase.from('user_streaks').upsert({
        user_id: user.id,
        streak_count: s.n,
        last_active_date: s.last,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Supabase syncActiveStreak error:', e);
    }
  }

  return s;
}

// ---------------- QUIZ ATTEMPTS ----------------
export async function fetchAttempts(user = null) {
  if (isSupabaseConfigured && user) {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        // Map database columns to app internal format
        const mapped = data.map((x) => ({
          d: new Date(x.created_at).getTime(),
          k: x.quiz_type,
          s: x.score,
          t: x.total,
          tp: x.topic_breakdown || {},
          id: x.id,
        }));
        sv(AK, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Supabase fetchAttempts error, using local:', e);
    }
  }

  return ls(AK, []);
}

export async function recordAttempt(attempt, user = null) {
  const localList = ls(AK, []);
  localList.push(attempt);
  sv(AK, localList);

  if (isSupabaseConfigured && user) {
    try {
      const weak = Object.keys(attempt.tp || {}).filter(
        (k) => attempt.tp[k][0] / attempt.tp[k][1] < 0.7
      );

      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_type: attempt.k || 'd',
        score: attempt.s,
        total: attempt.t,
        percentage: Math.round((attempt.s / attempt.t) * 100),
        weak_topics: weak,
        topic_breakdown: attempt.tp,
        created_at: new Date(attempt.d || Date.now()).toISOString(),
      });
    } catch (e) {
      console.warn('Supabase recordAttempt error:', e);
    }
  }

  return localList;
}

export async function clearAllAttempts(user = null) {
  sv(AK, []);

  if (isSupabaseConfigured && user) {
    try {
      await supabase.from('quiz_attempts').delete().eq('user_id', user.id);
    } catch (e) {
      console.warn('Supabase clearAllAttempts error:', e);
    }
  }
}

// ---------------- STUDY MATERIALS ----------------
export async function recordStudyMaterial(material, user = null) {
  const localMats = ls(MK, []);
  localMats.push({
    title: material.title || 'Pasted Material',
    topics: material.topics,
    sentences: material.N,
    date: Date.now(),
  });
  sv(MK, localMats.slice(-20));

  if (isSupabaseConfigured && user) {
    try {
      await supabase.from('study_materials').insert({
        user_id: user.id,
        title: material.title || 'Study Material',
        content: material.textSample || 'Uploaded notes',
        key_topics: material.topics || [],
        sentence_count: material.N || 0,
      });
    } catch (e) {
      console.warn('Supabase recordStudyMaterial error:', e);
    }
  }
}

// ---------------- CHAT MESSAGES / DOUBTS ----------------
export async function recordChatMessage(question, answer, language = 'en', user = null) {
  if (isSupabaseConfigured && user) {
    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        question,
        answer,
        language,
      });
    } catch (e) {
      console.warn('Supabase recordChatMessage error:', e);
    }
  }
}

export { ls, sv, SK, AK };
