import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const READ_KEY = "notifications-read-ids";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function useAppBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) { setCount(0); return; }

    const readIds = getReadIds();

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
        .select("id")
        .eq("sender", "prospect")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const unreadReplies = (repliesRes.data || []).filter(
      (r) => !readIds.has(`reply-${r.id}`)
    ).length;

    const total =
      (messagesRes.count || 0) +
      (contactsRes.count || 0) +
      unreadReplies;

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

    // Also listen for localStorage changes (when NotificationCenter marks as read)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === READ_KEY) fetchCount();
    };
    window.addEventListener("storage", handleStorage);

    // Poll periodically to catch same-tab localStorage changes
    const interval = setInterval(fetchCount, 10000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
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
