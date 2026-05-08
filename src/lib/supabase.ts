import { createClient } from '@supabase/supabase-js';

// Helper to get env variables from both Vite and Node environments
const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

const rawUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
// Remove trailing slash to prevent "INVALID PATH" errors
const supabaseUrl = rawUrl ? rawUrl.replace(/\/$/, '') : 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
