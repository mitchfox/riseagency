import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const shortId = url.searchParams.get("short_id");
    if (!shortId) {
      return new Response(JSON.stringify({ error: "short_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: link, error: linkErr } = await supabase
      .from("club_outreach_links")
      .select(
        "id, short_id, player_id, club_id, fit_recommendation, club_contact_name, club_contact_role, club_contact_phone, club_contact_accent, prepared_for_name, show_form, show_in_numbers, show_season_stats, show_strengths, created_at, archived_at, target_type, agent_name, agent_logo_url, language, translations, is_mandated, key_details, section_order, mandated_agent_name, mandated_agent_role, mandated_agent_phone, mandated_agent_logo_url, mandate_proof_path, mandate_proof_url"
      )
      .eq("short_id", shortId)
      .maybeSingle();

    if (linkErr) throw linkErr;
    if (!link || link.archived_at) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let club: any = null;
    if (link.club_id) {
      const { data: clubRow } = await supabase
        .from("club_map_positions")
        .select("id, club_name, country, image_url")
        .eq("id", link.club_id)
        .maybeSingle();
      club = clubRow ?? null;
    }
    // For agent outreach, synthesise a club-shaped object from agent fields so
    // the proposal renders the agent's name and optional logo in the header.
    if (!club && link.target_type === "agent" && link.agent_name) {
      club = {
        id: null,
        club_name: link.agent_name,
        country: null,
        image_url: link.agent_logo_url ?? null,
      };
    }

    // Resolve a signed URL for the optional Proof of Mandate document.
    if (link.is_mandated && link.mandate_proof_path) {
      try {
        const raw = link.mandate_proof_path as string;
        if (/^https?:\/\//i.test(raw)) {
          (link as any).mandate_proof_url = raw;
        } else {
          const { data: signed } = await supabase.storage
            .from("proof-of-representation")
            .createSignedUrl(raw, 60 * 60 * 24 * 7, { download: false });
          (link as any).mandate_proof_url = signed?.signedUrl ?? null;
        }
      } catch (_) {
        (link as any).mandate_proof_url = null;
      }
    }

    const { data: settings } = await supabase
      .from("club_outreach_settings")
      .select("whatsapp_number, agent_name, agent_image_url")
      .eq("id", 1)
      .maybeSingle();

    // Resolve the club-level contact. Historically this was keyed by the
    // target (recipient) club, but the saved Key Club Contact represents the
    // person at the PLAYER'S current club you would negotiate with. So we now
    // look up the contact via the attached player's current club, and fall
    // back to the target club for backwards compatibility.
    const { data: linkPlayersEarly } = await supabase
      .from("club_outreach_link_players")
      .select("player_id, sort_order")
      .eq("link_id", link.id)
      .order("sort_order", { ascending: true });
    const primaryPlayerId: string | null =
      linkPlayersEarly?.[0]?.player_id ?? link.player_id ?? null;

    let playerCurrentClubId: string | null = null;
    if (primaryPlayerId) {
      const { data: pRow } = await supabase
        .from("players")
        .select("club")
        .eq("id", primaryPlayerId)
        .maybeSingle();
      const clubName = (pRow?.club ?? "").toString().trim();
      if (clubName) {
        const { data: clubMatch } = await supabase
          .from("club_map_positions")
          .select("id")
          .ilike("club_name", clubName)
          .limit(1)
          .maybeSingle();
        playerCurrentClubId = clubMatch?.id ?? null;
      }
    }

    let clubContact: any = null;
    if (playerCurrentClubId) {
      const { data } = await supabase
        .from("club_outreach_club_contacts")
        .select("contact_name, contact_role, contact_phone, contact_accent, contact_image_url, contact_club_id, transfermarkt_url")
        .eq("club_id", playerCurrentClubId)
        .maybeSingle();
      clubContact = data ?? null;
    }
    if (!clubContact) {
      const { data } = await supabase
        .from("club_outreach_club_contacts")
        .select("contact_name, contact_role, contact_phone, contact_accent, contact_image_url, contact_club_id, transfermarkt_url")
        .eq("club_id", link.club_id)
        .maybeSingle();
      clubContact = data ?? null;
    }

    let matchedContact: any = null;
    if (!clubContact?.contact_image_url && (link.club_contact_phone || link.club_contact_name)) {
      if (link.club_contact_phone) {
        const { data } = await supabase
          .from("club_outreach_club_contacts")
          .select("contact_name, contact_role, contact_phone, contact_accent, contact_image_url, contact_club_id, transfermarkt_url")
          .eq("contact_phone", link.club_contact_phone)
          .not("contact_image_url", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        matchedContact = data ?? null;
      }
      if (!matchedContact && link.club_contact_name) {
        const { data } = await supabase
          .from("club_outreach_club_contacts")
          .select("contact_name, contact_role, contact_phone, contact_accent, contact_image_url, contact_club_id, transfermarkt_url")
          .ilike("contact_name", link.club_contact_name)
          .not("contact_image_url", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        matchedContact = data ?? null;
      }
    }

    const resolvedClubContact = clubContact || matchedContact || link.club_contact_name || link.club_contact_phone
      ? {
          contact_name: clubContact?.contact_name ?? link.club_contact_name ?? matchedContact?.contact_name ?? null,
          contact_role: clubContact?.contact_role ?? link.club_contact_role ?? matchedContact?.contact_role ?? null,
          contact_phone: clubContact?.contact_phone ?? link.club_contact_phone ?? matchedContact?.contact_phone ?? null,
          contact_accent: clubContact?.contact_accent ?? link.club_contact_accent ?? matchedContact?.contact_accent ?? null,
          contact_image_url: clubContact?.contact_image_url ?? matchedContact?.contact_image_url ?? null,
          contact_club_id: clubContact?.contact_club_id ?? matchedContact?.contact_club_id ?? null,
          transfermarkt_url: clubContact?.transfermarkt_url ?? matchedContact?.transfermarkt_url ?? null,
        }
      : null;

    // Resolve the contact's OWN club (separate from the outreach target).
    let contactClub: { club_name: string | null; image_url: string | null; country: string | null } | null = null;
    const contactClubId = (resolvedClubContact as any)?.contact_club_id ?? null;
    if (contactClubId) {
      const { data: cc } = await supabase
        .from("club_map_positions")
        .select("club_name, image_url, country")
        .eq("id", contactClubId)
        .maybeSingle();
      contactClub = cc ?? null;
    }

    const { data: linkPlayers } = await supabase
      .from("club_outreach_link_players")
      .select("player_id, position_slot, fit_recommendation, sort_order")
      .eq("link_id", link.id)
      .order("sort_order", { ascending: true });

    // Fallback to legacy single player_id when no link_players rows exist
    let entries = linkPlayers ?? [];
    if (entries.length === 0 && link.player_id) {
      entries = [
        {
          player_id: link.player_id,
          position_slot: null,
          fit_recommendation: link.fit_recommendation,
          sort_order: 0,
        },
      ];
    }

    const playerIds = entries.map((e: any) => e.player_id);
    const [{ data: playerRows }, { data: defaultsRows }] = await Promise.all([
      playerIds.length
        ? supabase
            .from("players")
            .select(
              "id, name, position, age, date_of_birth, nationality, image_url, club, club_logo, league, highlights, bio, contract_end_date, current_salary_annual, preferred_currency"
            )
            .in("id", playerIds)
        : Promise.resolve({ data: [] as any[] }),
      playerIds.length
        ? supabase
            .from("club_outreach_player_defaults")
            .select(
              "player_id, stars_url_override, highlights_url, proof_of_representation_path"
            )
            .in("player_id", playerIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const playerById = new Map<string, any>(
      (playerRows ?? []).map((p: any) => [p.id, p])
    );
    const defaultsByPlayer = new Map<string, any>(
      (defaultsRows ?? []).map((d: any) => [d.player_id, d])
    );

    // Form configs + recent analyses for the optional Form banner
    const [{ data: formCfgs }, { data: formAnalyses }] = await Promise.all([
      playerIds.length
        ? supabase
            .from("player_form_config")
            .select("player_id, window_size, stats")
            .in("player_id", playerIds)
        : Promise.resolve({ data: [] as any[] }),
      playerIds.length
        ? supabase
            .from("player_analysis")
            .select("player_id, analysis_date, striker_stats, fixture_stats, minutes_played")
            .in("player_id", playerIds)
            .order("analysis_date", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const formCfgByPlayer = new Map<string, any>((formCfgs ?? []).map((c: any) => [c.player_id, c]));
    const analysesByPlayer = new Map<string, any[]>();
    (formAnalyses ?? []).forEach((r: any) => {
      const arr = analysesByPlayer.get(r.player_id) ?? [];
      arr.push(r);
      analysesByPlayer.set(r.player_id, arr);
    });

    // Resolve each player's CURRENT club logo via club_map_positions (case-insensitive).
    const uniqueClubNames = Array.from(
      new Set(
        (playerRows ?? [])
          .map((p: any) => (p.club ?? "").toString().trim())
          .filter((s: string) => s.length > 0)
      )
    );
    let clubLookup = new Map<string, { image_url: string | null; country: string | null }>();
    if (uniqueClubNames.length) {
      // Case-insensitive name match via ilike OR-list keeps lookups tolerant.
      const orFilter = uniqueClubNames
        .map((n) => `club_name.ilike.${n.replace(/[,()]/g, " ")}`)
        .join(",");
      const { data: clubRows } = await supabase
        .from("club_map_positions")
        .select("club_name, image_url, country")
        .or(orFilter);
      (clubRows ?? []).forEach((c: any) => {
        if (c.club_name) {
          clubLookup.set(c.club_name.toLowerCase().trim(), {
            image_url: c.image_url ?? null,
            country: c.country ?? null,
          });
        }
      });
    }

    const players = await Promise.all(
      entries.map(async (e: any) => {
        const p = playerById.get(e.player_id);
        const d = defaultsByPlayer.get(e.player_id);
        let proofUrl: string | null = null;
        if (d?.proof_of_representation_path) {
          const raw = d.proof_of_representation_path as string;
          if (/^https?:\/\//i.test(raw)) {
            proofUrl = raw;
          } else {
            const { data: signed } = await supabase.storage
              .from("proof-of-representation")
              .createSignedUrl(raw, 60 * 60 * 24 * 7, { download: false });
            proofUrl = signed?.signedUrl ?? null;
          }
        }
        const starsUrl =
          d?.stars_url_override ??
          (p?.name ? `https://risefootballagency.com/stars/${slugify(p.name)}` : null);
        const clubKey = (p?.club ?? "").toString().toLowerCase().trim();
        const clubInfo = clubKey ? clubLookup.get(clubKey) : null;
        // Parse the player's Stars highlights + bio for first video, club logo and section data
        let firstHighlightUrl: string | null = null;
        let bioParsed: any = null;
        try {
          let h: any = p?.highlights ?? null;
          if (typeof h === "string") h = JSON.parse(h);
          if (h && !Array.isArray(h) && h.matchHighlights) h = h.matchHighlights;
          if (Array.isArray(h)) {
            const first = h.find((x: any) => x && (x.videoUrl || x.video_url));
            firstHighlightUrl = first?.videoUrl ?? first?.video_url ?? null;
          }
        } catch (_) {
          firstHighlightUrl = null;
        }
        try {
          bioParsed = p?.bio ? (typeof p.bio === "string" ? JSON.parse(p.bio) : p.bio) : null;
        } catch (_) {
          bioParsed = null;
        }
        const tactical = Array.isArray(bioParsed?.schemeHistory)
          ? bioParsed.schemeHistory.find((s: any) => s?.clubLogo)
          : null;
        const bioClubLogo: string | null =
          bioParsed?.currentClubLogo ?? tactical?.clubLogo ?? null;

        // Form banner inputs
        const cfg = formCfgByPlayer.get(e.player_id) ?? null;
        const windowSize = cfg?.window_size ?? 5;
        const recentAnalyses = (analysesByPlayer.get(e.player_id) ?? []).slice(0, windowSize);
        return {
          player: p ?? null,
          position_slot: e.position_slot,
          fit_recommendation: e.fit_recommendation,
          sort_order: e.sort_order,
          stars_url: starsUrl,
          highlights_url: d?.highlights_url ?? null,
          proof_of_representation_url: proofUrl,
          player_club_image_url:
            bioClubLogo ?? clubInfo?.image_url ?? p?.club_logo ?? null,
          player_club_country: clubInfo?.country ?? null,
          first_highlight_url: firstHighlightUrl,
          top_stats: bioParsed?.topStats ?? null,
          season_stats: bioParsed?.seasonStats ?? null,
          strengths_and_play_style: bioParsed?.strengthsAndPlayStyle ?? null,
          form_config: cfg ? { window_size: windowSize, stats: cfg.stats ?? [] } : null,
          form_analyses: recentAnalyses,
        };
      })
    );

    // best-effort log
    try {
      await supabase.from("club_outreach_visits").insert({
        outreach_id: link.id,
        user_agent: req.headers.get("user-agent") ?? null,
        referrer: req.headers.get("referer") ?? null,
      });
    } catch (_) {
      /* ignore */
    }

    return new Response(
      JSON.stringify({
        link,
        club,
        players,
        whatsapp_number: settings?.whatsapp_number ?? null,
        agent_name: settings?.agent_name ?? null,
        agent_image_url: settings?.agent_image_url ?? null,
        club_contact: resolvedClubContact
          ? {
              ...resolvedClubContact,
              contact_club_name: contactClub?.club_name ?? null,
              contact_club_logo_url: contactClub?.image_url ?? null,
            }
          : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});