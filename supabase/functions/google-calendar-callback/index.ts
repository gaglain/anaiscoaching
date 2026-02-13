import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // user_id

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get stored credentials
    const { data: creds, error: credsError } = await supabase
      .from("calendar_credentials")
      .select("client_id, client_secret")
      .eq("provider", "google")
      .single();

    if (credsError || !creds) {
      throw new Error("Google calendar credentials not configured");
    }

    const functionUrl = `${supabaseUrl}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        redirect_uri: functionUrl,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${JSON.stringify(tokens)}`);
    }

    // Get user email from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    // Store connection
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error: upsertError } = await supabase
      .from("calendar_connections")
      .upsert({
        user_id: state,
        provider: "google",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: expiresAt,
        email: userInfo.email,
      }, { onConflict: "user_id,provider" });

    if (upsertError) throw upsertError;

    // Redirect back to admin dashboard
    const appUrl = Deno.env.get("SITE_URL") || "https://anaiscoaching.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/admin?tab=calendar&connected=google` },
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    const appUrl = Deno.env.get("SITE_URL") || "https://anaiscoaching.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/admin?tab=settings&error=google_oauth_failed` },
    });
  }
});
