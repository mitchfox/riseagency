import { supabase } from "@/integrations/supabase/client";

export type ClubContactRow = {
  source: "new" | "legacy";
  outreach_id: string;
  player_id: string;
  player_name: string;
  club_id: string | null;
  club_name: string;
  contact_name: string | null;
  contact_role: string | null;
  status: string;
  created_at: string;
  last_contacted_at: string | null;
  last_summary: string | null;
  last_next_step: string | null;
  communications_count: number;
};

export type CommunicationEntry = {
  id: string;
  outreach_id: string;
  source: "new" | "legacy";
  contacted_at: string;
  contact_name: string | null;
  contact_role: string | null;
  channel: string | null;
  summary: string | null;
  next_step: string | null;
};

/**
 * Fetch all club-contact rows across both the new outreach system
 * (club_outreach_links + link_players + communications) and the
 * legacy club_outreach table. Optionally scope to a single player.
 */
export const fetchClubContactRows = async (
  playerId?: string | null,
): Promise<ClubContactRow[]> => {
  // ---------- Player names ----------
  const playerIdsScope = playerId ? [playerId] : null;
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, name");
  const playerNameById: Record<string, string> = {};
  (allPlayers || []).forEach((p: any) => {
    playerNameById[p.id] = p.name;
  });

  // ---------- New-style ----------
  let linkPlayerRows: { link_id: string; player_id: string }[] = [];
  if (playerIdsScope) {
    const { data } = await supabase
      .from("club_outreach_link_players" as any)
      .select("link_id, player_id")
      .in("player_id", playerIdsScope);
    linkPlayerRows = (data || []) as any;
  } else {
    const { data } = await supabase
      .from("club_outreach_link_players" as any)
      .select("link_id, player_id");
    linkPlayerRows = (data || []) as any;
  }
  const linkIds = Array.from(new Set(linkPlayerRows.map((r) => r.link_id).filter(Boolean)));

  const newRows: ClubContactRow[] = [];
  if (linkIds.length > 0) {
    const { data: links } = await supabase
      .from("club_outreach_links" as any)
      .select("id, club_id, status, club_contact_name, club_contact_role, created_at, archived_at")
      .in("id", linkIds)
      .is("archived_at", null);

    const clubIds = Array.from(new Set((links || []).map((l: any) => l.club_id).filter(Boolean)));
    const clubNameById: Record<string, string> = {};
    if (clubIds.length > 0) {
      const { data: clubs } = await supabase
        .from("club_map_positions")
        .select("id, club_name")
        .in("id", clubIds);
      (clubs || []).forEach((c: any) => {
        clubNameById[c.id] = c.club_name;
      });
    }

    const { data: comms } = await supabase
      .from("club_outreach_communications" as any)
      .select("outreach_id, summary, next_step, contacted_at, created_at")
      .in("outreach_id", linkIds)
      .order("contacted_at", { ascending: false });

    const latestByLink: Record<string, { summary: string | null; next_step: string | null; date: string }> = {};
    const countByLink: Record<string, number> = {};
    (comms || []).forEach((c: any) => {
      countByLink[c.outreach_id] = (countByLink[c.outreach_id] || 0) + 1;
      if (!latestByLink[c.outreach_id]) {
        latestByLink[c.outreach_id] = {
          summary: c.summary || null,
          next_step: c.next_step || null,
          date: c.contacted_at || c.created_at,
        };
      }
    });

    (links || []).forEach((l: any) => {
      const playersForLink = linkPlayerRows.filter((lp) => lp.link_id === l.id);
      playersForLink.forEach((lp) => {
        const latest = latestByLink[l.id];
        newRows.push({
          source: "new",
          outreach_id: l.id,
          player_id: lp.player_id,
          player_name: playerNameById[lp.player_id] || "Unknown",
          club_id: l.club_id || null,
          club_name: clubNameById[l.club_id] || "Club",
          contact_name: l.club_contact_name || null,
          contact_role: l.club_contact_role || null,
          status: l.status || "contacted",
          created_at: l.created_at,
          last_contacted_at: latest?.date || null,
          last_summary: latest?.summary || null,
          last_next_step: latest?.next_step || null,
          communications_count: countByLink[l.id] || 0,
        });
      });
    });
  }

  // ---------- Legacy ----------
  let legacyQuery = supabase.from("club_outreach").select("*");
  if (playerIdsScope) legacyQuery = legacyQuery.in("player_id", playerIdsScope);
  const { data: legacy } = await legacyQuery;

  const legacyRows: ClubContactRow[] = (legacy || []).map((r: any) => ({
    source: "legacy",
    outreach_id: r.id,
    player_id: r.player_id,
    player_name: playerNameById[r.player_id] || "Unknown",
    club_id: null,
    club_name: r.club_name || "Club",
    contact_name: r.contact_name || null,
    contact_role: r.contact_role || null,
    status: r.status || "contacted",
    created_at: r.created_at,
    last_contacted_at: r.latest_update_date || null,
    last_summary: r.latest_update || null,
    last_next_step: null,
    communications_count: r.latest_update ? 1 : 0,
  }));

  const all = [...newRows, ...legacyRows];
  all.sort((a, b) => {
    const ad = new Date(a.last_contacted_at || a.created_at).getTime();
    const bd = new Date(b.last_contacted_at || b.created_at).getTime();
    return bd - ad;
  });
  return all;
};

/**
 * Fetch every communication entry for a contact row (new or legacy).
 */
export const fetchCommunicationsFor = async (
  outreachId: string,
  source: "new" | "legacy",
): Promise<CommunicationEntry[]> => {
  if (source === "new") {
    const { data } = await supabase
      .from("club_outreach_communications" as any)
      .select("id, outreach_id, contacted_at, contact_name, contact_role, channel, summary, next_step, created_at")
      .eq("outreach_id", outreachId)
      .order("contacted_at", { ascending: false });
    return (data || []).map((c: any) => ({
      id: c.id,
      outreach_id: c.outreach_id,
      source: "new",
      contacted_at: c.contacted_at || c.created_at,
      contact_name: c.contact_name,
      contact_role: c.contact_role,
      channel: c.channel,
      summary: c.summary,
      next_step: c.next_step,
    }));
  }
  const { data } = await supabase
    .from("club_outreach_updates")
    .select("id, outreach_id, update_text, created_at")
    .eq("outreach_id", outreachId)
    .order("created_at", { ascending: false });
  return (data || []).map((u: any) => ({
    id: u.id,
    outreach_id: u.outreach_id,
    source: "legacy",
    contacted_at: u.created_at,
    contact_name: null,
    contact_role: null,
    channel: null,
    summary: u.update_text,
    next_step: null,
  }));
};

/**
 * Append an update to an outreach row, writing to the appropriate table.
 */
export const addCommunication = async (
  row: Pick<ClubContactRow, "outreach_id" | "source">,
  payload: { summary: string; next_step?: string | null; contact_name?: string | null; contact_role?: string | null; channel?: string | null },
) => {
  if (row.source === "new") {
    const { error } = await supabase
      .from("club_outreach_communications" as any)
      .insert({
        outreach_id: row.outreach_id,
        contacted_at: new Date().toISOString(),
        contact_name: payload.contact_name || null,
        contact_role: payload.contact_role || null,
        channel: payload.channel || null,
        summary: payload.summary,
        next_step: payload.next_step || null,
      });
    if (error) throw error;
    return;
  }
  const { error: insertErr } = await supabase
    .from("club_outreach_updates")
    .insert({ outreach_id: row.outreach_id, update_text: payload.summary });
  if (insertErr) throw insertErr;
  await supabase
    .from("club_outreach")
    .update({ latest_update: payload.summary, latest_update_date: new Date().toISOString() })
    .eq("id", row.outreach_id);
};

/**
 * Group rows by player_id with summary counts.
 */
export const groupRowsByPlayer = (rows: ClubContactRow[]) => {
  const byPlayer = new Map<string, { count: number; last: ClubContactRow | null; rows: ClubContactRow[] }>();
  rows.forEach((r) => {
    const existing = byPlayer.get(r.player_id) || { count: 0, last: null, rows: [] };
    existing.count += 1;
    existing.rows.push(r);
    const existingDate = existing.last ? new Date(existing.last.last_contacted_at || existing.last.created_at).getTime() : 0;
    const rDate = new Date(r.last_contacted_at || r.created_at).getTime();
    if (!existing.last || rDate > existingDate) existing.last = r;
    byPlayer.set(r.player_id, existing);
  });
  return byPlayer;
};