import { supabase } from "@/integrations/supabase/client";

export async function replaceProgram(programId: string, csvContent: string, playerId: string) {
  const { data, error } = await supabase.functions.invoke("replace-program", {
    body: { programId, csvContent, playerId }
  });

  if (error) throw error;
  return data;
}
