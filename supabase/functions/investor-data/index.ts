import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getSessionUser(supabase: any, token: string) {
  if (!token) return null;
  const { data } = await supabase
    .from("investor_sessions")
    .select("user_id, expires_at, investor_users(id, username, display_name, status)")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  const u = (data as any).investor_users;
  if (!u || u.status !== "active") return null;
  return u;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || req.headers.get("x-investor-token") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const user = await getSessionUser(supabase, token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const [activity, spending, pipeline, deals, notes, players, contracts, tasks] = await Promise.all([
      supabase.from("investor_activity_log").select("*").order("occurred_at", { ascending: false }).limit(500),
      supabase.from("investor_spending").select("*").order("spend_date", { ascending: false }).limit(2000),
      supabase.from("investor_pipeline").select("*").order("updated_at", { ascending: false }),
      supabase.from("investor_deals").select("*").order("updated_at", { ascending: false }),
      supabase.from("investor_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("players")
        .select("id, name, representation_status, position, nationality, date_of_birth, visible_on_stars_page")
        .in("representation_status", ["represented", "mandated", "previously_mandated"])
        .order("name"),
      supabase.from("signature_contracts")
        .select("id, title, status, created_at, updated_at, owner_signed_at, locked_at")
        .order("updated_at", { ascending: false }).limit(200),
      supabase.from("staff_tasks")
        .select("id, title, category, priority, completed, deadline, created_at, last_completed_at")
        .order("updated_at", { ascending: false }).limit(500),
    ]);
    return new Response(JSON.stringify({
      user,
      activity: activity.data || [],
      spending: spending.data || [],
      pipeline: pipeline.data || [],
      deals: deals.data || [],
      notes: notes.data || [],
      players: players.data || [],
      contracts: contracts.data || [],
      tasks: tasks.data || [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});