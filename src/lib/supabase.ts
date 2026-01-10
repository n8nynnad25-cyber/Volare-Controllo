import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tjvtpmfmdgpwtyukwdzi.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdnRwbWZtZGdwd3R5dWt3ZHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NjkwMTgsImV4cCI6MjA4MzQ0NTAxOH0.xpEXX-_Go0FfMsyofiaSXNu1H3alf3LWPJ4g1I41iyc';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.error('CRITICAL: Supabase URL or Key is missing in environment variables. The app may not function correctly.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
