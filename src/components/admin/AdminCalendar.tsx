import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, Check, X, Clock, User, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, setHours, setMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { sendEmail, getSessionTypeLabel } from "@/lib/emails";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings"> & {
  profiles?: { name: string; phone: string | null; email: string | null } | null;
};

export function AdminCalendar() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Quick booking state
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);
  const [quickBookDate, setQuickBookDate] = useState<Date | null>(null);
  const [quickBookTime, setQuickBookTime] = useState("09:00");
  const [quickBookClient, setQuickBookClient] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchBookings();
    fetchClients();
  }, [currentMonth]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .order("name");
    setClients(data || []);
  };

  const fetchBookings = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, profiles(name, phone, email)")
        .gte("session_date", start.toISOString())
        .lte("session_date", end.toISOString())
        .order("session_date", { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: fr });
  const calendarEnd = endOfWeek(monthEnd, { locale: fr });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking) =>
      isSameDay(new Date(booking.session_date), date)
    );
  };

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-primary";
      case "pending":
        return "bg-secondary";
      case "cancelled":
        return "bg-destructive/60";
      default:
        return "bg-muted-foreground";
    }
  };

  const openBookingDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditNotes(booking.notes || "");
    setIsDialogOpen(true);
  };

  const updateBookingStatus = async (status: "confirmed" | "cancelled") => {
    if (!selectedBooking) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", selectedBooking.id);

      if (error) throw error;

      const clientEmail = selectedBooking.profiles?.email;
      if (clientEmail) {
        const sessionDate = new Date(selectedBooking.session_date);
        sendEmail({
          type: status === "confirmed" ? "booking_confirmed" : "booking_cancelled",
          to: clientEmail,
          data: {
            clientName: selectedBooking.profiles?.name || "Client",
            sessionDate: format(sessionDate, "EEEE d MMMM yyyy", { locale: fr }),
            sessionTime: format(sessionDate, "HH:mm", { locale: fr }),
            sessionType: getSessionTypeLabel(selectedBooking.session_type),
          },
        });
      }

      toast({
        title: status === "confirmed" ? "Séance confirmée" : "Séance annulée",
        description: "Le client a été notifié par email.",
      });

      fetchBookings();
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

  const saveNotes = async () => {
    if (!selectedBooking) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ notes: editNotes })
        .eq("id", selectedBooking.id);

      if (error) throw error;

      toast({
        title: "Notes sauvegardées",
        description: "Les notes ont été mises à jour.",
      });

      fetchBookings();
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

  const generateICS = (booking: Booking) => {
    const startDate = new Date(booking.session_date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

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
  };

  const openQuickBook = (date: Date) => {
    setQuickBookDate(date);
    setQuickBookTime("09:00");
    setQuickBookClient("");
    setIsQuickBookOpen(true);
  };

  const createQuickBooking = async () => {
    if (!quickBookDate || !quickBookClient) return;
    setIsUpdating(true);

    try {
      const [hours, minutes] = quickBookTime.split(":").map(Number);
      const sessionDate = setMinutes(setHours(quickBookDate, hours), minutes);

      const { error } = await supabase
        .from("bookings")
        .insert({
          client_id: quickBookClient,
          session_date: sessionDate.toISOString(),
          session_type: "individual",
          status: "confirmed",
        });

      if (error) throw error;

      toast({
        title: "Séance créée",
        description: "La séance a été ajoutée au calendrier.",
      });

      fetchBookings();
      setIsQuickBookOpen(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-heading font-semibold text-foreground">Calendrier des séances</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2 border-secondary/20">
          <CardHeader className="bg-gradient-to-r from-secondary/5 to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 capitalize">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <CalendarDays className="h-5 w-5 text-secondary" />
                </div>
                {format(currentMonth, "MMMM yyyy", { locale: fr })}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="border-secondary/30 hover:bg-secondary/5"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="border-secondary/30 hover:bg-secondary/5"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dayBookings = getBookingsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const hasPending = dayBookings.some(b => b.status === "pending");

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    onDoubleClick={() => openQuickBook(day)}
                    className={`
                      min-h-[80px] p-2 rounded-lg border text-left transition-all relative
                      ${isCurrentMonth ? "bg-card" : "bg-muted/30 text-muted-foreground"}
                      ${isSelected ? "ring-2 ring-secondary border-secondary shadow-md" : "border-border/50"}
                      ${isToday ? "bg-primary/5 border-primary/30" : ""}
                      ${hasPending ? "ring-1 ring-secondary/50" : ""}
                      hover:border-secondary/50 hover:shadow-sm
                    `}
                  >
                    <div className={`text-sm font-semibold mb-1 ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <div
                          key={booking.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openBookingDialog(booking);
                          }}
                          className={`text-xs px-1.5 py-0.5 rounded truncate text-white font-medium cursor-pointer hover:opacity-80 ${getStatusColor(booking.status)}`}
                        >
                          {format(new Date(booking.session_date), "HH:mm")} {booking.profiles?.name?.split(" ")[0]}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-muted-foreground font-medium">
                          +{dayBookings.length - 3}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              💡 Double-cliquez sur un jour pour créer une séance rapide
            </p>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card className="border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="capitalize">
              {selectedDate
                ? format(selectedDate, "EEEE d MMMM", { locale: fr })
                : "Sélectionnez un jour"}
            </CardTitle>
            <CardDescription>
              {selectedDateBookings.length} séance(s) prévue(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Cliquez sur un jour pour voir les détails
                </p>
              </div>
            ) : selectedDateBookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <CalendarDays className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Aucune séance ce jour
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openQuickBook(selectedDate)}
                  className="border-secondary/30 hover:bg-secondary/5"
                >
                  + Ajouter une séance
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateBookings.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => openBookingDialog(booking)}
                    className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg text-foreground">
                        {format(new Date(booking.session_date), "HH:mm")}
                      </span>
                      <Badge
                        className={
                          booking.status === "confirmed"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : booking.status === "pending"
                            ? "bg-secondary/10 text-secondary border-secondary/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                      >
                        {booking.status === "confirmed" ? "Confirmé" : booking.status === "pending" ? "En attente" : "Annulé"}
                      </Badge>
                    </div>
                    <p className="font-medium text-foreground">
                      {booking.profiles?.name || "Client inconnu"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getSessionTypeLabel(booking.session_type)}
                    </p>
                    {booking.notes && (
                      <p className="text-sm text-muted-foreground mt-1 italic truncate">
                        📝 {booking.notes}
                      </p>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openQuickBook(selectedDate)}
                  className="w-full border-secondary/30 hover:bg-secondary/5"
                >
                  + Ajouter une séance
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {selectedBooking?.profiles?.name || "Client"}
            </DialogTitle>
            <DialogDescription>
              {selectedBooking && format(new Date(selectedBooking.session_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    selectedBooking.status === "confirmed"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : selectedBooking.status === "pending"
                      ? "bg-secondary/10 text-secondary border-secondary/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }
                >
                  {selectedBooking.status === "confirmed" ? "Confirmé" : selectedBooking.status === "pending" ? "En attente" : "Annulé"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {getSessionTypeLabel(selectedBooking.session_type)}
                </span>
              </div>

              {selectedBooking.profiles?.phone && (
                <p className="text-sm">📱 {selectedBooking.profiles.phone}</p>
              )}

              {selectedBooking.goals && (
                <p className="text-sm">🎯 {selectedBooking.goals}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes de séance</Label>
                <Textarea
                  id="notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ajouter des notes sur cette séance..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <div className="flex gap-2">
              {selectedBooking?.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => updateBookingStatus("confirmed")}
                    disabled={isUpdating}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Confirmer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateBookingStatus("cancelled")}
                    disabled={isUpdating}
                    className="border-destructive/30 text-destructive hover:bg-destructive/5"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Refuser
                  </Button>
                </>
              )}
              {selectedBooking?.status === "confirmed" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateICS(selectedBooking)}
                    className="border-secondary/30 hover:bg-secondary/5"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    .ics
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateBookingStatus("cancelled")}
                    disabled={isUpdating}
                    className="text-destructive hover:bg-destructive/5"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Annuler
                  </Button>
                </>
              )}
            </div>
            <Button
              size="sm"
              onClick={saveNotes}
              disabled={isUpdating}
            >
              Sauvegarder notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Book Dialog */}
      <Dialog open={isQuickBookOpen} onOpenChange={setIsQuickBookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-secondary" />
              Nouvelle séance
            </DialogTitle>
            <DialogDescription>
              {quickBookDate && format(quickBookDate, "EEEE d MMMM yyyy", { locale: fr })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select value={quickBookClient} onValueChange={setQuickBookClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Heure</Label>
              <Select value={quickBookTime} onValueChange={setQuickBookTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 13 }, (_, i) => i + 7).map((hour) => (
                    <>
                      <SelectItem key={`${hour}:00`} value={`${hour.toString().padStart(2, "0")}:00`}>
                        {hour.toString().padStart(2, "0")}:00
                      </SelectItem>
                      <SelectItem key={`${hour}:30`} value={`${hour.toString().padStart(2, "0")}:30`}>
                        {hour.toString().padStart(2, "0")}:30
                      </SelectItem>
                    </>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={createQuickBooking}
              disabled={!quickBookClient || isUpdating}
              className="w-full"
            >
              Créer la séance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
