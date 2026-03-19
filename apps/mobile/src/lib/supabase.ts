import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ⚠️ REEMPLAZA ESTO CON TUS DATOS REALES DE SUPABASE
const supabaseUrl = 'https://jfqutuptbrgtwbofpawp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcXV0dXB0YnJndHdib2ZwYXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTU1MjksImV4cCI6MjA3OTE3MTUyOX0.EXQ89oqcIzwaNm3jQifb3fbYyRPsmr5udy0BFJLinUs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
