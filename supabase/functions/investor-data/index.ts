import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getSessionUser(supabase: any, token: string) {
  if (!token) return null;
  const { data } = await supabase
    .from("investor_sessions")
    .select("user_id, expires_at, investor_users(id, username, display_name, status, is_admin)")
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
    const [activity, spending, pipeline, deals, notes, players, contracts, tasks, staffActivity, prospects, overviewSections, overviewCards] = await Promise.all([
      supabase.from("investor_activity_log").select("*").order("occurred_at", { ascending: false }).limit(500),
      supabase.from("investor_spending").select("*").order("spend_date", { ascending: false }).limit(2000),
      supabase.from("investor_pipeline").select("*").order("updated_at", { ascending: false }),
      supabase.from("investor_deals").select("*").order("updated_at", { ascending: false }),
      supabase.from("investor_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("players")
        .select("id, name, representation_status, position, nationality, date_of_birth, visible_on_stars_page, image_url, hover_image_url, club, club_logo, league, age, contract_start_date, contract_end_date, current_salary_annual, expected_commission_annual, commission_notes")
        .in("representation_status", ["represented", "mandated", "previously_mandated"])
        .order("name"),
      supabase.from("signature_contracts")
        .select("id, title, description, status, created_at, updated_at, owner_signed_at, locked_at, file_url, locked_file_url, completed_pdf_url")
        .order("updated_at", { ascending: false }).limit(200),
      supabase.from("staff_tasks")
        .select("id, title, description, category, priority, completed, deadline, created_at, updated_at, last_completed_at, assigned_to, image_url, display_order, is_recurring, recurrence_label")
        .order("updated_at", { ascending: false }).limit(500),
      supabase.from("staff_activity_log")
        .select("id, user_email, action, entity_type, entity_id, entity_name, details, created_at")
        .order("created_at", { ascending: false }).limit(800),
      supabase.from("prospects")
        .select("id, name, stage, position, nationality, date_of_birth, age, current_club, profile_image_url, probability_weight, projected_revenue, revenue_currency, notes, last_contact_date, updated_at")
        .order("updated_at", { ascending: false }).limit(500),
      supabase.from("investor_overview_sections").select("*").order("display_order", { ascending: true }),
      supabase.from("investor_overview_cards").select("*").order("display_order", { ascending: true }),
    ]);

    // Dedupe staff activity to one row per (entity_type, entity_id|entity_name) — latest only
    const seen = new Set<string>();
    const dedupActivity = (staffActivity.data || []).filter((e: any) => {
      const key = `${e.entity_type}::${e.entity_id || e.entity_name || e.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 200);

    return new Response(JSON.stringify({
      user: { ...user, is_admin: (user as any).is_admin === true },
      activity: activity.data || [],
      spending: spending.data || [],
      pipeline: pipeline.data || [],
      deals: deals.data || [],
      notes: notes.data || [],
      players: players.data || [],
      contracts: contracts.data || [],
      tasks: tasks.data || [],
      staffActivity: dedupActivity,
      prospects: prospects.data || [],
      overviewSections: overviewSections.data || [],
      overviewCards: overviewCards.data || [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});