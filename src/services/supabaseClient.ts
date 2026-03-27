import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Faltan variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en .env');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
