import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SessionReminder {
  booking_id: string;
  client_email: string;
  client_name: string;
  session_date: string;
  session_type: string;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getSessionTypeLabel = (type: string): string => {
  switch (type) {
    case "individual": return "Séance individuelle";
    case "duo": return "Séance duo";
    case "group": return "Séance en groupe";
    case "outdoor": return "Séance en extérieur";
    default: return type;
  }
};

const sendReminderEmail = async (reminder: SessionReminder) => {
  const sessionDate = new Date(reminder.session_date);
  const formattedDate = formatDate(sessionDate);
  const formattedTime = formatTime(sessionDate);

  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
  `;

  const buttonStyle = `
    display: inline-block;
    background-color: #f05a28;
    color: white;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
  `;

  const html = `
    <div style="${baseStyle}">
      <h1 style="color: #f05a28;">⏰ Rappel : Séance demain !</h1>
      <p>Bonjour ${reminder.client_name},</p>
      <p>Petit rappel : votre séance avec Anaïs est prévue <strong>demain</strong> !</p>
      <div style="background: #fff8f5; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #f05a28;">
        <p style="margin: 0 0 8px 0;"><strong>📅 Date :</strong> ${formattedDate}</p>
        <p style="margin: 0 0 8px 0;"><strong>⏰ Heure :</strong> ${formattedTime}</p>
        <p style="margin: 0;"><strong>🏋️ Type :</strong> ${getSessionTypeLabel(reminder.session_type)}</p>
      </div>
      <p><strong>Checklist avant votre séance :</strong></p>
      <ul>
        <li>✅ Tenue de sport confortable</li>
        <li>✅ Bouteille d'eau</li>
        <li>✅ Serviette</li>
        <li>✅ Bonne énergie 💪</li>
      </ul>
      <p style="margin-top: 24px;">
        <a href="https://coachsportif-rennes.fr/espace-client" style="${buttonStyle}">
          Voir mes réservations
        </a>
      </p>
      <p style="margin-top: 24px; color: #666;">
        À demain !<br>
        <strong>Anaïs Dubois</strong><br>
        Coach sportif à Rennes
      </p>
    </div>
  `;

  return await resend.emails.send({
    from: "Anaïs Dubois Coach <contact@coachsportif-rennes.fr>",
    to: [reminder.client_email],
    subject: `⏰ Rappel : Votre séance demain à ${formattedTime}`,
    html,
  });
};

const sendPushNotification = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
  reminder: SessionReminder
) => {
  const sessionDate = new Date(reminder.session_date);
  const formattedTime = formatTime(sessionDate);

  // Get user's push subscriptions
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) {
    console.log(`No push subscriptions for user ${userId}`);
    return;
  }

  const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("VAPID keys not configured");
    return;
  }

  // Import web-push dynamically
  const webPush = await import("https://esm.sh/web-push@3.6.7");

  webPush.setVapidDetails(
    "mailto:contact@coachsportif-rennes.fr",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  const payload = JSON.stringify({
    title: "⏰ Rappel séance demain",
    body: `Votre séance avec Anaïs est prévue demain à ${formattedTime}`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: "/espace-client",
    },
  });

  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload
      );
      console.log(`Push notification sent to ${subscription.endpoint}`);
    } catch (error) {
      console.error(`Failed to send push notification:`, error);
      // Remove invalid subscriptions
      if ((error as any).statusCode === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", subscription.id);
      }
    }
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get sessions happening in 24 hours (+/- 30 minutes window)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(tomorrow.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(tomorrow.getTime() + 30 * 60 * 1000);

    console.log(`Looking for sessions between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

    const { data: upcomingSessions, error: sessionsError } = await supabase
      .from("bookings")
      .select(`
        id,
        client_id,
        session_date,
        session_type,
        profiles!bookings_client_id_fkey (
          name,
          email
        )
      `)
      .eq("status", "confirmed")
      .gte("session_date", windowStart.toISOString())
      .lte("session_date", windowEnd.toISOString());

    if (sessionsError) {
      throw sessionsError;
    }

    console.log(`Found ${upcomingSessions?.length || 0} sessions to remind`);

    const results = {
      total: upcomingSessions?.length || 0,
      emailsSent: 0,
      pushSent: 0,
      errors: [] as string[],
    };

    for (const session of upcomingSessions || []) {
      const profile = session.profiles as { name: string; email: string } | null;
      
      if (!profile?.email) {
        console.log(`No email for session ${session.id}`);
        continue;
      }

      const reminder: SessionReminder = {
        booking_id: session.id,
        client_email: profile.email,
        client_name: profile.name || "Client",
        session_date: session.session_date,
        session_type: session.session_type,
      };

      // Send email reminder
      try {
        await sendReminderEmail(reminder);
        results.emailsSent++;
        console.log(`Email sent to ${reminder.client_email}`);
      } catch (error) {
        console.error(`Failed to send email to ${reminder.client_email}:`, error);
        results.errors.push(`Email to ${reminder.client_email}: ${(error as Error).message}`);
      }

      // Send push notification
      try {
        await sendPushNotification(supabase, session.client_id, reminder);
        results.pushSent++;
      } catch (error) {
        console.error(`Failed to send push to ${session.client_id}:`, error);
        results.errors.push(`Push to ${session.client_id}: ${(error as Error).message}`);
      }
    }

    console.log("Reminder results:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-session-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
