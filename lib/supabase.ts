import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggzuaaivrrcuowwemobt.supabase.co';
const supabaseAnonKey = 'sb_publishable_cWi8BYGeUsGud-0hWlep1A_4v7L0wtu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // ✅ ده بيخلي الجلسة متتمسحش لما تقفل الصفحة
    autoRefreshToken: true,
  }
});