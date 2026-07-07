import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// تم وضع الروابط بين علامات تنصيص ' ' وإضافة الفصلة المنقوطة ;
const supabaseUrl = 'https://ggzuaaivrrcuowwemobt.supabase.co';
const supabaseAnonKey = 'sb_publishable_cWi8BYGeUsGud-0hWlep1A_4v7L0wtu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});