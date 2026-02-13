import { supabase } from "@/integrations/supabase/client";

/**
 * Trigger calendar sync after a booking is created or modified.
 * Silently fails if no calendar connections exist.
 */
export async function syncBookingToCalendar() {
  try {
    // Check if any calendar connections exist first
    const { data: connections } = await supabase.functions.invoke("calendar-sync", {
      body: { action: "status" },
    });

    if (!connections?.connections?.length) return;

    // Sync each connected provider
    for (const conn of connections.connections) {
      try {
        await supabase.functions.invoke("calendar-sync", {
          body: { action: "sync", provider: conn.provider },
        });
      } catch {
        console.warn(`Calendar sync failed for ${conn.provider}`);
      }
    }
  } catch {
    // Silently fail - calendar sync is not critical
  }
}
