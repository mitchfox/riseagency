import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();
    if (!username || typeof username !== "string") {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const u = username.trim();
    const { data, error } = await supabase
      .from("highlight_makers")
      .select("id, username, password, display_name, status")
      .ilike("username", u)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Password is optional. Only enforce if the maker has a stored password.
    if (data.password && data.password.length > 0) {
      if (typeof password !== "string" || data.password !== password) {
        return new Response(JSON.stringify({ found: false, reason: "password" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await supabase
      .from("highlight_makers")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", data.id);

    return new Response(
      JSON.stringify({
        found: true,
        maker: {
          id: data.id,
          username: data.username,
          display_name: data.display_name,
          status: data.status,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[highlight-maker-login-check]", err);
    return new Response(JSON.stringify({ found: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});