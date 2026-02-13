import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Check, X, Loader2, Download, FileSpreadsheet, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { sendEmail, getSessionTypeLabel } from "@/lib/emails";
import { exportBookingsToCSV, type ExportBooking } from "@/lib/exportCsv";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings"> & {
  profiles?: { name: string; phone: string | null; email: string | null } | null;
};

export function AdminBookings() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  // Manual booking dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createClientId, setCreateClientId] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createTime, setCreateTime] = useState("10:00");
  const [createType, setCreateType] = useState("individual");
  const [createGoals, setCreateGoals] = useState("");
  const [createStatus, setCreateStatus] = useState<"pending" | "confirmed">("confirmed");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from("profiles").select("id, name").order("name");
    setClients(data || []);
  };

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, profiles(name, phone, email)")
        .order("session_date", { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: "confirmed" | "cancelled") => {
    try {
      // Get the booking details first
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) throw new Error("Booking not found");

      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", bookingId);

      if (error) throw error;

      // Get client email from profiles join
      const clientEmail = booking.profiles?.email;

      if (clientEmail) {
        const sessionDate = new Date(booking.session_date);
        const formattedDate = format(sessionDate, "EEEE d MMMM yyyy", { locale: fr });
        const formattedTime = format(sessionDate, "HH:mm", { locale: fr });

        // Send email to client based on status
        sendEmail({
          type: status === "confirmed" ? "booking_confirmed" : "booking_cancelled",
          to: clientEmail,
          data: {
            clientName: booking.profiles?.name || "Client",
            sessionDate: formattedDate,
            sessionTime: formattedTime,
            sessionType: getSessionTypeLabel(booking.session_type),
          },
        });
      }

      // Send push notification to client
      try {
        const sessionDate = new Date(booking.session_date);
        const formattedDate = format(sessionDate, "d MMM yyyy", { locale: fr });
        const formattedTime = format(sessionDate, "HH:mm", { locale: fr });
        await supabase.functions.invoke("send-push", {
          body: {
            userId: booking.client_id,
            title: status === "confirmed" ? "✅ Séance confirmée" : "❌ Séance annulée",
            body: `${getSessionTypeLabel(booking.session_type)} — ${formattedDate} à ${formattedTime}`,
            url: "/espace-client?tab=bookings",
          },
        });
      } catch (pushError) {
        console.error("Push notification error:", pushError);
      }

      toast({
        title: status === "confirmed" ? "Réservation confirmée" : "Réservation annulée",
        description: "Le statut a été mis à jour et le client notifié par email.",
      });

      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    }
  };

  const generateICS = (booking: Booking) => {
    const startDate = new Date(booking.session_date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour session

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Anaïs Dubois Coach//Booking//FR
BEGIN:VEVENT
UID:${booking.id}@coachsportif-rennes.fr
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Séance coaching - ${booking.profiles?.name || "Client"}
DESCRIPTION:Type: ${booking.session_type}${booking.goals ? `\\nObjectif: ${booking.goals}` : ""}${booking.notes ? `\\nNotes: ${booking.notes}` : ""}
LOCATION:Rennes
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `seance-${format(startDate, "yyyy-MM-dd-HHmm")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Fichier ICS téléchargé",
      description: "Ouvrez-le pour l'ajouter à votre calendrier Outlook.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Confirmé</Badge>;
      case "pending":
        return <Badge className="bg-secondary/10 text-secondary border-secondary/20">En attente</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Annulé</Badge>;
      default:
        return null;
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "all") return true;
    return booking.status === filter;
  });

  const upcomingBookings = filteredBookings.filter(
    (b) => new Date(b.session_date) >= new Date()
  );
  const pastBookings = filteredBookings.filter(
    (b) => new Date(b.session_date) < new Date()
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  const handleExportCSV = () => {
    const exportData: ExportBooking[] = bookings.map((booking) => ({
      clientName: booking.profiles?.name || "Client inconnu",
      clientEmail: booking.profiles?.email || null,
      clientPhone: booking.profiles?.phone || null,
      session_date: booking.session_date,
      session_type: booking.session_type,
      status: booking.status,
      goals: booking.goals,
      notes: booking.notes,
    }));

    exportBookingsToCSV(exportData);

    toast({
      title: "Export réussi",
      description: `${bookings.length} réservation(s) exportée(s) en CSV.`,
    });
  };

  const handleCreateBooking = async () => {
    if (!createClientId || !createDate || !createTime) return;
    setIsCreating(true);
    try {
      const sessionDate = new Date(`${createDate}T${createTime}:00`);
      const { error } = await supabase.from("bookings").insert({
        client_id: createClientId,
        session_date: sessionDate.toISOString(),
        session_type: createType,
        goals: createGoals || null,
        status: createStatus,
      });
      if (error) throw error;

      toast({ title: "Réservation créée", description: "La séance a été ajoutée avec succès." });
      setIsCreateOpen(false);
      setCreateClientId(""); setCreateDate(""); setCreateTime("10:00"); setCreateType("individual"); setCreateGoals(""); setCreateStatus("confirmed");
      fetchBookings();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-semibold text-foreground">Gestion des réservations</h2>
          <p className="text-muted-foreground">Validez et gérez les demandes de séance</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px] border-border focus:border-secondary">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="confirmed">Confirmés</SelectItem>
              <SelectItem value="cancelled">Annulés</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-secondary/30 hover:bg-secondary/5 shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nouvelle séance</span>
          </Button>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <Card className="border-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Calendar className="h-5 w-5 text-secondary" />
            </div>
            Séances à venir ({upcomingBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/10 mb-4">
                <Calendar className="h-6 w-6 text-secondary" />
              </div>
              <p className="text-muted-foreground">
                Aucune séance à venir avec ce filtre
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-lg border transition-colors ${
                    booking.status === "pending"
                      ? "border-secondary/30 bg-secondary/5 hover:bg-secondary/10"
                      : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  <div className="space-y-1 mb-4 lg:mb-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {booking.profiles?.name || "Client inconnu"}
                      </p>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.session_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.session_type === "individual" ? "Séance individuelle" : booking.session_type === "duo" ? "Séance duo" : booking.session_type === "group" ? "Séance en groupe" : "Séance en extérieur"}
                      {booking.goals && ` • ${booking.goals}`}
                    </p>
                    {booking.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        "{booking.notes}"
                      </p>
                    )}
                    {booking.profiles?.phone && (
                      <p className="text-sm text-muted-foreground">
                        📱 {booking.profiles.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {booking.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateBookingStatus(booking.id, "confirmed")}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Confirmer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateBookingStatus(booking.id, "cancelled")}
                          className="border-destructive/30 text-destructive hover:bg-destructive/5"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Refuser
                        </Button>
                      </>
                    )}
                    {booking.status === "confirmed" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateICS(booking)}
                          className="border-secondary/30 hover:bg-secondary/5"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          .ics
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateBookingStatus(booking.id, "cancelled")}
                          className="text-destructive hover:bg-destructive/5"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Annuler
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Historique ({pastBookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastBookings.slice(0, 20).map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border/30 bg-muted/30"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {booking.profiles?.name || "Client inconnu"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.session_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Booking Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-secondary" />
              Nouvelle réservation
            </DialogTitle>
            <DialogDescription>Créez manuellement une séance et attribuez-la à un client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={createClientId} onValueChange={setCreateClientId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={createDate} onChange={(e) => setCreateDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Heure</Label>
                <Input type="time" value={createTime} onChange={(e) => setCreateTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type de séance</Label>
              <Select value={createType} onValueChange={setCreateType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Séance individuelle</SelectItem>
                  <SelectItem value="duo">Séance duo</SelectItem>
                  <SelectItem value="group">Séance en groupe</SelectItem>
                  <SelectItem value="outdoor">Séance en extérieur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={createStatus} onValueChange={(v) => setCreateStatus(v as "pending" | "confirmed")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmée</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Objectif (optionnel)</Label>
              <Textarea value={createGoals} onChange={(e) => setCreateGoals(e.target.value)} placeholder="Objectif de la séance..." className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateBooking} disabled={!createClientId || !createDate || isCreating} className="w-full">
              {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Créer la réservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
