import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, User, Plus } from "lucide-react";
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

interface Conversation {
  client: Profile;
  lastMessage: Message;
  unreadCount: number;
}

export function AdminMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNewConvoOpen, setIsNewConvoOpen] = useState(false);
  const [allClients, setAllClients] = useState<Profile[]>([]);
  const [selectedNewClient, setSelectedNewClient] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchAllClients();

      // Subscribe to new messages
      const channel = supabase
        .channel("admin-messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          () => {
            fetchConversations();
            if (selectedClient) {
              fetchMessages(selectedClient.id);
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
  }, [messages]);

  const fetchAllClients = async () => {
    const { data } = await supabase.from("profiles").select("*").order("name");
    setAllClients(data || []);
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Get all clients who have exchanged messages with admin
      const { data: allMessages } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!allMessages) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Group by client
      const clientIds = new Set<string>();
      allMessages.forEach((msg) => {
        const clientId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        clientIds.add(clientId);
      });

      // Fetch client profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", Array.from(clientIds));

      if (!profiles) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Build conversations
      const convos: Conversation[] = profiles.map((profile) => {
        const clientMessages = allMessages.filter(
          (msg) => msg.sender_id === profile.id || msg.receiver_id === profile.id
        );
        const lastMessage = clientMessages[0];
        const unreadCount = clientMessages.filter(
          (msg) => msg.receiver_id === user.id && !msg.read_at
        ).length;

        return {
          client: profile,
          lastMessage,
          unreadCount,
        };
      });

      // Sort by last message date
      convos.sort(
        (a, b) =>
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime()
      );

      setConversations(convos);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (clientId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${clientId}),and(sender_id.eq.${clientId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", clientId)
        .eq("receiver_id", user.id)
        .is("read_at", null);

      fetchConversations();
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSelectClient = (client: Profile) => {
    setSelectedClient(client);
    fetchMessages(client.id);
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

      // Get client email from the profile (we need to fetch it with email)
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", selectedClient.id)
        .single();

      if (clientProfile?.email) {
        sendEmail({
          type: "new_message",
          to: clientProfile.email,
          data: {
            clientName: selectedClient.name,
            messagePreview: newMessage.trim().substring(0, 100),
          },
        });
      }

      // Send push notification
      try {
        await supabase.functions.invoke('send-push', {
          body: {
            userId: selectedClient.id,
            title: 'Nouveau message de votre coach',
            body: newMessage.trim().substring(0, 100),
            url: '/espace-client?tab=messages',
          },
        });
      } catch (pushError) {
        console.error('Push notification error:', pushError);
      }

      setMessages((prev) => [...prev, data]);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3 h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1 border-secondary/20">
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
            {conversations.length} client(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[480px]">
            {conversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/10 mb-4">
                  <MessageSquare className="h-6 w-6 text-secondary" />
                </div>
                <p className="text-muted-foreground">
                  Aucune conversation
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {conversations.map((convo) => (
                  <button
                    key={convo.client.id}
                    onClick={() => handleSelectClient(convo.client)}
                    className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                      selectedClient?.id === convo.client.id ? "bg-secondary/10 border-l-2 border-secondary" : ""
                    }`}
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
                      {convo.lastMessage.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(convo.lastMessage.created_at), "d MMM HH:mm", { locale: fr })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2 flex flex-col border-primary/20">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          {selectedClient ? (
            <>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                {selectedClient.name}
              </CardTitle>
              <CardDescription>
                {selectedClient.phone || "Pas de téléphone"}
              </CardDescription>
            </>
          ) : (
            <CardTitle className="text-muted-foreground">
              Sélectionnez une conversation
            </CardTitle>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {!selectedClient ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Cliquez sur un client pour voir la conversation
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
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
                    {messages.map((message) => {
                      const isOwn = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                              isOwn
                                ? "bg-secondary text-secondary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwn ? "text-secondary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {format(new Date(message.created_at), "d MMM HH:mm", { locale: fr })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
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
          )}
        </CardContent>
      </Card>
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
    </div>
  );
}
