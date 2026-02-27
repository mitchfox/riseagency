// Shared database client for cross-site content synchronization
// Re-exports the main client to avoid duplicate GoTrueClient instances
// which cause session conflicts and random logouts on mobile
import { supabase } from './client';

export const sharedSupabase = supabase;
