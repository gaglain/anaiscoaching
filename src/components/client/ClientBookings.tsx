import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Loader2, CalendarClock, History, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { notifyAdmin, getSessionTypeLabel } from "@/lib/emails";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings">;

export function ClientBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("client_id", user.id)
        .order("session_date", { ascending: false });
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
      if (error) throw error;
      toast({ title: "Réservation annulée" });
      fetchBookings();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime || !user) return;
    setIsRescheduling(true);

    try {
      const newDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
      
      // Cancel old booking
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", rescheduleBooking.id);
      
      // Create new booking with same details
      const { error } = await supabase.from("bookings").insert({
        client_id: user.id,
        session_date: newDateTime.toISOString(),
        session_type: rescheduleBooking.session_type,
        goals: rescheduleBooking.goals,
        notes: `Reprogrammée depuis le ${format(new Date(rescheduleBooking.session_date), "d MMM yyyy HH:mm", { locale: fr })}`,
        status: "pending",
      });
      if (error) throw error;

      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
      const clientName = profile?.name || "Client";
      const formattedDate = format(newDateTime, "EEEE d MMMM yyyy", { locale: fr });
      const formattedTime = format(newDateTime, "HH:mm", { locale: fr });

      notifyAdmin({
        type: "new_booking",
        data: { clientName, clientEmail: user.email || "", sessionDate: formattedDate, sessionTime: formattedTime, sessionType: getSessionTypeLabel(rescheduleBooking.session_type), goals: `Reprogrammation — ${rescheduleBooking.goals || ""}` },
      });

      toast({ title: "Séance reprogrammée", description: "Une nouvelle demande a été envoyée pour validation." });
      setRescheduleBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsRescheduling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <Badge className="bg-primary/10 text-primary border-primary/20">Confirmé</Badge>;
      case "pending": return <Badge className="bg-secondary/10 text-secondary border-secondary/20">En attente</Badge>;
      case "cancelled": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Annulé</Badge>;
      default: return null;
    }
  };

  const upcomingBookings = bookings.filter(b => new Date(b.session_date) >= new Date() && b.status !== "cancelled");
  const pastBookings = bookings.filter(b => new Date(b.session_date) < new Date() || b.status === "cancelled");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const displayedHistory = showAllHistory ? pastBookings : pastBookings.slice(0, 10);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-heading font-semibold text-foreground">Mes séances</h2>
          <p className="text-muted-foreground">Retrouvez vos séances planifiées par Anaïs</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            // Navigate to messages tab
            const params = new URLSearchParams(window.location.search);
            params.set("tab", "messages");
            window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
            window.dispatchEvent(new Event("popstate"));
          }}
        >
          <MessageCircle className="h-4 w-4" />
          Contacter Anaïs
        </Button>
      </div>

      {/* Upcoming Bookings */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
            Séances à venir ({upcomingBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <p className="text-muted-foreground">Aucune séance à venir. Contactez Anaïs pour planifier votre prochaine séance !</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {format(new Date(booking.session_date), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      à {format(new Date(booking.session_date), "HH:mm", { locale: fr })} • {getSessionTypeLabel(booking.session_type)}
                    </p>
                    {booking.goals && <p className="text-sm text-muted-foreground">Objectif : {booking.goals}</p>}
                  </div>
                  <div className="flex items-center gap-2 mt-3 sm:mt-0 flex-wrap">
                    {getStatusBadge(booking.status)}
                    {booking.status === "confirmed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRescheduleBooking(booking);
                          setRescheduleDate("");
                          setRescheduleTime("");
                        }}
                        className="border-secondary/30 hover:bg-secondary/5"
                      >
                        <CalendarClock className="h-4 w-4 mr-1" />
                        Reprogrammer
                      </Button>
                    )}
                    {booking.status === "pending" && (
                      <Button variant="outline" size="sm" onClick={() => handleCancelBooking(booking.id)} className="border-destructive/30 text-destructive hover:bg-destructive/5">
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {pastBookings.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Historique complet ({pastBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayedHistory.map((booking) => (
                <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/30">
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground">
                      {format(new Date(booking.session_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                    <p className="text-sm text-muted-foreground">{getSessionTypeLabel(booking.session_type)}</p>
                    {booking.goals && <p className="text-xs text-muted-foreground">Objectif : {booking.goals}</p>}
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              ))}
            </div>
            {pastBookings.length > 10 && !showAllHistory && (
              <Button variant="ghost" className="w-full mt-4" onClick={() => setShowAllHistory(true)}>
                Voir tout l'historique ({pastBookings.length} séances)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleBooking} onOpenChange={(open) => !open && setRescheduleBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-secondary" />
              Reprogrammer la séance
            </DialogTitle>
            <DialogDescription>
              {rescheduleBooking && (
                <>Séance actuelle : {format(new Date(rescheduleBooking.session_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nouvelle date</Label>
                <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-2">
                <Label>Nouvelle heure</Label>
                <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              L'ancienne séance sera annulée et une nouvelle demande sera envoyée pour validation.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleBooking(null)}>Annuler</Button>
            <Button onClick={handleReschedule} disabled={isRescheduling || !rescheduleDate || !rescheduleTime}>
              {isRescheduling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarClock className="h-4 w-4 mr-2" />}
              Reprogrammer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
