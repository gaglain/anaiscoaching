import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  type: "message" | "booking";
  title: string;
  description: string;
  date: string;
  read: boolean;
}

interface NotificationCenterProps {
  onNavigate?: (tab: string) => void;
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;

    const [messagesRes, bookingsRes] = await Promise.all([
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
          read: false,
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

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setNotifications(items);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notif-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user?.id}` }, () => fetchNotifications())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = (n: Notification) => {
    setOpen(false);
    if (n.type === "message" && onNavigate) {
      onNavigate("messages");
    } else if (n.type === "booking" && onNavigate) {
      onNavigate("bookings");
    }
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
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors ${!n.read ? "bg-accent/20" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? "font-semibold text-foreground" : "text-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                      {formatDistanceToNow(new Date(n.date), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
