import { supabase, isSupabaseConfigured, getSupabaseStatus } from '../lib/supabase.js';
import {
  apiLogin,
  apiRegister,
  apiGetMe,
  apiLogout,
  getAuthToken,
  checkApiHealth,
} from './api.js';

let currentUser = null;
const listeners = new Set();

const UK = 'agastya-users';
const CK = 'agastya-user';

function loadLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(UK) || '{}');
  } catch {
    return {};
  }
}

async function hashLocalPassword(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

export function subscribeAuth(callback) {
  listeners.add(callback);
  callback(currentUser, getSupabaseStatus());
  return () => listeners.delete(callback);
}

function notifyAuth() {
  const status = getSupabaseStatus();
  listeners.forEach((fn) => fn(currentUser, status));
}

export async function initAuth() {
  // 1. Check Backend API JWT session
  const token = getAuthToken();
  if (token) {
    try {
      const me = await apiGetMe();
      if (me && me.id) {
        currentUser = {
          id: me.id,
          email: me.email,
          name: me.name,
          grade: me.grade || 'School',
          isBackend: true,
        };
        try {
          localStorage.setItem(CK, me.name);
        } catch {}
        notifyAuth();
        return currentUser;
      }
    } catch (e) {
      console.warn('Backend session token expired or invalid:', e);
      apiLogout();
    }
  }

  // 2. Check Supabase Auth session if configured
  if (isSupabaseConfigured) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.user) {
        currentUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
          grade: session.user.user_metadata?.grade || 'School',
          isSupabase: true,
        };
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          currentUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
            grade: session.user.user_metadata?.grade || 'School',
            isSupabase: true,
          };
        } else if (!getAuthToken()) {
          currentUser = null;
        }
        notifyAuth();
      });
    } catch (e) {
      console.warn('Supabase auth session error, checking local:', e);
    }
  }

  // 3. Fallback to local session if no cloud/backend user
  if (!currentUser) {
    try {
      const localName = localStorage.getItem(CK);
      if (localName) {
        currentUser = {
          id: 'local-' + localName,
          email: localName + '@local.agastya',
          name: localName,
          grade: 'Self-learning',
          isSupabase: false,
        };
      }
    } catch {}
  }

  notifyAuth();
  return currentUser;
}

export async function signIn(email, password) {
  email = email.trim().toLowerCase();

  // 1. Try Agastya Backend API first
  try {
    const res = await apiLogin(email, password);
    if (res && res.user) {
      currentUser = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        grade: res.user.grade || 'School',
        isBackend: true,
      };
      try {
        localStorage.setItem(CK, currentUser.name);
      } catch {}
      notifyAuth();
      return { success: true, user: currentUser };
    }
  } catch (backendErr) {
    console.warn('Backend login notice, checking Supabase / local:', backendErr.message);
  }

  // 2. Try Supabase Auth if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      const user = data.user;
      currentUser = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        grade: user.user_metadata?.grade || 'School',
        isSupabase: true,
      };

      try {
        localStorage.setItem(CK, currentUser.name);
      } catch {}

      notifyAuth();
      return { success: true, user: currentUser };
    } catch (err) {
      return { success: false, message: err.message || 'Supabase authentication failed.' };
    }
  }

  // 3. Local offline fallback authentication
  const u = loadLocalUsers();
  const h = await hashLocalPassword(password);

  if (!u[email] || u[email].h !== h) {
    return { success: false, message: 'Email or password is incorrect.' };
  }

  const name = u[email].n || email.split('@')[0];
  currentUser = {
    id: 'local-' + email,
    email,
    name,
    grade: u[email].g || 'School',
    isSupabase: false,
  };

  try {
    localStorage.setItem(CK, name);
  } catch {}

  notifyAuth();
  return { success: true, user: currentUser };
}

export async function signUp(email, password, fullName, grade) {
  email = email.trim().toLowerCase();
  fullName = fullName ? fullName.trim() : email.split('@')[0];

  // 1. Try Agastya Backend API first
  try {
    const res = await apiRegister(email, password, fullName, grade || 'School');
    if (res && res.user) {
      currentUser = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        grade: res.user.grade || 'School',
        isBackend: true,
      };
      try {
        localStorage.setItem(CK, fullName);
      } catch {}
      notifyAuth();
      return { success: true, user: currentUser };
    }
  } catch (backendErr) {
    if (backendErr.status === 409) {
      return { success: false, message: 'An account with this email already exists. Please log in.' };
    }
    console.warn('Backend register notice, checking Supabase / local:', backendErr.message);
  }

  // 2. Try Supabase
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            grade: grade || 'School',
          },
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        currentUser = {
          id: data.user.id,
          email: data.user.email,
          name: fullName,
          grade: grade || 'School',
          isSupabase: true,
        };
        try {
          localStorage.setItem(CK, fullName);
        } catch {}

        notifyAuth();
        return {
          success: true,
          user: currentUser,
          needsConfirmation: data.session === null,
        };
      }
    } catch (err) {
      return { success: false, message: err.message || 'Supabase sign up failed.' };
    }
  }

  // 3. Local fallback registration
  const u = loadLocalUsers();
  if (u[email]) {
    return { success: false, message: 'An account with this email already exists. Try logging in.' };
  }

  const h = await hashLocalPassword(password);
  u[email] = { n: fullName, h, g: grade || 'School' };

  try {
    localStorage.setItem(UK, JSON.stringify(u));
    localStorage.setItem(CK, fullName);
  } catch {
    return { success: false, message: 'Could not save the account locally.' };
  }

  currentUser = {
    id: 'local-' + email,
    email,
    name: fullName,
    grade: grade || 'School',
    isSupabase: false,
  };

  notifyAuth();
  return { success: true, user: currentUser };
}

export async function signOut() {
  apiLogout();

  if (isSupabaseConfigured && currentUser?.isSupabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
  }

  currentUser = null;
  try {
    localStorage.removeItem(CK);
  } catch {}

  notifyAuth();
  return true;
}

export function getCurrentUser() {
  return currentUser;
}
