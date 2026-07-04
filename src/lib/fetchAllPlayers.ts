import { supabase } from "@/integrations/supabase/client";

export async function fetchAllPlayers<T = any>(select: string, order = "name"): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const rows: T[] = [];

  while (true) {
    const { data, error } = await (supabase as any)
      .from("players")
      .select(select)
      .order(order)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = ((data ?? []) as T[]);
    rows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}