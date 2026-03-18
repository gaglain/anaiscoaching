import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAppBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) { setCount(0); return; }

    const [messagesRes, contactsRes, repliesRes] = await Promise.all([
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .is("read_at", null),
      supabase
        .from("contact_requests")
        .select("*", { count: "exact", head: true })
        .eq("read", false),
      supabase
        .from("contact_replies")
        .select("*", { count: "exact", head: true })
        .eq("sender", "prospect")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const total =
      (messagesRes.count || 0) +
      (contactsRes.count || 0) +
      (repliesRes.count || 0);

    setCount(total);
  }, [user]);

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel("app-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, fetchCount)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_requests" }, fetchCount)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_replies" }, fetchCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchCount]);

  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;

    if (count > 0) {
      (navigator as any).setAppBadge(count).catch(() => {});
    } else {
      (navigator as any).clearAppBadge?.().catch(() => {});
    }
  }, [count]);
}
