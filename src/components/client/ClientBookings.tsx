import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings">;

export function ClientBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
      
      const { error } = await supabase
        .from("bookings")
        .insert({
          client_id: user.id,
          session_date: sessionDateTime.toISOString(),
          session_type: sessionType,
          goals: goals || null,
          notes: notes || null,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Demande envoyée !",
        description: "Votre demande de réservation a été envoyée. Anaïs vous confirmera rapidement.",
      });

      // Reset form
      setSessionDate("");
      setSessionTime("");
      setSessionType("individual");
      setGoals("");
      setNotes("");
      setIsDialogOpen(false);
      
      // Refresh bookings
      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la demande de réservation.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Réservation annulée",
        description: "Votre réservation a été annulée.",
      });

      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'annuler la réservation.",
        variant: "destructive",
      });
    }
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

  const upcomingBookings = bookings.filter(
    (b) => new Date(b.session_date) >= new Date() && b.status !== "cancelled"
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.session_date) < new Date() || b.status === "cancelled"
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
      {/* New Booking Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Mes réservations</h2>
          <p className="text-muted-foreground">Gérez vos séances de coaching</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle réservation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Demander une séance</DialogTitle>
              <DialogDescription>
                Remplissez le formulaire pour demander une nouvelle séance avec Anaïs.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date souhaitée</Label>
                    <Input
                      id="date"
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Heure</Label>
                    <Input
                      id="time"
                      type="time"
                      value={sessionTime}
                      onChange={(e) => setSessionTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type de séance</Label>
                  <Select value={sessionType} onValueChange={setSessionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Séance individuelle</SelectItem>
                      <SelectItem value="duo">Séance duo</SelectItem>
                      <SelectItem value="group">Séance en groupe</SelectItem>
                      <SelectItem value="outdoor">Séance en extérieur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goals">Objectif de la séance</Label>
                  <Input
                    id="goals"
                    placeholder="Ex: Renforcement musculaire, cardio..."
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Message pour Anaïs (optionnel)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Informations complémentaires, contraintes horaires..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    "Envoyer la demande"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Séances à venir
          </CardTitle>
          <CardDescription>
            Vos prochaines séances planifiées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune séance à venir. Réservez votre prochaine séance !
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {format(new Date(booking.session_date), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      à {format(new Date(booking.session_date), "HH:mm", { locale: fr })} • {booking.session_type === "individual" ? "Séance individuelle" : booking.session_type === "duo" ? "Séance duo" : booking.session_type === "group" ? "Séance en groupe" : "Séance en extérieur"}
                    </p>
                    {booking.goals && (
                      <p className="text-sm text-muted-foreground">
                        Objectif : {booking.goals}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3 sm:mt-0">
                    {getStatusBadge(booking.status)}
                    {booking.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
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

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
            <CardDescription>
              Vos séances passées et annulées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastBookings.slice(0, 10).map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground">
                      {format(new Date(booking.session_date), "d MMMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.session_type === "individual" ? "Séance individuelle" : booking.session_type === "duo" ? "Séance duo" : booking.session_type === "group" ? "Séance en groupe" : "Séance en extérieur"}
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
