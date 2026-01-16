import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MessageSquare, Users, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings"> & {
  profiles?: { name: string } | null;
};

export function AdminOverview() {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      // Get pending bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, profiles(name)")
        .eq("status", "pending")
        .order("session_date", { ascending: true })
        .limit(5);

      setPendingBookings(bookings || []);

      // Get unread messages count
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (adminRole) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", adminRole.user_id)
          .is("read_at", null);

        setUnreadMessages(count || 0);
      }

      // Get total clients count
      const { count: clientsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      setTotalClients(clientsCount || 0);

      // Get today's confirmed sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count: sessionsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed")
        .gte("session_date", today.toISOString())
        .lt("session_date", tomorrow.toISOString());

      setTodaySessions(sessionsCount || 0);
    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Demandes en attente
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingBookings.length}</p>
            <p className="text-sm text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Séances aujourd'hui
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todaySessions}</p>
            <p className="text-sm text-muted-foreground">Confirmées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Messages non lus
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{unreadMessages}</p>
            <p className="text-sm text-muted-foreground">À consulter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total clients
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalClients}</p>
            <p className="text-sm text-muted-foreground">Inscrits</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Demandes de réservation en attente
          </CardTitle>
          <CardDescription>
            Validez ou refusez les demandes de vos clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingBookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune demande en attente 🎉
            </p>
          ) : (
            <div className="space-y-4">
              {pendingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {booking.profiles?.name || "Client inconnu"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.session_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.session_type} {booking.goals && `• ${booking.goals}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
