import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const responseHeaders = { ...corsHeaders, "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

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

// Resolve a private signature-contracts URL/path into a 24h signed URL
async function resolveContractUrl(supabase: any, raw: string | null): Promise<string | null> {
  if (!raw) return null;
  const marker = "/signature-contracts/";
  let path: string | null = null;
  if (raw.includes(marker)) {
    const idx = raw.indexOf(marker) + marker.length;
    let p = raw.slice(idx).split("?")[0];
    if (p.startsWith("sign/")) p = p.slice(5);
    if (p.startsWith("public/")) p = p.slice(7);
    path = decodeURIComponent(p);
  } else if (!raw.startsWith("http")) {
    path = raw;
  }
  if (!path) return raw; // already an external URL
  const { data, error } = await supabase.storage.from("signature-contracts").createSignedUrl(path, 60 * 60 * 24);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders });
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
        status: 401, headers: { ...responseHeaders, "Content-Type": "application/json" },
      });
    }
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const [activity, spending, pipeline, deals, notes, players, contracts, tasks, staffActivity, prospects, overviewSections, overviewCards, invoices, projections, scouting, outreachYouth, outreachPro, marketingSchedule, profiles, taskNotifications, clubContacts, playerAnalyses, analysisTags, timeCategories, timeItems, priorityCategories, priorityItems, businessPlan, capacityStaffRoles, forecast, forecastSettings, timeline, otherIncome] = await Promise.all([
      supabase.from("investor_activity_log").select("*").order("occurred_at", { ascending: false }).limit(500),
      supabase.from("investor_spending").select("*").order("spend_date", { ascending: false }).limit(2000),
      supabase.from("investor_pipeline").select("*").order("updated_at", { ascending: false }),
      supabase.from("investor_deals").select("*").order("updated_at", { ascending: false }),
      supabase.from("investor_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("players")
        .select("id, name, representation_status, position, nationality, date_of_birth, visible_on_stars_page, image_url, hover_image_url, club, club_logo, league, age, contract_start_date, contract_end_date, current_salary_annual, expected_commission_annual, potential_commission_annual, commission_notes, salary_cap_overrides")
        .in("representation_status", ["represented", "fuel_for_football", "mandated", "previously_mandated"])
        .order("name"),
      supabase.from("signature_contracts")
        .select("id, title, description, status, created_at, updated_at, owner_signed_at, locked_at, file_url, locked_file_url, completed_pdf_url")
        .order("updated_at", { ascending: false }).limit(200),
      supabase.from("staff_tasks")
        .select("id, title, description, category, priority, completed, deadline, created_at, updated_at, last_completed_at, assigned_to, image_url, display_order, is_recurring, recurrence_label, completion_log")
        .order("updated_at", { ascending: false }).limit(500),
      supabase.from("staff_activity_log")
        .select("id, user_email, action, entity_type, entity_id, entity_name, details, created_at")
        .order("created_at", { ascending: false }).limit(800),
      supabase.from("prospects")
        .select("id, name, stage, position, nationality, date_of_birth, age, age_group, current_club, profile_image_url, probability_weight, projected_revenue, revenue_currency, priority, notes, last_contact_date, updated_at, linked_player_id")
        .order("updated_at", { ascending: false }).limit(500),
      supabase.from("investor_overview_sections").select("*").order("display_order", { ascending: true }),
      supabase.from("investor_overview_cards").select("*").order("display_order", { ascending: true }),
      supabase.from("invoices")
        .select("id, player_id, invoice_number, invoice_date, due_date, amount, currency, status, amount_paid, billing_month, description")
        .order("invoice_date", { ascending: false }).limit(2000),
      supabase.from("investor_projections").select("*").order("display_order", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("scouting_reports").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("player_outreach_youth").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("player_outreach_pro").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("marketing_schedule_items")
        .select("id, post_type, day_of_week, scheduled_time, owner_id, status, platform_format, image_url, updated_at, last_completed_at, completion_log")
        .limit(500),
      supabase.from("profiles").select("id, email, full_name").limit(200),
      supabase.from("staff_notification_events")
        .select("id, event_type, title, body, event_data, created_at")
        .in("event_type", ["task_completed", "task_assigned", "task_reminder", "schedule_item_completed", "contract_signed", "contract_event", "player_created", "player_updated"])
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false }).limit(400),
      supabase.from("club_network_contacts")
        .select("id, name, club_name, position, country, city, image_url, is_favourite, contact_strength, tags, last_contacted_at, updated_at")
        .order("contact_strength", { ascending: false }).limit(500),
      supabase.from("player_analysis")
        .select("id, player_id, fixture_id, analysis_writer_id, analysis_date, opponent, result, r90_score, minutes_played, pdf_url, video_url, visibility_status, category, club_logo_url, opposition_color, updated_at")
        .in("visibility_status", ["live", "clipped"])
        .gte("analysis_date", ninetyDaysAgo.slice(0, 10))
        .order("analysis_date", { ascending: false }).limit(120),
      supabase.from("analysis_player_tags")
        .select("player_id, created_at, analyses(id, title, analysis_type, match_date, home_team, away_team, home_score, away_score, category, fixture_id, home_team_bg_color, away_team_bg_color)")
        .gte("created_at", ninetyDaysAgo)
        .order("created_at", { ascending: false }).limit(300),
      supabase.from("investor_time_categories").select("*").order("display_order", { ascending: true }),
      supabase.from("investor_time_items").select("*").order("display_order", { ascending: true }),
      supabase.from("investor_priority_categories").select("*").order("display_order", { ascending: true }),
      supabase.from("investor_priority_items").select("*").order("display_order", { ascending: true }),
      supabase.from("business_plan").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle(),
      supabase.from("user_roles").select("user_id, role").in("role", ["admin", "marketeer"]),
      supabase.from("investor_forecast").select("*").order("month", { ascending: true }),
      supabase.from("investor_forecast_settings").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle(),
      supabase.from("investor_timeline").select("*").order("start_date", { ascending: true }),
      supabase.from("investor_other_income").select("*").order("income_date", { ascending: false }).limit(2000),
    ]);

    const { data: updatesData } = await supabase
      .from("investor_updates")
      .select("*")
      .order("achieved_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    // Dedupe staff activity to one row per (entity_type, entity_id|entity_name) — latest only
    const seen = new Set<string>();
    const dedupActivity = (staffActivity.data || []).filter((e: any) => {
      const key = `${e.entity_type}::${e.entity_id || e.entity_name || e.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 200);

    // Sign contract URLs server-side so the iframe can actually load private PDFs
    // Prefer the latest counterparty-signed PDF (with signatures embedded) so signed contracts always
    // show the signatures when viewed in the investor portal.
    const contractIds = (contracts.data || []).map((c: any) => c.id);
    const latestSignedByContract: Record<string, string | null> = {};
    if (contractIds.length > 0) {
      const { data: subs } = await supabase
        .from("signature_submissions")
        .select("contract_id, signed_pdf_url, signed_at")
        .in("contract_id", contractIds)
        .not("signed_pdf_url", "is", null)
        .order("signed_at", { ascending: false });
      for (const s of (subs || []) as any[]) {
        if (!latestSignedByContract[s.contract_id]) {
          latestSignedByContract[s.contract_id] = s.signed_pdf_url;
        }
      }
    }
    const contractsResolved = await Promise.all((contracts.data || []).map(async (c: any) => {
      const signed = latestSignedByContract[c.id] || null;
      const source = signed || c.completed_pdf_url || c.locked_file_url || c.file_url;
      return {
        ...c,
        has_signed_pdf: !!signed,
        resolved_file_url: await resolveContractUrl(supabase, source),
      };
    }));

    const linkedAnalysisIds = [...new Set((playerAnalyses.data || []).map((row: any) => row.analysis_writer_id).filter(Boolean))];
    const linkedAnalyses = linkedAnalysisIds.length > 0
      ? await supabase
          .from("analyses")
          .select("id, title, analysis_type, match_date, home_team, away_team, home_score, away_score, category, fixture_id, home_team_bg_color, away_team_bg_color")
          .in("id", linkedAnalysisIds)
      : { data: [] };
    const linkedMatchAnalyses = (linkedAnalyses.data || [])
      .filter((a: any) => a.category !== "training" && (a.analysis_type === "pre-match" || a.analysis_type === "post-match"))
      .map((analysis: any) => {
        const report = (playerAnalyses.data || []).find((row: any) => row.analysis_writer_id === analysis.id);
        return { player_id: report?.player_id, created_at: report?.updated_at || analysis.match_date, analyses: analysis };
      })
      .filter((row: any) => row.player_id);

    const taggedMatchAnalyses = (analysisTags.data || []).filter((row: any) => {
      const a = row.analyses;
      return a && a.category !== "training" && (a.analysis_type === "pre-match" || a.analysis_type === "post-match");
    });

    // Build staff member list (admins + marketeers) for capacity assignments
    const staffRoleMap = new Map<string, Set<string>>();
    (capacityStaffRoles.data || []).forEach((r: any) => {
      const set = staffRoleMap.get(r.user_id) || new Set<string>();
      set.add(r.role);
      staffRoleMap.set(r.user_id, set);
    });
    const staffMembers = (profiles.data || [])
      .filter((p: any) => staffRoleMap.has(p.id))
      .map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        roles: Array.from(staffRoleMap.get(p.id) || []),
      }))
      .sort((a: any, b: any) => (a.full_name || a.email || "").localeCompare(b.full_name || b.email || ""));

    return new Response(JSON.stringify({
      user: { ...user, is_admin: (user as any).is_admin === true },
      activity: activity.data || [],
      spending: spending.data || [],
      pipeline: pipeline.data || [],
      deals: deals.data || [],
      notes: notes.data || [],
      players: players.data || [],
      contracts: contractsResolved,
      tasks: tasks.data || [],
      staffActivity: dedupActivity,
      prospects: prospects.data || [],
      overviewSections: overviewSections.data || [],
      overviewCards: overviewCards.data || [],
      invoices: invoices.data || [],
      projections: projections.data || [],
      scoutingReports: scouting.data || [],
      outreachYouth: outreachYouth.data || [],
      outreachPro: outreachPro.data || [],
      marketingSchedule: marketingSchedule.data || [],
      profiles: profiles.data || [],
      taskNotifications: taskNotifications.data || [],
      clubContacts: clubContacts.data || [],
      playerAnalyses: playerAnalyses.data || [],
      matchAnalyses: [...linkedMatchAnalyses, ...taggedMatchAnalyses],
      timeCategories: timeCategories.data || [],
      timeItems: timeItems.data || [],
      priorityCategories: priorityCategories.data || [],
      priorityItems: priorityItems.data || [],
      businessPlan: businessPlan.data || null,
      staffMembers,
      forecast: forecast.data || [],
      forecastSettings: forecastSettings.data || null,
      timeline: timeline.data || [],
      updates: updatesData || [],
      otherIncome: otherIncome.data || [],
    }), { headers: { ...responseHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" },
    });
  }
});