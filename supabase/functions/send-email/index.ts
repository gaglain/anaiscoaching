import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "booking_confirmation" | "booking_confirmed" | "booking_cancelled" | "new_message" | "welcome";
  to: string;
  data: {
    clientName?: string;
    coachName?: string;
    sessionDate?: string;
    sessionTime?: string;
    sessionType?: string;
    messagePreview?: string;
  };
}

const getEmailContent = (type: EmailRequest["type"], data: EmailRequest["data"]) => {
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
    case "welcome":
      return {
        subject: "Bienvenue chez Coach Anaïs ! 🎉",
        html: `
          <div style="${baseStyle}">
            <h1 style="color: #f05a28;">Bienvenue ${data.clientName} !</h1>
            <p>Merci de rejoindre l'aventure coaching avec Anaïs Dubois.</p>
            <p>Vous pouvez maintenant :</p>
            <ul>
              <li>Réserver vos séances de coaching</li>
              <li>Échanger directement avec Anaïs</li>
              <li>Suivre votre progression</li>
            </ul>
            <p style="margin-top: 24px;">
              <a href="https://coachsportif-rennes.fr/espace-client" style="${buttonStyle}">
                Accéder à mon espace
              </a>
            </p>
            <p style="margin-top: 24px; color: #666;">
              À très vite,<br>
              <strong>Anaïs Dubois</strong><br>
              Coach sportif à Rennes
            </p>
          </div>
        `,
      };

    case "booking_confirmation":
      return {
        subject: "Demande de séance reçue ✅",
        html: `
          <div style="${baseStyle}">
            <h1 style="color: #f05a28;">Demande de séance enregistrée</h1>
            <p>Bonjour ${data.clientName},</p>
            <p>Votre demande de séance a bien été enregistrée :</p>
            <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>📅 Date :</strong> ${data.sessionDate}</p>
              <p><strong>⏰ Heure :</strong> ${data.sessionTime}</p>
              <p><strong>🏋️ Type :</strong> ${data.sessionType}</p>
            </div>
            <p>Anaïs va confirmer votre séance très rapidement. Vous recevrez un email de confirmation.</p>
            <p style="margin-top: 24px; color: #666;">
              À très vite,<br>
              <strong>Anaïs Dubois</strong>
            </p>
          </div>
        `,
      };

    case "booking_confirmed":
      return {
        subject: "Séance confirmée ! 🎯",
        html: `
          <div style="${baseStyle}">
            <h1 style="color: #f05a28;">Votre séance est confirmée !</h1>
            <p>Bonjour ${data.clientName},</p>
            <p>Bonne nouvelle ! Votre séance a été confirmée par Anaïs :</p>
            <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #4caf50;">
              <p><strong>📅 Date :</strong> ${data.sessionDate}</p>
              <p><strong>⏰ Heure :</strong> ${data.sessionTime}</p>
              <p><strong>🏋️ Type :</strong> ${data.sessionType}</p>
            </div>
            <p>N'oubliez pas d'apporter une tenue adaptée et une bouteille d'eau !</p>
            <p style="margin-top: 24px;">
              <a href="https://coachsportif-rennes.fr/espace-client" style="${buttonStyle}">
                Voir mes réservations
              </a>
            </p>
            <p style="margin-top: 24px; color: #666;">
              On se retrouve bientôt,<br>
              <strong>Anaïs</strong>
            </p>
          </div>
        `,
      };

    case "booking_cancelled":
      return {
        subject: "Séance annulée",
        html: `
          <div style="${baseStyle}">
            <h1 style="color: #f05a28;">Séance annulée</h1>
            <p>Bonjour ${data.clientName},</p>
            <p>Votre séance du ${data.sessionDate} à ${data.sessionTime} a été annulée.</p>
            <p>N'hésitez pas à réserver un nouveau créneau qui vous convient mieux.</p>
            <p style="margin-top: 24px;">
              <a href="https://coachsportif-rennes.fr/espace-client" style="${buttonStyle}">
                Réserver une nouvelle séance
              </a>
            </p>
            <p style="margin-top: 24px; color: #666;">
              À bientôt,<br>
              <strong>Anaïs</strong>
            </p>
          </div>
        `,
      };

    case "new_message":
      return {
        subject: "Nouveau message d'Anaïs 💬",
        html: `
          <div style="${baseStyle}">
            <h1 style="color: #f05a28;">Vous avez un nouveau message</h1>
            <p>Bonjour ${data.clientName},</p>
            <p>Anaïs vous a envoyé un message :</p>
            <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f05a28;">
              <p style="font-style: italic;">"${data.messagePreview}"</p>
            </div>
            <p style="margin-top: 24px;">
              <a href="https://coachsportif-rennes.fr/espace-client" style="${buttonStyle}">
                Lire le message
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
    const { type, to, data }: EmailRequest = await req.json();
    const { subject, html } = getEmailContent(type, data);

    const emailResponse = await resend.emails.send({
      from: "Anaïs Dubois Coach <contact@coachsportif-rennes.fr>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
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
