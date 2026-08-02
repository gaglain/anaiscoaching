import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received inbound email webhook:", JSON.stringify(payload));

    // Only process email.received events
    if (payload.type !== "email.received") {
      console.log("Ignoring non-received event:", payload.type);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data } = payload;
    const emailId = data.email_id;
    const fromRaw = data.from;
    const subject = data.subject || "";

    // Extract email address from "Name <email@example.com>" format
    const emailMatch = fromRaw.match(/<([^>]+)>/) || [null, fromRaw];
    const senderEmail = (emailMatch[1] || fromRaw).trim().toLowerCase();

    console.log("Inbound email from:", senderEmail, "subject:", subject, "email_id:", emailId);

    // Fetch the received email content from Resend's inbound API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    let emailData: { text?: string | null; html?: string | null } | null = null;
    let lastResendError: unknown = null;

    for (const delayMs of [0, 750, 1500, 3000]) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const { data: receivedEmail, error: resendError } = await resend.emails.receiving.get(emailId);

      if (receivedEmail) {
        emailData = receivedEmail;
        console.log("Fetched inbound email content for:", emailId, "after delay", delayMs);
        break;
      }

      lastResendError = resendError;
      console.warn("Retrying inbound email fetch:", JSON.stringify({ emailId, delayMs, resendError }));
    }

    if (!emailData) {
      console.error("Failed to retrieve received email from Resend after retries:", lastResendError);
      throw new Error("Inbound email content not yet available");
    }

    const htmlToText = (input: string): string => {
      let text = input;
      if (/<\/?[a-z][\s\S]*>/i.test(text)) {
        text = text.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "");
        text = text.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "");
        text = text.replace(/<br\s*\/?>/gi, "\n");
        text = text.replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n");
        text = text.replace(/<[^>]+>/g, "");
      }
      const entities: Record<string, string> = {
        "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
        "&#39;": "'", "&apos;": "'", "&rsquo;": "’", "&ldquo;": "“", "&rdquo;": "”",
      };
      text = text.replace(/&[a-zA-Z#0-9]+;/g, (m) => {
        if (entities[m]) return entities[m];
        const num = m.match(/^&#(\d+);$/);
        if (num) return String.fromCharCode(Number(num[1]));
        const hex = m.match(/^&#x([0-9a-fA-F]+);$/);
        if (hex) return String.fromCharCode(parseInt(hex[1], 16));
        return m;
      });
      return text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    };

    const textBody = (emailData.text && emailData.text.trim())
      ? emailData.text
      : htmlToText(emailData.html || "");

    if (!textBody.trim()) {
      console.log("Empty email body, skipping");
      return new Response(
        JSON.stringify({ ok: true, message: "Empty email body" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Connect to Supabase with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find matching contact request by sender email
    const { data: contactRequests, error: fetchError } = await supabase
      .from("contact_requests")
      .select("id, name")
      .eq("email", senderEmail)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching contact requests:", fetchError);
      throw fetchError;
    }

    if (!contactRequests || contactRequests.length === 0) {
      console.log("No matching contact request found for:", senderEmail);
      return new Response(
        JSON.stringify({ ok: true, message: "No matching contact request" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert reply for the most recent contact request from this email
    const contactRequest = contactRequests[0];

    // Clean the text body - remove quoted replies if possible
    let cleanBody = textBody;
    const quoteMarkers = [
      /\nOn .+ wrote:/,
      /\nLe .+ a écrit\s?:/,
      /\n----- Original Message -----/,
      /\n_{3,}/,
      /\n>{2,}/,
    ];
    for (const marker of quoteMarkers) {
      const match = cleanBody.search(marker);
      if (match > 0) {
        cleanBody = cleanBody.substring(0, match).trim();
        break;
      }
    }

    if (!cleanBody.trim()) {
      cleanBody = textBody; // Fallback to full body
    }

    const { error: insertError } = await supabase
      .from("contact_replies")
      .insert({
        contact_request_id: contactRequest.id,
        message: cleanBody.trim(),
        sender: "prospect",
      });

    if (insertError) {
      console.error("Error inserting reply:", insertError);
      throw insertError;
    }

    console.log("Prospect reply saved for contact request:", contactRequest.id);

    // Send push notification to all admins
    try {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles) {
        for (const admin of adminRoles) {
          await supabase.functions.invoke("send-push", {
            body: {
              userId: admin.user_id,
              title: `Réponse de ${contactRequest.name}`,
              body: cleanBody.trim().substring(0, 100),
              url: "/admin?tab=clients",
            },
          });
        }
      }
    } catch (pushError) {
      console.error("Push notification error:", pushError);
    }

    // Mark contact request as unread so it appears in notifications
    await supabase
      .from("contact_requests")
      .update({ read: false })
      .eq("id", contactRequest.id);

    return new Response(
      JSON.stringify({ ok: true, contact_request_id: contactRequest.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error processing inbound email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
