import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are valid (and not just default placeholders)
const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol.startsWith('http') && !url.includes('placeholder.supabase.co') && !url.includes('your-project');
  } catch {
    return false;
  }
};

const isValidKey = (key) => {
  return typeof key === 'string' && key.trim().length > 20 && !key.includes('placeholder') && !key.includes('your-supabase');
};

export const isSupabaseConfigured = isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseStatus() {
  if (isSupabaseConfigured) {
    return {
      connected: true,
      type: 'cloud',
      message: 'Connected to Supabase Cloud',
      url: supabaseUrl,
    };
  }
  return {
    connected: false,
    type: 'local',
    message: 'Local Offline Mode (Add Supabase keys in .env for cloud sync)',
    url: null,
  };
}
