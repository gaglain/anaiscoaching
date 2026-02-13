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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, provider } = await req.json();

    if (action === "get-auth-url") {
      return await getAuthUrl(supabase, provider, user.id);
    }

    if (action === "sync") {
      return await syncCalendar(supabase, provider, user.id);
    }

    if (action === "disconnect") {
      await supabase
        .from("calendar_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const { data: connections } = await supabase
        .from("calendar_connections")
        .select("provider, email, connected_at, token_expires_at")
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ connections: connections || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getAuthUrl(supabase: any, provider: string, userId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  const { data: creds, error } = await supabase
    .from("calendar_credentials")
    .select("client_id")
    .eq("provider", provider)
    .single();

  if (error || !creds) {
    return new Response(JSON.stringify({ error: `${provider} credentials not configured` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let authUrl: string;

  if (provider === "google") {
    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;
    const params = new URLSearchParams({
      client_id: creds.client_id,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
      access_type: "offline",
      prompt: "consent",
      state: userId,
    });
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  } else if (provider === "outlook") {
    const redirectUri = `${supabaseUrl}/functions/v1/outlook-calendar-callback`;
    const params = new URLSearchParams({
      client_id: creds.client_id,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "Calendars.ReadWrite User.Read offline_access",
      state: userId,
    });
    authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  } else {
    return new Response(JSON.stringify({ error: "Unknown provider" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ url: authUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refreshGoogleToken(supabase: any, connection: any) {
  const { data: creds } = await supabase
    .from("calendar_credentials")
    .select("client_id, client_secret")
    .eq("provider", "google")
    .single();

  if (!creds || !connection.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await res.json();
  if (!res.ok) return null;

  await supabase
    .from("calendar_connections")
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token;
}

async function refreshOutlookToken(supabase: any, connection: any) {
  const { data: creds } = await supabase
    .from("calendar_credentials")
    .select("client_id, client_secret")
    .eq("provider", "outlook")
    .single();

  if (!creds || !connection.refresh_token) return null;

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
      scope: "Calendars.ReadWrite User.Read offline_access",
    }),
  });

  const tokens = await res.json();
  if (!res.ok) return null;

  await supabase
    .from("calendar_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || connection.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token;
}

async function getValidToken(supabase: any, connection: any) {
  const now = new Date();
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;

  if (expiresAt && expiresAt > now) {
    return connection.access_token;
  }

  // Token expired, refresh
  if (connection.provider === "google") {
    return await refreshGoogleToken(supabase, connection);
  } else {
    return await refreshOutlookToken(supabase, connection);
  }
}

async function syncCalendar(supabase: any, provider: string, userId: string) {
  const { data: connection, error: connError } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();

  if (connError || !connection) {
    return new Response(JSON.stringify({ error: `Not connected to ${provider}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = await getValidToken(supabase, connection);
  if (!token) {
    return new Response(JSON.stringify({ error: "Failed to refresh token. Please reconnect." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get bookings from the last 30 days and next 90 days
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const to = new Date();
  to.setDate(to.getDate() + 90);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, profiles(name)")
    .gte("session_date", from.toISOString())
    .lte("session_date", to.toISOString())
    .in("status", ["confirmed", "pending"]);

  let pushed = 0;
  let errors = 0;

  for (const booking of (bookings || [])) {
    try {
      const startDate = new Date(booking.session_date);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const clientName = booking.profiles?.name || "Client";

      if (provider === "google") {
        await pushToGoogle(token, {
          summary: `Coaching - ${clientName}`,
          description: `Type: ${booking.session_type}\n${booking.goals ? `Objectif: ${booking.goals}` : ""}`,
          start: startDate,
          end: endDate,
          id: booking.id,
        });
      } else {
        await pushToOutlook(token, {
          subject: `Coaching - ${clientName}`,
          body: `Type: ${booking.session_type}\n${booking.goals ? `Objectif: ${booking.goals}` : ""}`,
          start: startDate,
          end: endDate,
          id: booking.id,
        });
      }
      pushed++;
    } catch (e) {
      console.error(`Failed to push booking ${booking.id}:`, e);
      errors++;
    }
  }

  // Log sync
  await supabase.from("calendar_sync_log").insert({
    connection_id: connection.id,
    direction: "push",
    status: errors > 0 ? "error" : "success",
    details: `Pushed ${pushed} events, ${errors} errors`,
  });

  return new Response(JSON.stringify({ success: true, pushed, errors }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pushToGoogle(token: string, event: any) {
  // Use booking ID as a stable Google Calendar event ID (hex only)
  const eventId = event.id.replace(/-/g, "").substring(0, 32);

  const body = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.start.toISOString(), timeZone: "Europe/Paris" },
    end: { dateTime: event.end.toISOString(), timeZone: "Europe/Paris" },
  };

  // Try to update first (PATCH), if 404 then create
  const patchRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (patchRes.status === 404) {
    const createRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, id: eventId }),
      }
    );
    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Google create failed: ${err}`);
    }
  } else if (!patchRes.ok) {
    const err = await patchRes.text();
    throw new Error(`Google patch failed: ${err}`);
  }
}

async function pushToOutlook(token: string, event: any) {
  const body = {
    subject: event.subject,
    body: { contentType: "Text", content: event.body },
    start: { dateTime: event.start.toISOString(), timeZone: "Europe/Paris" },
    end: { dateTime: event.end.toISOString(), timeZone: "Europe/Paris" },
    transactionId: event.id,
  };

  // Search for existing event by transactionId in extended properties
  const searchRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/events?$filter=transactionId eq '${event.id}'`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const searchData = await searchRes.json();
  const existingEvents = searchData.value || [];

  if (existingEvents.length > 0) {
    const existingId = existingEvents[0].id;
    const updateRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${existingId}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Outlook update failed: ${err}`);
    }
  } else {
    const createRes = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Outlook create failed: ${err}`);
    }
  }
}
