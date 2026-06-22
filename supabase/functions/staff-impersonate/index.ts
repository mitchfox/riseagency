import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Quick-login / "view as" issuer.
// Generates a single-use Supabase magic link so an admin can open a new tab
// authenticated as another staff account and see the portal exactly as they
// would. Gated by: admin role check + admin password re-confirmation +
// typed-in challenge phrase + typed reason. Every issued link is audit-logged
// to public.staff_view_as_log.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const {
      admin_user_id,
      admin_password,
      target_user_id,
      reason,
      challenge_typed,
      challenge_expected,
      redirect_to,
    } = body as Record<string, string>;

    if (
      !admin_user_id ||
      !admin_password ||
      !target_user_id ||
      !reason ||
      !challenge_typed ||
      !challenge_expected
    ) {
      return json({ error: "Missing required fields" }, 400);
    }

    if (reason.trim().length < 10) {
      return json({ error: "Reason must be at least 10 characters" }, 400);
    }

    if (
      challenge_typed.trim().toUpperCase() !==
      challenge_expected.trim().toUpperCase()
    ) {
      return json({ error: "Confirmation phrase did not match" }, 400);
    }

    // 1. Admin must hold the admin role.
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", admin_user_id)
      .eq("role", "admin");
    if (!roleRows || roleRows.length === 0) {
      return json({ error: "Not authorised" }, 403);
    }

    // 2. Resolve admin email + verify their password by attempting a
    //    real sign-in on a throwaway anon client (does not touch the
    //    admin client's session).
    const { data: adminLookup, error: adminLookupErr } =
      await admin.auth.admin.getUserById(admin_user_id);
    if (adminLookupErr || !adminLookup?.user?.email) {
      return json({ error: "Could not resolve admin account" }, 400);
    }
    const adminEmail = adminLookup.user.email;

    const verifier = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: pwErr } = await verifier.auth.signInWithPassword({
      email: adminEmail,
      password: admin_password,
    });
    if (pwErr) {
      // Audit failed attempt too — useful when looking for abuse.
      await admin.from("staff_view_as_log").insert({
        admin_user_id,
        admin_email: adminEmail,
        target_user_id,
        target_email: null,
        reason: `[FAILED PASSWORD] ${reason}`,
        user_agent: req.headers.get("user-agent"),
      });
      return json({ error: "Admin password is incorrect" }, 401);
    }
    await verifier.auth.signOut().catch(() => null);

    // 3. Resolve target email.
    const { data: targetLookup, error: targetLookupErr } =
      await admin.auth.admin.getUserById(target_user_id);
    if (targetLookupErr || !targetLookup?.user?.email) {
      return json({ error: "Target account not found" }, 404);
    }
    const targetEmail = targetLookup.user.email;

    // 4. Generate a magic link signed by Supabase. Single-use, short TTL.
    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail,
        options: {
          redirectTo: redirect_to || `${SUPABASE_URL}/staff`,
        },
      });
    if (linkErr || !linkData?.properties?.action_link) {
      return json(
        { error: linkErr?.message || "Could not generate sign-in link" },
        500,
      );
    }

    // 5. Audit log.
    await admin.from("staff_view_as_log").insert({
      admin_user_id,
      admin_email: adminEmail,
      target_user_id,
      target_email: targetEmail,
      reason,
      user_agent: req.headers.get("user-agent"),
    });

    return json({
      action_link: linkData.properties.action_link,
      target_email: targetEmail,
    });
  } catch (err) {
    console.error("staff-impersonate error", err);
    return json({ error: "Unexpected error" }, 500);
  }
});