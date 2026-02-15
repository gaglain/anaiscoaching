import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "contact@coachsportif-rennes.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  type: "new_booking" | "new_message" | "new_signup";
  data: {
    clientName: string;
    clientEmail?: string;
    sessionDate?: string;
    sessionTime?: string;
    sessionType?: string;
    goals?: string;
    messagePreview?: string;
    level?: string;
    motivations?: string;
  };
}

const getNotificationContent = (type: NotifyRequest["type"], data: NotifyRequest["data"]) => {
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

  switch (type) {
    case "new_booking":
      return {
        subject: `🆕 Nouvelle demande de séance de ${data.clientName}`,
        html: `
          <div style="${baseStyle}">
            <h1 style="color: #f05a28;">Nouvelle demande de séance</h1>
            <p><strong>${data.clientName}</strong> souhaite réserver une séance.</p>
            <div style="background: #fff3e0; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f05a28;">
              <p><strong>📅 Date souhaitée :</strong> ${data.sessionDate}</p>
              <p><strong>⏰ Heure :</strong> ${data.sessionTime}</p>
              <p><strong>🏋️ Type :</strong> ${data.sessionType}</p>
              ${data.goals ? `<p><strong>🎯 Objectifs :</strong> ${data.goals}</p>` : ''}
              <p><strong>📧 Email :</strong> ${data.clientEmail}</p>
            </div>
            <p style="margin-top: 24px;">
              <a href="https://coachsportif-rennes.fr/admin" style="${buttonStyle}">
                Voir dans le back-office
              </a>
            </p>
          </div>
        `,
      };

    case "new_message":
      return {
        subject: `💬 Nouveau message de ${data.clientName}`,
        html: `
          <div style="${baseStyle}">
            <h1 style="color: #f05a28;">Nouveau message</h1>
            <p><strong>${data.clientName}</strong> vous a envoyé un message :</p>
            <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f05a28;">
              <p style="font-style: italic;">"${data.messagePreview}"</p>
            </div>
            <p style="margin-top: 24px;">
              <a href="https://coachsportif-rennes.fr/admin" style="${buttonStyle}">
                Répondre
              </a>
            </p>
          </div>
        `,
      };

    case "new_signup":
      return {
        subject: `🆕 Nouveau client inscrit : ${data.clientName}`,
        html: `
          <div style="${baseStyle}">
            <h1 style="color: #f05a28;">Nouveau client inscrit !</h1>
            <p><strong>${data.clientName}</strong> vient de s'inscrire sur l'application.</p>
            <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #4caf50;">
              <p><strong>📧 Email :</strong> ${data.clientEmail}</p>
              ${data.level ? `<p><strong>📊 Niveau :</strong> ${data.level}</p>` : ''}
              ${data.motivations ? `<p><strong>🎯 Objectifs :</strong> ${data.motivations}</p>` : ''}
            </div>
            <p style="margin-top: 24px;">
              <a href="https://coachsportif-rennes.fr/admin" style="${buttonStyle}">
                Voir dans le back-office
              </a>
            </p>
          </div>
        `,
      };

    default:
      return { subject: "", html: "" };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data }: NotifyRequest = await req.json();
    const { subject, html } = getNotificationContent(type, data);

    const emailResponse = await resend.emails.send({
      from: "App Coach Anaïs <noreply@coachsportif-rennes.fr>",
      to: [ADMIN_EMAIL],
      subject,
      html,
    });

    console.log("Admin notification sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending admin notification:", error);
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
