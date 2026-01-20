// Shared database client for cross-site content synchronization
import { createClient } from '@supabase/supabase-js';

const SHARED_SUPABASE_URL = 'https://qwethimbtaamlhbajmal.supabase.co';
const SHARED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3ZXRoaW1idGFhbWxoYmFqbWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODQzNDMsImV4cCI6MjA3NjM2MDM0M30.FNM354bgxhdtM4F_KGbQQnJwX7-WngaX58kPvPYnUEY';

// Import the shared supabase client like this:
// import { sharedSupabase } from "@/integrations/supabase/sharedClient";

export const sharedSupabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
