import { useState, useEffect, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  type: "message" | "booking" | "contact" | "signup" | "contact_reply";
  title: string;
  description: string;
  date: string;
  read: boolean;
}

interface NotificationCenterProps {
  onNavigate?: (tab: string) => void;
}

const READ_KEY = "notifications-read-ids";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function addReadId(key: string) {
  const ids = getReadIds();
  ids.add(key);
  // Keep only last 200
  const arr = [...ids].slice(-200);
  localStorage.setItem(READ_KEY, JSON.stringify(arr));
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const readIds = getReadIds();

    const [messagesRes, bookingsRes, contactsRes, signupsRes, repliesRes] = await Promise.all([
      supabase
        .from("messages")
        .select("id, content, created_at, read_at, sender_id")
        .eq("receiver_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("bookings")
        .select("id, session_date, session_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("contact_requests")
        .select("id, name, email, session_type, goal, created_at, read")
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("profiles")
        .select("id, name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("contact_replies")
        .select("id, message, created_at, sender, contact_request_id, contact_requests(name)")
        .eq("sender", "prospect")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const items: Notification[] = [];

    if (messagesRes.data) {
      messagesRes.data.forEach((m) => {
        items.push({
          id: m.id,
          type: "message",
          title: "Nouveau message",
          description: m.content.length > 60 ? m.content.slice(0, 60) + "…" : m.content,
          date: m.created_at,
          read: readIds.has(`message-${m.id}`),
        });
      });
    }

    if (bookingsRes.data) {
      bookingsRes.data.slice(0, 3).forEach((b) => {
        const statusLabel =
          b.status === "pending" ? "En attente" : b.status === "confirmed" ? "Confirmée" : "Annulée";
        items.push({
          id: b.id,
          type: "booking",
          title: `Réservation ${statusLabel.toLowerCase()}`,
          description: `${b.session_type} — ${new Date(b.session_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
          date: b.created_at,
          read: true,
        });
      });
    }

    if (contactsRes.data) {
      contactsRes.data.forEach((c) => {
        items.push({
          id: c.id,
          type: "contact",
          title: `Demande de ${c.name}`,
          description: c.goal ? `Objectif : ${c.goal}` : c.email,
          date: c.created_at,
          read: false,
        });
      });
    }

    if (repliesRes.data) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      repliesRes.data
        .filter((r) => r.created_at > weekAgo)
        .forEach((r) => {
          const contactName = (r as any).contact_requests?.name || "Un prospect";
          const key = `reply-${r.id}`;
          items.push({
            id: r.id,
            type: "contact_reply",
            title: `Réponse de ${contactName}`,
            description: r.message.length > 60 ? r.message.slice(0, 60) + "…" : r.message,
            date: r.created_at,
            read: readIds.has(key),
          });
        });
    }

    if (signupsRes.data) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      signupsRes.data
        .filter((p) => p.created_at > weekAgo && p.id !== user.id)
        .forEach((p) => {
          items.push({
            id: p.id,
            type: "signup",
            title: "Nouvelle inscription",
            description: p.name || p.email || "",
            date: p.created_at,
            read: readIds.has(`signup-${p.id}`),
          });
        });
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setNotifications(items);
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notif-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user?.id}` }, () => fetchNotifications())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchNotifications())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_requests" }, () => fetchNotifications())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_replies" }, () => fetchNotifications())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => fetchNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markOneAsRead = async (n: Notification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (n.type === "message") {
      await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    } else if (n.type === "contact") {
      await supabase.from("contact_requests").update({ read: true }).eq("id", n.id);
    } else {
      // For contact_reply, signup — use localStorage
      const key = n.type === "contact_reply" ? `reply-${n.id}` : `signup-${n.id}`;
      addReadId(key);
    }

    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id && item.type === n.type ? { ...item, read: true } : item))
    );
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await markOneAsRead(n);
    }

    setOpen(false);

    if (n.type === "message" && onNavigate) {
      onNavigate("messages");
    } else if (n.type === "booking" && onNavigate) {
      onNavigate("bookings");
    } else if ((n.type === "contact" || n.type === "contact_reply" || n.type === "signup") && onNavigate) {
      onNavigate("clients");
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await Promise.all([
      supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("receiver_id", user.id).is("read_at", null),
      supabase.from("contact_requests").update({ read: true }).eq("read", false),
    ]);

    // Mark local ones
    notifications.forEach((n) => {
      if (!n.read) {
        if (n.type === "contact_reply") addReadId(`reply-${n.id}`);
        if (n.type === "signup") addReadId(`signup-${n.id}`);
        if (n.type === "message") addReadId(`message-${n.id}`);
      }
    });

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 z-[60] bg-popover border border-border shadow-lg">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] text-secondary hover:text-secondary/80 font-medium transition-colors"
            >
              Tout marquer lu
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={`${n.type}-${n.id}`}
                  className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors ${!n.read ? "bg-accent/20" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => handleClick(n)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className={`text-sm ${!n.read ? "font-semibold text-foreground" : "text-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.date), { addSuffix: true, locale: fr })}
                      </p>
                    </button>
                    {!n.read && (
                      <button
                        onClick={(e) => markOneAsRead(n, e)}
                        className="shrink-0 mt-1 p-1.5 rounded-full bg-secondary/10 hover:bg-secondary/25 text-secondary transition-colors"
                        title="Marquer comme lu"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
