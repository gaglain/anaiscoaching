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
    const { data: creds, error: credsError } = await supabase
      .from("calendar_credentials")
      .select("client_id, client_secret")
      .eq("provider", "outlook")
      .single();

    if (credsError || !creds) {
      throw new Error("Outlook calendar credentials not configured");
    }

    const functionUrl = `${supabaseUrl}/functions/v1/outlook-calendar-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        redirect_uri: functionUrl,
        grant_type: "authorization_code",
        scope: "Calendars.ReadWrite User.Read offline_access",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${JSON.stringify(tokens)}`);
    }

    // Get user info
    const userInfoRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error: upsertError } = await supabase
      .from("calendar_connections")
      .upsert({
        user_id: state,
        provider: "outlook",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: expiresAt,
        email: userInfo.mail || userInfo.userPrincipalName,
      }, { onConflict: "user_id,provider" });

    if (upsertError) throw upsertError;

    const appUrl = Deno.env.get("SITE_URL") || "https://anaiscoaching.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/admin?tab=calendar&connected=outlook` },
    });
  } catch (error) {
    console.error("Outlook OAuth error:", error);
    const appUrl = Deno.env.get("SITE_URL") || "https://anaiscoaching.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/admin?tab=settings&error=outlook_oauth_failed` },
    });
  }
});
