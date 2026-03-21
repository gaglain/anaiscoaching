import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, User, Plus, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { sendEmail } from "@/lib/emails";
import type { Tables } from "@/integrations/supabase/types";

type Message = Tables<"messages">;
type Profile = Tables<"profiles">;

interface UnifiedMessage {
  id: string;
  content: string;
  created_at: string;
  isOwn: boolean;
  source: "internal" | "email";
}

interface Conversation {
  client: Profile;
  lastMessageDate: string;
  lastMessageContent: string;
  unreadCount: number;
}

export function AdminMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [unifiedMessages, setUnifiedMessages] = useState<UnifiedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedClientRef = useRef<Profile | null>(null);
  const [isNewConvoOpen, setIsNewConvoOpen] = useState(false);
  const [allClients, setAllClients] = useState<Profile[]>([]);
  const [selectedNewClient, setSelectedNewClient] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchAllClients();

      const channel = supabase
        .channel("admin-messages-unified")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          () => {
            fetchConversations();
            if (selectedClientRef.current) {
              fetchUnifiedMessages(selectedClientRef.current);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [unifiedMessages]);

  const fetchAllClients = async () => {
    const { data } = await supabase.from("profiles").select("*").order("name");
    setAllClients(data || []);
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Fetch internal message conversations
      const { data: allMessages } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      // Fetch contact_requests with replies for email conversations
      const { data: contactRequests } = await supabase
        .from("contact_requests")
        .select("id, name, email, message, created_at");

      const { data: contactReplies } = await supabase
        .from("contact_replies")
        .select("*")
        .order("created_at", { ascending: false });

      // Build a map of email -> contact request conversations
      const emailConvoMap = new Map<string, { lastDate: string; lastContent: string; hasMessages: boolean }>();
      
      if (contactRequests) {
        for (const cr of contactRequests) {
          const replies = (contactReplies || []).filter((r) => r.contact_request_id === cr.id);
          const lastReply = replies[0];
          const lastDate = lastReply ? lastReply.created_at : cr.created_at;
          const lastContent = lastReply ? lastReply.message : (cr.message || "Demande de contact");
          
          const existing = emailConvoMap.get(cr.email);
          if (!existing || new Date(lastDate) > new Date(existing.lastDate)) {
            emailConvoMap.set(cr.email, { lastDate, lastContent, hasMessages: false });
          }
        }
      }

      // Build client ID based conversations from internal messages
      const clientConvoMap = new Map<string, { lastDate: string; lastContent: string; unreadCount: number }>();

      if (allMessages) {
        for (const msg of allMessages) {
          const clientId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          if (!clientConvoMap.has(clientId)) {
            clientConvoMap.set(clientId, {
              lastDate: msg.created_at,
              lastContent: msg.content,
              unreadCount: 0,
            });
          }
          if (msg.receiver_id === user.id && !msg.read_at) {
            const entry = clientConvoMap.get(clientId)!;
            entry.unreadCount++;
          }
        }
      }

      // Get all client IDs that have internal messages
      const clientIds = Array.from(clientConvoMap.keys());
      
      // Fetch profiles for internal message clients
      let profiles: Profile[] = [];
      if (clientIds.length > 0) {
        const { data } = await supabase.from("profiles").select("*").in("id", clientIds);
        profiles = data || [];
      }

      // Mark emails that have a linked profile (account created)
      const profileEmails = new Set(profiles.map((p) => p.email).filter(Boolean));
      
      // Build conversations list
      const convos: Conversation[] = [];

      for (const profile of profiles) {
        const internalData = clientConvoMap.get(profile.id)!;
        
        // Check if there's also email history for this client
        const emailData = profile.email ? emailConvoMap.get(profile.email) : null;
        if (emailData) {
          emailConvoMap.delete(profile.email!); // Remove so it doesn't appear as separate
        }

        // Use most recent between internal and email
        let lastDate = internalData.lastDate;
        let lastContent = internalData.lastContent;
        if (emailData && new Date(emailData.lastDate) > new Date(lastDate)) {
          lastDate = emailData.lastDate;
          lastContent = emailData.lastContent;
        }

        convos.push({
          client: profile,
          lastMessageDate: lastDate,
          lastMessageContent: lastContent,
          unreadCount: internalData.unreadCount,
        });
      }

      // Add email-only conversations (prospects who haven't created an account)
      // These don't appear here since they're handled in AdminClients/contact requests
      // We only show unified conversations for users with accounts

      convos.sort(
        (a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
      );

      setConversations(convos);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnifiedMessages = async (client: Profile) => {
    if (!user) return;

    try {
      // Fetch internal messages
      const { data: internalMessages } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${client.id}),and(sender_id.eq.${client.id},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      // Fetch email history if client has an email
      let emailMessages: UnifiedMessage[] = [];
      if (client.email) {
        const { data: contactRequests } = await supabase
          .from("contact_requests")
          .select("id, message, created_at")
          .eq("email", client.email);

        if (contactRequests && contactRequests.length > 0) {
          const requestIds = contactRequests.map((cr) => cr.id);
          const { data: replies } = await supabase
            .from("contact_replies")
            .select("*")
            .in("contact_request_id", requestIds)
            .order("created_at", { ascending: true });

          for (const cr of contactRequests) {
            if (cr.message) {
              emailMessages.push({
                id: `cr-${cr.id}`,
                content: cr.message,
                created_at: cr.created_at,
                isOwn: false, // From client/prospect perspective, admin sees it as received
                source: "email",
              });
            }
          }

          if (replies) {
            for (const reply of replies) {
              emailMessages.push({
                id: `reply-${reply.id}`,
                content: reply.message,
                created_at: reply.created_at,
                isOwn: reply.sender === "admin",
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

      // Mark internal messages as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", client.id)
        .eq("receiver_id", user.id)
        .is("read_at", null);

      // Merge and sort
      const all = [...emailMessages, ...internalUnified].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setUnifiedMessages(all);
      fetchConversations();
    } catch (error) {
      console.error("Error fetching unified messages:", error);
    }
  };

  const handleSelectClient = (client: Profile) => {
    setSelectedClient(client);
    selectedClientRef.current = client;
    fetchUnifiedMessages(client);
    setChatDialogOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClient || !newMessage.trim()) return;

    setIsSending(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: selectedClient.id,
          content: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("email, notification_preferences")
        .eq("id", selectedClient.id)
        .single();

      const prefs = (clientProfile?.notification_preferences as any) || { email: true, push: true };

      if (clientProfile?.email && prefs.email) {
        sendEmail({
          type: "new_message",
          to: clientProfile.email,
          data: {
            clientName: selectedClient.name,
            messagePreview: newMessage.trim().substring(0, 100),
          },
        });
      }

      if (prefs.push) {
        try {
          await supabase.functions.invoke("send-push", {
            body: {
              userId: selectedClient.id,
              title: "Nouveau message de votre coach",
              body: newMessage.trim().substring(0, 100),
              url: "/espace-client?tab=messages",
            },
          });
        } catch (pushError) {
          console.error("Push notification error:", pushError);
        }
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
      fetchConversations();
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

  const handleCloseChat = () => {
    setChatDialogOpen(false);
    setSelectedClient(null);
    selectedClientRef.current = null;
  };

  const renderChatContent = () => (
    <>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {unifiedMessages.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <p className="text-muted-foreground">
              Aucun message. Démarrez la conversation !
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
                      ? "bg-secondary text-secondary-foreground rounded-br-md"
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
                      message.isOwn ? "text-secondary-foreground/70" : "text-muted-foreground"
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

      <form onSubmit={handleSendMessage} className="p-4 border-t border-border/50 bg-card">
        <div className="flex gap-2">
          <Textarea
            placeholder="Écrivez votre message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="min-h-[60px] resize-none border-border/50 focus:border-secondary"
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
            className="h-auto bg-secondary hover:bg-secondary/90 shadow-md"
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <>
      <Card className="border-secondary/20">
        <CardHeader className="bg-gradient-to-r from-secondary/5 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-secondary/10">
                <MessageSquare className="h-5 w-5 text-secondary" />
              </div>
              Conversations
            </CardTitle>
            <Button size="icon" variant="outline" onClick={() => setIsNewConvoOpen(true)} title="Nouveau message">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {conversations.length} client(s) — historique email et messagerie unifiés
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            {conversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/10 mb-4">
                  <MessageSquare className="h-6 w-6 text-secondary" />
                </div>
                <p className="text-muted-foreground">Aucune conversation</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {conversations.map((convo) => (
                  <button
                    key={convo.client.id}
                    onClick={() => handleSelectClient(convo.client)}
                    className="w-full p-4 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground">{convo.client.name}</span>
                      {convo.unreadCount > 0 && (
                        <Badge className="bg-secondary text-secondary-foreground text-xs">
                          {convo.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {convo.lastMessageContent}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(convo.lastMessageDate), "d MMM HH:mm", { locale: fr })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Dialog */}
      <Dialog open={chatDialogOpen} onOpenChange={(open) => { if (!open) handleCloseChat(); }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-2xl h-[80vh] max-h-[80vh] flex flex-col p-0 gap-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{selectedClient?.name}</h3>
              <p className="text-xs text-muted-foreground">{selectedClient?.email || selectedClient?.phone || ""}</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderChatContent()}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Conversation Dialog */}
      <Dialog open={isNewConvoOpen} onOpenChange={setIsNewConvoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedNewClient} onValueChange={setSelectedNewClient}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un client..." />
              </SelectTrigger>
              <SelectContent>
                {allClients
                  .filter((c) => c.id !== user?.id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.email ? `(${c.email})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={!selectedNewClient}
              onClick={() => {
                const client = allClients.find((c) => c.id === selectedNewClient);
                if (client) {
                  handleSelectClient(client);
                  setIsNewConvoOpen(false);
                  setSelectedNewClient("");
                }
              }}
            >
              Démarrer la conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
