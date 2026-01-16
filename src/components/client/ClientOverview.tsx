import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings">;
type Message = Tables<"messages">;

export function ClientOverview() {
  const { user } = useAuth();
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOverviewData();
    }
  }, [user]);

  const fetchOverviewData = async () => {
    if (!user) return;

    try {
      // Get next upcoming booking
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("client_id", user.id)
        .eq("status", "confirmed")
        .gte("session_date", new Date().toISOString())
        .order("session_date", { ascending: true })
        .limit(1);

      if (bookings && bookings.length > 0) {
        setNextBooking(bookings[0]);
      }

      // Get unread messages count
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .is("read_at", null);

      setUnreadMessages(count || 0);

      // Get total confirmed sessions
      const { count: sessionsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("client_id", user.id)
        .eq("status", "confirmed");

      setTotalSessions(sessionsCount || 0);
    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prochaine séance
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {nextBooking ? (
              <div>
                <p className="text-2xl font-bold">
                  {format(new Date(nextBooking.session_date), "d MMMM", { locale: fr })}
                </p>
                <p className="text-sm text-muted-foreground">
                  à {format(new Date(nextBooking.session_date), "HH:mm", { locale: fr })}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Aucune séance prévue</p>
            )}
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
            <p className="text-2xl font-bold">{unreadMessages}</p>
            <p className="text-sm text-muted-foreground">
              {unreadMessages === 0 ? "Aucun nouveau message" : "À consulter"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Séances réalisées
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-sm text-muted-foreground">Séances confirmées</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Booking Details */}
      {nextBooking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Votre prochaine séance
            </CardTitle>
            <CardDescription>
              Détails de votre rendez-vous à venir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium">
                  {format(new Date(nextBooking.session_date), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                <p className="text-muted-foreground">
                  à {format(new Date(nextBooking.session_date), "HH:mm", { locale: fr })} • {nextBooking.session_type}
                </p>
                {nextBooking.goals && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Objectif : {nextBooking.goals}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(nextBooking.status)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button asChild>
            <a href="#bookings">
              <Calendar className="h-4 w-4 mr-2" />
              Réserver une séance
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="#messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contacter Anaïs
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
