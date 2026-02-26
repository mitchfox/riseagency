import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke a Supabase edge function with proper error handling.
 * Extracts the actual error body from non-2xx responses instead of
 * returning a generic "Edge Function returned a non-2xx status code" message.
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options?: { body?: Record<string, any> }
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(functionName, options);

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const errorBody = await error.context.json();
        const message =
          errorBody?.error || errorBody?.message || JSON.stringify(errorBody);
        return { data: null, error: message };
      } catch {
        // If the response body isn't JSON, read as text
        try {
          const text = await error.context.text();
          return { data: null, error: text || error.message };
        } catch {
          return { data: null, error: error.message };
        }
      }
    }
    return { data: null, error: error.message };
  }

  return { data: data as T, error: null };
}
