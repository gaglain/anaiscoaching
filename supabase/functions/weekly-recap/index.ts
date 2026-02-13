import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resend = new Resend(resendKey);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Get last week's stats
    const { data: lastWeekBookings } = await supabase
      .from("bookings")
      .select("*, profiles(name)")
      .gte("session_date", weekAgo.toISOString())
      .lt("session_date", now.toISOString());

    const { data: upcomingBookings } = await supabase
      .from("bookings")
      .select("*, profiles(name)")
      .gte("session_date", now.toISOString())
      .lte("session_date", nextWeek.toISOString())
      .eq("status", "confirmed")
      .order("session_date", { ascending: true });

    const { data: pendingBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "pending");

    const { count: newClients } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString());

    const { data: unreadMessages } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .is("read_at", null);

    const confirmed = (lastWeekBookings || []).filter(b => b.status === "confirmed").length;
    const cancelled = (lastWeekBookings || []).filter(b => b.status === "cancelled").length;
    const pending = (pendingBookings || []).length;
    const upcoming = (upcomingBookings || []);

    // Format upcoming sessions list
    const upcomingList = upcoming.map(b => {
      const d = new Date(b.session_date);
      const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
      const day = dayNames[d.getDay()];
      const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
      const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      return `<li>${day} ${date} à ${time} — <strong>${b.profiles?.name || "Client"}</strong></li>`;
    }).join("");

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px;">
        <h1 style="color: #f05a28;">📊 Récapitulatif hebdomadaire</h1>
        <p>Bonjour Anaïs, voici le résumé de votre semaine :</p>
        
        <div style="background: #f8f8f8; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h2 style="margin-top: 0; font-size: 16px; color: #333;">Semaine écoulée</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: white; padding: 12px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #4caf50;">${confirmed}</div>
              <div style="font-size: 12px; color: #666;">Séances réalisées</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #f44336;">${cancelled}</div>
              <div style="font-size: 12px; color: #666;">Annulations</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #ff9800;">${pending}</div>
              <div style="font-size: 12px; color: #666;">En attente</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #2196f3;">${newClients || 0}</div>
              <div style="font-size: 12px; color: #666;">Nouveaux clients</div>
            </div>
          </div>
        </div>

        ${upcoming.length > 0 ? `
        <div style="background: #e8f5e9; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h2 style="margin-top: 0; font-size: 16px; color: #333;">📅 Séances de la semaine à venir (${upcoming.length})</h2>
          <ul style="padding-left: 20px;">${upcomingList}</ul>
        </div>
        ` : `
        <div style="background: #fff3e0; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 0;">Aucune séance prévue cette semaine.</p>
        </div>
        `}

        <p style="margin-top: 24px;">
          <a href="https://anaiscoaching.lovable.app/admin" style="display: inline-block; background-color: #f05a28; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ouvrir le back-office
          </a>
        </p>
        
        <p style="margin-top: 24px; color: #999; font-size: 12px;">
          Ce récapitulatif est envoyé automatiquement chaque lundi matin.
        </p>
      </div>
    `;

    // Get admin email
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (adminRole) {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", adminRole.user_id)
        .single();

      if (adminProfile?.email) {
        await resend.emails.send({
          from: "Anaïs Dubois Coach <contact@coachsportif-rennes.fr>",
          to: [adminProfile.email],
          subject: `📊 Récap hebdo — ${confirmed} séance${confirmed > 1 ? "s" : ""}, ${pending} en attente`,
          html,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, confirmed, cancelled, pending, upcoming: upcoming.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Weekly recap error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
