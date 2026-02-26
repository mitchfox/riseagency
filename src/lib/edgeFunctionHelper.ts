import { FunctionsHttpError, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an edge function with proper error handling.
 * Extracts the actual error body from non-2xx responses instead of
 * returning a generic "Edge Function returned a non-2xx status code" message.
 *
 * Drop-in replacement for supabase.functions.invoke — returns same { data, error } shape
 * but `error` is enriched with the real server message.
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options?: { body?: Record<string, any> },
  client?: SupabaseClient
): Promise<{ data: T | null; error: Error | null }> {
  const sb = client || supabase;
  const { data, error } = await sb.functions.invoke(functionName, options);

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const errorBody = await error.context.json();
        const message =
          errorBody?.error || errorBody?.message || JSON.stringify(errorBody);
        const enriched = new Error(message);
        (enriched as any).details = errorBody;
        return { data: null, error: enriched };
      } catch {
        try {
          const text = await error.context.text();
          return { data: null, error: new Error(text || error.message) };
        } catch {
          return { data: null, error };
        }
      }
    }
    return { data: null, error };
  }

  return { data: data as T, error: null };
}
