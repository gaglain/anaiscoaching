import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Loader2, CalendarClock, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { sendEmail, notifyAdmin, getSessionTypeLabel } from "@/lib/emails";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings">;

export function ClientBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Form state
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [sessionType, setSessionType] = useState("individual");
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
      const { error } = await supabase.from("bookings").insert({
        client_id: user.id,
        session_date: sessionDateTime.toISOString(),
        session_type: sessionType,
        goals: goals || null,
        notes: notes || null,
        status: "pending",
      });
      if (error) throw error;

      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
      const clientName = profile?.name || "Client";
      const formattedDate = format(sessionDateTime, "EEEE d MMMM yyyy", { locale: fr });
      const formattedTime = format(sessionDateTime, "HH:mm", { locale: fr });

      sendEmail({
        type: "booking_confirmation",
        to: user.email || "",
        data: { clientName, sessionDate: formattedDate, sessionTime: formattedTime, sessionType: getSessionTypeLabel(sessionType) },
      });

      notifyAdmin({
        type: "new_booking",
        data: { clientName, clientEmail: user.email || "", sessionDate: formattedDate, sessionTime: formattedTime, sessionType: getSessionTypeLabel(sessionType), goals: goals || undefined },
      });

      try {
        const { data: adminRole } = await supabase.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
        if (adminRole) {
          await supabase.functions.invoke("send-push", {
            body: { userId: adminRole.user_id, title: `Nouvelle réservation de ${clientName}`, body: `${getSessionTypeLabel(sessionType)} — ${formattedDate} à ${formattedTime}`, url: "/admin?tab=bookings" },
          });
        }
      } catch {}

      toast({ title: "Demande envoyée !", description: "Votre demande a été envoyée. Anaïs vous confirmera rapidement." });
      setSessionDate(""); setSessionTime(""); setSessionType("individual"); setGoals(""); setNotes("");
      setIsDialogOpen(false);
      fetchBookings();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
  const displayedHistory = showAllHistory ? pastBookings : pastBookings.slice(0, 10);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-heading font-semibold text-foreground">Mes réservations</h2>
          <p className="text-muted-foreground">Gérez vos séances de coaching</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle réservation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-heading">Demander une séance</DialogTitle>
              <DialogDescription>Remplissez le formulaire pour demander une nouvelle séance.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date souhaitée</Label>
                    <Input id="date" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} min={new Date().toISOString().split("T")[0]} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Heure</Label>
                    <Input id="time" type="time" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Type de séance</Label>
                  <Select value={sessionType} onValueChange={setSessionType}>
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
                  <Label>Objectif</Label>
                  <Input placeholder="Ex: Renforcement musculaire, cardio..." value={goals} onChange={(e) => setGoals(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Message (optionnel)</Label>
                  <Textarea placeholder="Informations complémentaires..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi...</> : "Envoyer la demande"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
              <p className="text-muted-foreground">Aucune séance à venir. Réservez votre prochaine séance !</p>
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
