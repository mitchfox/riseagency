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
        "id, short_id, player_id, club_id, fit_recommendation, club_contact_name, club_contact_role, club_contact_phone, club_contact_accent, prepared_for_name, show_form, show_in_numbers, show_season_stats, show_strengths, season_data_mode, season_id, selected_video_ids, alternate_profile_link_ids, alternate_profiles_blurb, created_at, archived_at, target_type, agent_name, agent_logo_url, language, translations, is_mandated, key_details, section_order, mandated_agent_name, mandated_agent_role, mandated_agent_phone, mandated_agent_logo_url, mandate_proof_path, mandate_proof_url, is_suggested_to_agent, suggested_agent_note"
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
      .select("player_id, position_slot, fit_recommendation, situation, sort_order, show_form, show_in_numbers, show_season_stats, show_strengths, season_data_mode, season_id, selected_video_ids, key_details, section_order")
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
          situation: null,
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
              "player_id, stars_url_override, highlights_url, proof_of_representation_path, default_match_by_match_category, transfermarkt_url, match_by_match_stat_orders, match_by_match_game_order, default_situation, default_fit_recommendation"
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

    // Form configs + recent analyses for the optional Form banner. Season
    // windows are now resolved per player attached to the outreach.
    const seasonBoundsCache = new Map<string, Promise<{ start: string | null; end: string | null }>>();
    const getSeasonBounds = (seasonId: string | null | undefined) => {
      if (!seasonId) return Promise.resolve({ start: null, end: null });
      if (!seasonBoundsCache.has(seasonId)) {
        seasonBoundsCache.set(seasonId, (async () => {
          let seasonStartDate: string | null = null;
          let seasonEndDate: string | null = null;
          const { data: season } = await supabase
            .from("player_seasons")
            .select("start_analysis_id, end_analysis_id")
            .eq("id", seasonId)
            .maybeSingle();
          const ids = [season?.start_analysis_id, season?.end_analysis_id].filter(Boolean) as string[];
          if (ids.length) {
            const { data: bounds } = await supabase
              .from("player_analysis")
              .select("id, analysis_date")
              .in("id", ids);
            const dates = (bounds ?? [])
              .map((r: any) => r.analysis_date as string | null)
              .filter(Boolean)
              .sort();
            if (dates.length > 0) {
              seasonStartDate = dates[0];
              seasonEndDate = dates[dates.length - 1];
            }
          }
          return { start: seasonStartDate, end: seasonEndDate };
        })());
      }
      return seasonBoundsCache.get(seasonId)!;
    };

    const [{ data: formCfgs }, { data: formAnalyses }] = await Promise.all([
      playerIds.length
        ? supabase
            .from("player_form_config")
            .select("player_id, window_size, stats, match_by_match_default_category")
            .in("player_id", playerIds)
        : Promise.resolve({ data: [] as any[] }),
      playerIds.length
        ? (() => {
            // Dataless matches never contribute to averages, form banners,
            // or any season aggregate — only games that had real data should
            // count.
            let q = supabase
              .from("player_analysis")
              .select("id, player_id, analysis_date, opponent, club_logo_url, opponent_logo_url, result, r90_score, striker_stats, fixture_stats, minutes_played, data_unavailable, visibility_status")
              .in("player_id", playerIds)
              .or("data_unavailable.is.null,data_unavailable.eq.false")
              .order("analysis_date", { ascending: false });
            return q;
          })()
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const formCfgByPlayer = new Map<string, any>((formCfgs ?? []).map((c: any) => [c.player_id, c]));
    const analysesByPlayer = new Map<string, any[]>();
    (formAnalyses ?? []).forEach((r: any) => {
      const arr = analysesByPlayer.get(r.player_id) ?? [];
      arr.push(r);
      analysesByPlayer.set(r.player_id, arr);
    });

    // Determine which analyses have at least one clipped action with a video.
    // Used by the proposal Match-by-Match table to show a Play button.
    const analysisIdsForClips = (formAnalyses ?? []).map((a: any) => a.id).filter(Boolean);
    const analysesWithClips = new Set<string>();
    if (analysisIdsForClips.length) {
      const { data: clipRows } = await supabase
        .from("performance_report_actions")
        .select("analysis_id")
        .in("analysis_id", analysisIdsForClips)
        .not("video_url", "is", null);
      (clipRows ?? []).forEach((r: any) => {
        if (r?.analysis_id) analysesWithClips.add(r.analysis_id);
      });
    }

    // Resolve each player's CURRENT club logo via club_map_positions (case-insensitive).
    const uniqueClubNames = Array.from(
      new Set(
        (playerRows ?? [])
          .map((p: any) => (p.club ?? "").toString().trim())
          .filter((s: string) => s.length > 0)
      )
    );
    // Also include every opponent name we'll surface in Match by Match so the
    // proposal can render a small club logo next to each row.
    const uniqueOpponentNames = Array.from(
      new Set(
        (formAnalyses ?? [])
          .map((a: any) => (a.opponent ?? "").toString().trim())
          .filter((s: string) => s.length > 0)
      )
    );
    const allClubNames = Array.from(new Set([...uniqueClubNames, ...uniqueOpponentNames]));
    const clubLookup = new Map<string, { image_url: string | null; country: string | null }>();
    if (allClubNames.length) {
      // Case-insensitive name match via ilike OR-list keeps lookups tolerant.
      const orFilter = allClubNames
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
        let allVideos: { id: string; name: string; videoUrl: string; logoUrl: string | null; venue?: string | null }[] = [];
        // The inline "More Videos" carousel should mirror the order shown on
        // the Stars profile, which renders ONLY matchHighlights (not bestClips)
        // in their saved order. Keep a separate list for that.
        let starsOrderedVideos: { id: string; name: string; videoUrl: string; logoUrl: string | null; venue?: string | null }[] = [];
        let bioParsed: any = null;
        try {
          let h: any = p?.highlights ?? null;
          if (typeof h === "string") h = JSON.parse(h);
          let pool: any[] = [];
          let starsPool: any[] = [];
          if (Array.isArray(h)) {
            pool = h;
            starsPool = h;
          } else if (h && typeof h === "object") {
            pool = [...(h.matchHighlights ?? []), ...(h.bestClips ?? [])];
            starsPool = [...(h.matchHighlights ?? [])];
          }
          allVideos = pool
            .filter((x: any) => x && (x.videoUrl || x.video_url))
            .map((x: any) => ({
              id: String(x.id ?? x.videoUrl ?? x.video_url),
              name: String(x.name ?? "Highlight"),
              videoUrl: String(x.videoUrl ?? x.video_url),
              logoUrl: x.logoUrl ?? x.clubLogo ?? null,
              venue: x.venue ?? null,
            }));
          starsOrderedVideos = starsPool
            .filter((x: any) => x && (x.videoUrl || x.video_url))
            .map((x: any) => ({
              id: String(x.id ?? x.videoUrl ?? x.video_url),
              name: String(x.name ?? "Highlight"),
              videoUrl: String(x.videoUrl ?? x.video_url),
              logoUrl: x.logoUrl ?? x.clubLogo ?? null,
              venue: x.venue ?? null,
            }));
        } catch (_) {
          allVideos = [];
          starsOrderedVideos = [];
        }
        // Filter by this outreach player's selected_video_ids, falling back to
        // the legacy link-level selection for old links, then to the player's
        // saved per-player default selection on club_outreach_player_defaults
        // so a default chosen for "this player" applies to every outreach.
        const entrySel = Array.isArray((e as any).selected_video_ids) ? (e as any).selected_video_ids : [];
        const linkSel = Array.isArray((link as any).selected_video_ids) ? (link as any).selected_video_ids : [];
        const defaultSel = Array.isArray((d as any)?.default_selected_video_ids) ? (d as any).default_selected_video_ids : [];
        const selectedIds: string[] = entrySel.length > 0
          ? entrySel
          : linkSel.length > 0
          ? linkSel
          : defaultSel;
        let videos = allVideos;
        let videosExplicitlySelected = false;
        if (selectedIds.length > 0) {
          const set = new Set(selectedIds);
          const filtered = allVideos.filter((v) => set.has(v.id));
          if (filtered.length > 0) {
            videos = filtered;
            videosExplicitlySelected = true;
          }
        }
        firstHighlightUrl = videos[0]?.videoUrl ?? null;
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
        const seasonIdForPlayer = (e as any).season_id ?? (link as any).season_id ?? null;
        const bounds = await getSeasonBounds(seasonIdForPlayer);
        const allAnalyses = (analysesByPlayer.get(e.player_id) ?? []).filter((a: any) => {
          if (bounds.start && a.analysis_date < bounds.start) return false;
          if (bounds.end && a.analysis_date > bounds.end) return false;
          return true;
        });
        const recentAnalyses = allAnalyses.slice(0, windowSize);
        // Attach the resolved opponent logo to every match row.
        const matchByMatchWithLogos = allAnalyses.map((a: any) => {
          const opKey = (a.opponent ?? "").toString().toLowerCase().trim();
          const op = opKey ? clubLookup.get(opKey) : null;
          return {
            ...a,
            opponent_logo: a.club_logo_url ?? a.opponent_logo_url ?? op?.image_url ?? null,
            has_clips: analysesWithClips.has(a.id),
          };
        });
        // Per-player default Match by Match category lives on the outreach
        // defaults now (kept on form_config as a legacy fallback).
        const defaultMbmCategory =
          (d?.default_match_by_match_category as string | null) ??
          (cfg?.match_by_match_default_category ?? null);
        return {
          player: p ?? null,
          position_slot: e.position_slot,
          fit_recommendation: ((e as any).fit_recommendation && String((e as any).fit_recommendation).trim())
            ? (e as any).fit_recommendation
            : ((d as any)?.default_fit_recommendation ?? null),
          show_form: (e as any).show_form ?? (link as any).show_form ?? false,
          show_in_numbers: (e as any).show_in_numbers ?? (link as any).show_in_numbers ?? false,
          show_season_stats: (e as any).show_season_stats ?? (link as any).show_season_stats ?? false,
          show_strengths: (e as any).show_strengths ?? (link as any).show_strengths ?? false,
          season_data_mode: (e as any).season_data_mode ?? (link as any).season_data_mode ?? "popup",
          key_details: (e as any).key_details ?? (link as any).key_details ?? null,
          section_order: (e as any).section_order ?? (link as any).section_order ?? null,
          situation: ((e as any).situation && String((e as any).situation).trim())
            ? (e as any).situation
            : ((d as any)?.default_situation ?? null),
          sort_order: e.sort_order,
          stars_url: starsUrl,
          highlights_url: d?.highlights_url ?? null,
          proof_of_representation_url: proofUrl,
          player_club_image_url:
            bioClubLogo ?? clubInfo?.image_url ?? p?.club_logo ?? null,
          player_club_country: clubInfo?.country ?? null,
          first_highlight_url: firstHighlightUrl,
          videos,
          all_videos: allVideos,
          stars_ordered_videos: starsOrderedVideos,
          videos_explicitly_selected: videosExplicitlySelected,
          transfermarkt_url: (d as any)?.transfermarkt_url ?? null,
          match_by_match_stat_orders: (d as any)?.match_by_match_stat_orders ?? null,
          match_by_match_game_order: (d as any)?.match_by_match_game_order ?? null,
          top_stats: bioParsed?.topStats ?? null,
          season_stats: bioParsed?.seasonStats ?? null,
          strengths_and_play_style: bioParsed?.strengthsAndPlayStyle ?? null,
          form_config: cfg
            ? {
                window_size: windowSize,
                stats: cfg.stats ?? [],
                match_by_match_default_category: defaultMbmCategory,
              }
            : null,
          form_analyses: recentAnalyses,
          match_by_match: matchByMatchWithLogos,
          match_by_match_default_category: defaultMbmCategory,
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

    // Resolve alternate profiles: for each linked outreach id, fetch its
    // short_id + primary player's name / photo / position / age / club so the
    // proposal can render a compact strip of mini-cards linking through to
    // each alternate proposal.
    const altIds: string[] = Array.isArray((link as any).alternate_profile_link_ids)
      ? (link as any).alternate_profile_link_ids
      : [];
    let alternateProfiles: any[] = [];
    if (altIds.length > 0) {
      const { data: altLinks } = await supabase
        .from("club_outreach_links")
        .select("id, short_id, player_id, club_id, target_type, agent_name")
        .in("id", altIds)
        .is("archived_at", null);
      const { data: altLinkPlayers } = await supabase
        .from("club_outreach_link_players")
        .select("link_id, player_id, sort_order")
        .in("link_id", altIds)
        .order("sort_order", { ascending: true });
      const primaryByLink = new Map<string, string>();
      (altLinkPlayers ?? []).forEach((lp: any) => {
        if (!primaryByLink.has(lp.link_id)) primaryByLink.set(lp.link_id, lp.player_id);
      });
      const altPlayerIds = Array.from(new Set(
        (altLinks ?? []).map((l: any) => primaryByLink.get(l.id) ?? l.player_id).filter(Boolean)
      ));
      const { data: altPlayerRows } = altPlayerIds.length
        ? await supabase
            .from("players")
            .select("id, name, image_url, position, age, date_of_birth, club")
            .in("id", altPlayerIds)
        : { data: [] as any[] };
      const altPlayerById = new Map<string, any>((altPlayerRows ?? []).map((p: any) => [p.id, p]));
      // Preserve the order set by staff.
      alternateProfiles = altIds
        .map((id) => (altLinks ?? []).find((l: any) => l.id === id))
        .filter(Boolean)
        .map((l: any) => {
          const pid = primaryByLink.get(l.id) ?? l.player_id ?? null;
          const p = pid ? altPlayerById.get(pid) : null;
          return {
            short_id: l.short_id,
            target_type: l.target_type ?? 'club',
            player_name: p?.name ?? null,
            image_url: p?.image_url ?? null,
            position: p?.position ?? null,
            age: p?.age ?? null,
            date_of_birth: p?.date_of_birth ?? null,
            club: p?.club ?? null,
          };
        });
    }

    return new Response(
      JSON.stringify({
        link,
        club,
        players,
        alternate_profiles: alternateProfiles,
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