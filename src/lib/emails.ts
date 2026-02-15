import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  type: "booking_confirmation" | "booking_confirmed" | "booking_cancelled" | "new_message" | "welcome" | "booking_rescheduled";
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

interface NotifyAdminParams {
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

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: params,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}

export async function notifyAdmin(params: NotifyAdminParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("notify-admin", {
      body: params,
    });

    if (error) {
      console.error("Error notifying admin:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error notifying admin:", error);
    return { success: false, error: error.message };
  }
}

export function getSessionTypeLabel(type: string): string {
  switch (type) {
    case "individual":
      return "Séance individuelle";
    case "duo":
      return "Séance duo";
    case "group":
      return "Séance en groupe";
    case "outdoor":
      return "Séance en extérieur";
    default:
      return type;
  }
}
