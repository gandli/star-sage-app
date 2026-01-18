import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // We'll handle missing keys gracefully in the UI if needed, 
    // but for now, we'll log a warning.
    console.warn('Supabase keys are missing. Authentication features will not work.');
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
