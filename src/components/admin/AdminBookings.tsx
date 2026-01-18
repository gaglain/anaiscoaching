import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Check, X, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { sendEmail, getSessionTypeLabel } from "@/lib/emails";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings"> & {
  profiles?: { name: string; phone: string | null; email: string | null } | null;
};

export function AdminBookings() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchBookings();
  }, []);

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
PRODID:-//AD Coach//Booking//FR
BEGIN:VEVENT
UID:${booking.id}@adcoach.fr
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
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Confirmé</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">En attente</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Annulé</Badge>;
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Gestion des réservations</h2>
          <p className="text-muted-foreground">Validez et gérez les demandes de séance</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="confirmed">Confirmés</SelectItem>
            <SelectItem value="cancelled">Annulés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Séances à venir ({upcomingBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune séance à venir avec ce filtre
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-lg border ${
                    booking.status === "pending"
                      ? "border-yellow-500/30 bg-yellow-500/5"
                      : "border-border"
                  }`}
                >
                  <div className="space-y-1 mb-4 lg:mb-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
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
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Confirmer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateBookingStatus(booking.id, "cancelled")}
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
                        >
                          <Download className="h-4 w-4 mr-1" />
                          .ics
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateBookingStatus(booking.id, "cancelled")}
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
        <Card>
          <CardHeader>
            <CardTitle>Historique ({pastBookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastBookings.slice(0, 20).map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
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
    </div>
  );
}
