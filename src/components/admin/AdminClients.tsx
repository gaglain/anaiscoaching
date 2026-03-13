import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Loader2, Calendar, FileText, Download, Edit2, Phone, Target, TrendingUp, Tag, X, Plus, Trash2, Mail, CheckCircle, Clock, Reply, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { exportClientsToCSV, type ExportClient } from "@/lib/exportCsv";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type ContactRequest = Tables<"contact_requests">;

interface ClientWithStats extends Profile {
  bookingsCount: number;
  lastBooking: string | null;
  completedSessions: number;
}

export function AdminClients() {
  const { toast } = useToast();
  const { categories: clientCategories } = useCategories("client");
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; client: ClientWithStats | null }>({ open: false, client: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit fields
  const [editLevel, setEditLevel] = useState<string>("");
  const [editGoals, setEditGoals] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Contact requests
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; contact: ContactRequest | null }>({ open: false, contact: null });
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyHistory, setReplyHistory] = useState<{ id: string; message: string; created_at: string }[]>([]);

  useEffect(() => {
    fetchClients();
    fetchContactRequests();
  }, []);

  const fetchContactRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setContactRequests(data || []);
    } catch (error) {
      console.error("Error fetching contact requests:", error);
    }
  };

  const markContactAsRead = async (id: string) => {
    await supabase.from("contact_requests").update({ read: true }).eq("id", id);
    fetchContactRequests();
  };

  const openReplyDialog = (contact: ContactRequest) => {
    setReplyDialog({ open: true, contact });
    setReplyMessage("");
  };

  const sendReply = async () => {
    if (!replyDialog.contact || !replyMessage.trim()) return;
    setIsSendingReply(true);
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "contact_reply",
          to: replyDialog.contact.email,
          data: {
            clientName: replyDialog.contact.name,
            replyMessage: replyMessage.trim(),
          },
        },
      });
      if (error) throw error;

      // Mark as read after replying
      await supabase.from("contact_requests").update({ read: true }).eq("id", replyDialog.contact.id);
      fetchContactRequests();

      toast({
        title: "Réponse envoyée",
        description: `Email envoyé à ${replyDialog.contact.email}`,
      });
      setReplyDialog({ open: false, contact: null });
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const clientsWithStats: ClientWithStats[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("client_id", profile.id);

          const { count: completedCount } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("client_id", profile.id)
            .eq("status", "confirmed")
            .lt("session_date", new Date().toISOString());

          const { data: lastBookingData } = await supabase
            .from("bookings")
            .select("session_date")
            .eq("client_id", profile.id)
            .eq("status", "confirmed")
            .order("session_date", { ascending: false })
            .limit(1);

          return {
            ...profile,
            bookingsCount: count || 0,
            completedSessions: completedCount || 0,
            lastBooking: lastBookingData?.[0]?.session_date || null,
          };
        })
      );

      setClients(clientsWithStats);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openClientDialog = (client: ClientWithStats) => {
    setSelectedClient(client);
    setEditLevel(client.level || "beginner");
    setEditGoals(client.goals || "");
    setEditPhone(client.phone || "");
    setEditTags((client as any).tags || []);
    setNewTag("");
    setIsDialogOpen(true);
  };

  const saveClientDetails = async () => {
    if (!selectedClient) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          level: editLevel,
          goals: editGoals,
          phone: editPhone,
          tags: editTags,
        } as any)
        .eq("id", selectedClient.id);

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Les informations du client ont été sauvegardées.",
      });

      fetchClients();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClient = async () => {
    const target = deleteDialog.client;
    if (!target) return;
    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "delete", user_id: target.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Client supprimé", description: `${target.name} a été supprimé.` });
      setDeleteDialog({ open: false, client: null });
      setIsDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const exportData: ExportClient[] = clients.map((client) => ({
      name: client.name,
      email: client.email,
      phone: client.phone,
      level: client.level,
      goals: client.goals,
      created_at: client.created_at,
      bookingsCount: client.bookingsCount,
      lastBooking: client.lastBooking,
    }));

    exportClientsToCSV(exportData);

    toast({
      title: "Export réussi",
      description: `${clients.length} client(s) exporté(s) en CSV.`,
    });
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = filterTag === "all" || ((client as any).tags || []).includes(filterTag);
    return matchesSearch && matchesTag;
  });

  const getLevelBadge = (level: string | null) => {
    switch (level) {
      case "beginner":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Débutant</Badge>;
      case "intermediate":
        return <Badge className="bg-secondary/10 text-secondary border-secondary/20">Intermédiaire</Badge>;
      case "advanced":
        return <Badge className="bg-accent text-accent-foreground border-accent/20">Avancé</Badge>;
      default:
        return <Badge variant="outline" className="border-border">Non défini</Badge>;
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
    <div className="space-y-6">
      {/* Header with Search and Export */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-semibold text-foreground">Liste des clients</h2>
          <p className="text-muted-foreground">{clients.length} client(s) inscrit(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-border focus:border-secondary"
            />
          </div>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {clientCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-secondary/30 hover:bg-secondary/5 shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </Button>
        </div>
      </div>

      {/* Contact Requests */}
      {contactRequests.length > 0 && (
        <Card className="border-secondary/30 bg-secondary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Mail className="h-5 w-5 text-secondary" />
                Demandes de contact
                {contactRequests.filter(c => !c.read).length > 0 && (
                  <Badge className="bg-destructive text-destructive-foreground text-xs">
                    {contactRequests.filter(c => !c.read).length} nouvelle(s)
                  </Badge>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {contactRequests.map((cr) => (
              <div
                key={cr.id}
                className={`flex items-start justify-between gap-4 p-3 rounded-lg border transition-colors ${
                  !cr.read ? "bg-accent/20 border-secondary/30" : "bg-card border-border/50"
                }`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!cr.read ? "font-semibold text-foreground" : "text-foreground"}`}>
                      {cr.name}
                    </p>
                    {!cr.read && (
                      <Badge variant="outline" className="text-[10px] border-secondary/40 text-secondary">Nouveau</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{cr.email}{cr.phone ? ` · ${cr.phone}` : ""}</p>
                  {cr.session_type && (
                    <p className="text-xs text-muted-foreground">Type : {cr.session_type}</p>
                  )}
                  {cr.goal && (
                    <p className="text-xs text-muted-foreground">Objectif : {cr.goal}</p>
                  )}
                  {cr.message && (
                    <p className="text-xs text-muted-foreground mt-1 italic">"{cr.message}"</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(cr.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openReplyDialog(cr)}
                    className="text-secondary hover:text-secondary hover:bg-secondary/10"
                  >
                    <Reply className="h-4 w-4 mr-1" />
                    Répondre
                  </Button>
                  {!cr.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markContactAsRead(cr.id)}
                      className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Lu
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-4">
              <Users className="h-8 w-8 text-secondary" />
            </div>
            <p className="text-muted-foreground">
              {searchQuery ? "Aucun client trouvé" : "Aucun client inscrit"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              onClick={() => openClientDialog(client)}
              className="border-border/50 hover:border-secondary/30 hover:shadow-md transition-all cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-heading">{client.name}</CardTitle>
                    <CardDescription>
                      Inscrit le {format(new Date(client.created_at), "d MMMM yyyy", { locale: fr })}
                    </CardDescription>
                  </div>
                  {getLevelBadge(client.level)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {client.phone && (
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground">{client.phone}</span>
                  </p>
                )}
                {client.goals && (
                  <p className="text-sm flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground truncate">{client.goals}</span>
                  </p>
                )}
                {(client as any).tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(client as any).tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs border-secondary/30 text-secondary">
                        <Tag className="h-2.5 w-2.5 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="p-1 rounded bg-primary/10">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-muted-foreground">{client.completedSessions} effectuée(s)</span>
                  </div>
                  {client.lastBooking && (
                    <div className="text-sm text-muted-foreground">
                      Dernière: {format(new Date(client.lastBooking), "d MMM", { locale: fr })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Client Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedClient?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedClient && `Inscrit le ${format(new Date(selectedClient.created_at), "d MMMM yyyy", { locale: fr })}`}
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{selectedClient.completedSessions}</div>
                    <div className="text-xs text-muted-foreground">Séances effectuées</div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-secondary">{selectedClient.bookingsCount}</div>
                    <div className="text-xs text-muted-foreground">Total réservations</div>
                  </CardContent>
                </Card>
              </div>

              {/* Email (read-only) */}
              {selectedClient.email && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="text-sm">{selectedClient.email}</p>
                </div>
              )}

              {/* Editable fields */}
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="06 XX XX XX XX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Niveau</Label>
                <Select value={editLevel} onValueChange={setEditLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Débutant</SelectItem>
                    <SelectItem value="intermediate">Intermédiaire</SelectItem>
                    <SelectItem value="advanced">Avancé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Objectifs & Notes</Label>
                <Textarea
                  id="goals"
                  value={editGoals}
                  onChange={(e) => setEditGoals(e.target.value)}
                  placeholder="Objectifs du client, notes de suivi..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Catégories / Tags</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setEditTags(editTags.filter((t) => t !== tag))}
                        className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {/* Quick-add from predefined categories */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {clientCategories
                    .filter((cat) => !editTags.includes(cat.name))
                    .map((cat) => (
                      <Badge
                        key={cat.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary/10 text-xs"
                        onClick={() => setEditTags([...editTags, cat.name])}
                      >
                        <Plus className="h-2.5 w-2.5 mr-0.5" />
                        {cat.name}
                      </Badge>
                    ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Ajouter un tag personnalisé..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = newTag.trim();
                        if (trimmed && !editTags.includes(trimmed)) {
                          setEditTags([...editTags, trimmed]);
                          setNewTag("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      const trimmed = newTag.trim();
                      if (trimmed && !editTags.includes(trimmed)) {
                        setEditTags([...editTags, trimmed]);
                        setNewTag("");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDeleteDialog({ open: true, client: selectedClient }); }}
              className="border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
            <Button
              onClick={saveClientDetails}
              disabled={isUpdating}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete client dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le client</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteDialog.client?.name}</strong> ? Cette action est irréversible. Toutes ses données (réservations, messages, documents) seront supprimées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, client: null })}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteClient} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialog.open} onOpenChange={(open) => !open && setReplyDialog({ open: false, contact: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Répondre à {replyDialog.contact?.name}</DialogTitle>
            <DialogDescription>
              Un email sera envoyé à {replyDialog.contact?.email}
            </DialogDescription>
          </DialogHeader>
          {replyDialog.contact && (
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                {replyDialog.contact.session_type && (
                  <p className="text-muted-foreground">Type : {replyDialog.contact.session_type}</p>
                )}
                {replyDialog.contact.goal && (
                  <p className="text-muted-foreground">Objectif : {replyDialog.contact.goal}</p>
                )}
                {replyDialog.contact.message && (
                  <p className="text-muted-foreground italic">"{replyDialog.contact.message}"</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Votre réponse</Label>
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Écrivez votre réponse..."
                  rows={5}
                  className="border-border focus:border-secondary"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog({ open: false, contact: null })}>
              Annuler
            </Button>
            <Button
              onClick={sendReply}
              disabled={isSendingReply || !replyMessage.trim()}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              {isSendingReply ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
