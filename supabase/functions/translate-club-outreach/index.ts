import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LangCode = "en" | "es" | "pt" | "fr" | "de" | "it" | "pl" | "cs" | "ru" | "tr" | "hr" | "no";
const LANG_NAMES: Record<LangCode, string> = {
  en: "English (United Kingdom)",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
  pl: "Polish",
  cs: "Czech",
  ru: "Russian",
  tr: "Turkish",
  hr: "Croatian",
  no: "Norwegian",
};

// Canonical UI bundle for the public proposal page. Keys are stable; values are the English source strings.
// Placeholders inside braces MUST be preserved untranslated.
const UI_BUNDLE: Record<string, string> = {
  "hdr.presents": "Rise Football Agency presents",
  "hdr.players": "{count} players",
  "hdr.player": "Player",
  "hdr.for": "For",
  "hdr.to": "To",
  "chip.all": "All",
  "fit.title": "Fit & Recommendation",
  "key.title": "Key Details",
  "key.yearsOld": "Years old",
  "key.club": "Club",
  "key.position": "Position",
  "key.nationality": "Nationality",
  "key.league": "League",
  "key.contractExpiry": "Contract expiry",
  "key.currentSalary": "Current salary",
  "key.salaryExpectations": "Salary expectations",
  "key.transferFee": "Transfer fee",
  "key.height": "Height",
  "key.preferredFoot": "Preferred foot",
  "key.status": "Status",
  "key.custom": "Detail",
  "picker.backToPlayers": "Back to all players offered",
  "picker.learnMore": "Learn more",
  "situation.title": "Situation",
  "card.videoTitle": "Video & Data",
  "card.videoSubtitle": "Full profile, highlights and statistics",
  "card.proofTitle": "Proof of Representation",
  "card.proofSubtitle": "Signed agreement with Rise Football Agency",
  "card.availableOnRequest": "Available on request",
  "card.unavailable": "Unavailable",
  "card.open": "Open",
  "contact.discuss": "Discuss further",
  "contact.waAgent": "WhatsApp {firstName}'s Agent",
  "contact.waClubContact": "WhatsApp Key Club Contact",
  "err.title": "Proposal unavailable",
  "err.inactive": "This link is no longer active.",
  "form.titlePrefix": "Form · Last {n}",
  "section.inNumbers": "In Numbers",
  "section.seasonStats": "Season Stats",
  "section.strengths": "Strengths & Play Style",
  "footer.visit": "Visit RISE Football Agency",
  // Match-By-Match (Video & Data inline view)
  "mbm.title": "Match-By-Match Data",
  "mbm.match": "Match",
  "mbm.per90": "Per 90",
  "mbm.raw": "Raw",
  "mbm.empty": "No data available.",
  "mbm.cat.Possession": "Possession",
  "mbm.cat.Passing": "Passing",
  "mbm.cat.Shooting": "Shooting",
  "mbm.cat.Defending": "Defending",
  "inline.back": "Back to proposal",
  "card.openFull": "View Full Stars Profile",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const shortId: string = body.short_id || body.shortId || "";
    const language: LangCode = (body.language || "en") as LangCode;

    if (!shortId) {
      return new Response(JSON.stringify({ error: "short_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LANG_NAMES[language]) {
      return new Response(JSON.stringify({ error: "unsupported language" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: link, error: linkErr } = await supabase
      .from("club_outreach_links")
      .select("id, short_id")
      .eq("short_id", shortId)
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (language === "en") {
      const { error } = await supabase
        .from("club_outreach_links")
        .update({ language: "en", translations: null })
        .eq("id", link.id);
      if (error) throw error;
      return new Response(JSON.stringify({ language: "en", translations: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull per-player fit_recommendation values
    const { data: linkPlayers } = await supabase
      .from("club_outreach_link_players")
      .select("player_id, fit_recommendation")
      .eq("link_id", link.id);

    const fits: Record<string, string> = {};
    (linkPlayers || []).forEach((lp: any) => {
      const t = (lp?.fit_recommendation ?? "").toString().trim();
      if (t && lp?.player_id) fits[lp.player_id] = t;
    });

    const inputBundle = {
      ui: UI_BUNDLE,
      fits,
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a professional translator for a football agency. Translate the values of the provided JSON object from English into ${LANG_NAMES[language]}.

Rules:
- Keep keys identical.
- Translate every string value. Do not add or remove keys.
- Preserve any placeholders in braces such as {count}, {firstName}, {n} exactly as they appear, in the same position.
- Keep proper nouns (Rise Football Agency, RISE Football, WhatsApp, names of people, clubs, leagues) unchanged.
- Use natural football terminology for the target language.
- Do not use markdown, do not add quotes around values, return strict JSON.
- Match the tone: concise, professional, slightly formal.
- Return a JSON object with exactly two top-level keys: "ui" and "fits", mirroring the input structure.`;

    const userPrompt = `Translate the values in this JSON:\n\n${JSON.stringify(inputBundle)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI translation failed");
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { ui?: Record<string, string>; fits?: Record<string, string> } = {};
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI JSON", e, content);
      throw new Error("AI returned invalid JSON");
    }

    // Merge with fallbacks so missing keys never break the page.
    const ui: Record<string, string> = {};
    Object.keys(UI_BUNDLE).forEach((k) => {
      const v = parsed.ui?.[k];
      ui[k] = typeof v === "string" && v.trim() ? v : UI_BUNDLE[k];
    });
    const outFits: Record<string, string> = {};
    Object.keys(fits).forEach((pid) => {
      const v = parsed.fits?.[pid];
      outFits[pid] = typeof v === "string" && v.trim() ? v : fits[pid];
    });

    const translations = { ui, fits: outFits };

    const { error: updErr } = await supabase
      .from("club_outreach_links")
      .update({ language, translations })
      .eq("id", link.id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ language, translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("translate-club-outreach error", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});