import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { notifyAdmin } from "@/lib/emails";
import type { Tables } from "@/integrations/supabase/types";

type Message = Tables<"messages">;

interface UnifiedMessage {
  id: string;
  content: string;
  created_at: string;
  isOwn: boolean;
  source: "internal" | "email";
}

export function ClientMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [unifiedMessages, setUnifiedMessages] = useState<UnifiedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAdminId();
  }, []);

  useEffect(() => {
    if (user && adminId) {
      fetchAllMessages();
      markMessagesAsRead();

      const channel = supabase
        .channel("client-messages-unified")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            fetchAllMessages();
            markMessagesAsRead();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, adminId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [unifiedMessages]);

  const fetchAdminId = async () => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (data) {
        setAdminId(data.user_id);
      }
    } catch (error) {
      console.error("Error fetching admin:", error);
    }
  };

  const fetchAllMessages = async () => {
    if (!user || !adminId) return;

    try {
      // Fetch internal messages
      const { data: internalMessages } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      // Fetch contact_requests matching user email to get pre-account email history
      const userEmail = user.email;
      let emailMessages: UnifiedMessage[] = [];

      if (userEmail) {
        const { data: contactRequests } = await supabase
          .from("contact_requests")
          .select("id, message, created_at, name, email")
          .eq("email", userEmail);

        if (contactRequests && contactRequests.length > 0) {
          const requestIds = contactRequests.map((cr) => cr.id);

          // Fetch replies for these contact requests
          const { data: replies } = await supabase
            .from("contact_replies")
            .select("*")
            .in("contact_request_id", requestIds)
            .order("created_at", { ascending: true });

          // Add the initial contact request messages
          for (const cr of contactRequests) {
            if (cr.message) {
              emailMessages.push({
                id: `cr-${cr.id}`,
                content: cr.message,
                created_at: cr.created_at,
                isOwn: true,
                source: "email",
              });
            }
          }

          // Add replies
          if (replies) {
            for (const reply of replies) {
              emailMessages.push({
                id: `reply-${reply.id}`,
                content: reply.message,
                created_at: reply.created_at,
                isOwn: reply.sender === "prospect",
                source: "email",
              });
            }
          }
        }
      }

      // Build unified internal messages
      const internalUnified: UnifiedMessage[] = (internalMessages || []).map((msg) => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        isOwn: msg.sender_id === user.id,
        source: "internal" as const,
      }));

      // Merge and sort by date
      const all = [...emailMessages, ...internalUnified].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setUnifiedMessages(all);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("receiver_id", user.id)
        .is("read_at", null);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !adminId || !newMessage.trim()) return;

    setIsSending(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: adminId,
          content: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      try {
        await notifyAdmin({
          type: "new_message",
          data: {
            clientName: profile?.name || "Client",
            messagePreview: newMessage.trim().substring(0, 100),
          },
        });
      } catch (emailError) {
        console.error("Email notification error:", emailError);
      }

      try {
        await supabase.functions.invoke("send-push", {
          body: {
            userId: adminId,
            title: `Message de ${profile?.name || "Client"}`,
            body: newMessage.trim().substring(0, 100),
            url: "/admin?tab=messages",
          },
        });
      } catch (pushError) {
        console.error("Push notification error:", pushError);
      }

      setUnifiedMessages((prev) => [
        ...prev,
        {
          id: data.id,
          content: data.content,
          created_at: data.created_at,
          isOwn: true,
          source: "internal",
        },
      ]);
      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col border-primary/20">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          Messages avec Anaïs
        </CardTitle>
        <CardDescription>
          Échangez directement avec votre coach — historique email et messagerie inclus
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {unifiedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground font-medium">
                Aucun message pour le moment.
              </p>
              <p className="text-sm text-muted-foreground">
                Envoyez un message à Anaïs pour démarrer la conversation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {unifiedMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {message.source === "email" && (
                      <div className="flex items-center gap-1 mb-1">
                        <Mail className="h-3 w-3 opacity-70" />
                        <span className="text-[10px] opacity-70 uppercase tracking-wide">
                          par email
                        </span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {format(new Date(message.created_at), "d MMM HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-border/50 bg-card"
        >
          <div className="flex gap-2">
            <Textarea
              placeholder="Écrivez votre message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[80px] resize-none border-border/50 focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-auto bg-primary hover:bg-primary/90 shadow-md"
              disabled={isSending || !newMessage.trim()}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Appuyez sur Entrée pour envoyer, Maj+Entrée pour un saut de ligne
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
