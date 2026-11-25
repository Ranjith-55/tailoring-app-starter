// Supabase Edge Function: create-staff
//
// Why this exists: creating another user's login (an "admin" action) requires
// the Supabase SERVICE ROLE key, which must never be sent to the browser.
// This function runs on Supabase's servers, holds that key as a secret, and
// only does its job if the caller is already logged in as the owner —
// enforced by checking the caller's own `staff` row before doing anything.
//
// Deploy with the Supabase CLI (see README.md):
//   supabase functions deploy create-staff
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
//
// (SUPABASE_URL and SUPABASE_ANON_KEY are already provided automatically
// inside every Edge Function's environment.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    // Client bound to the CALLER's identity — used only to verify who is asking.
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData?.user) {
      return json({ error: "Not authenticated." }, 401);
    }

    const { data: callerStaffRow } = await callerClient
      .from("staff")
      .select("role")
      .eq("id", callerData.user.id)
      .single();

    if (callerStaffRow?.role !== "owner") {
      return json({ error: "Only the owner can create staff accounts." }, 403);
    }

    const { full_name, email, phone, password, job_role } = await req.json();
    if (!full_name || !email || !password) {
      return json({ error: "full_name, email and password are required." }, 400);
    }

    // Admin client — only ever created here, server-side, never in the browser.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) return json({ error: createError.message }, 400);

    const { error: insertError } = await adminClient.from("staff").insert({
      id: newUser.user.id,
      full_name,
      phone: phone || null,
      job_role: job_role || null,
      role: "staff",
      is_active: true,
    });
    if (insertError) return json({ error: insertError.message }, 400);

    return json({ success: true, id: newUser.user.id });
  } catch (err) {
    return json({ error: err.message || "Unexpected error" }, 500);
  }
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
