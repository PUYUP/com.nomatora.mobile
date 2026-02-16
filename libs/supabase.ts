import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    '';
const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_API_KEY ??
    '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars are missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
