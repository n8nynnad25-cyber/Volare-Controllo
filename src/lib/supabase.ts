import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tjvtpmfmdgpwtyukwdzi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdnRwbWZtZGdwd3R5dWt3ZHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NjkwMTgsImV4cCI6MjA4MzQ0NTAxOH0.xpEXX-_Go0FfMsyofiaSXNu1H3alf3LWPJ4g1I41iyc';

export const supabase = createClient(supabaseUrl, supabaseKey);
