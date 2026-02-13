import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MessageSquare, Users, Clock, AlertCircle, Activity, TrendingUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subWeeks, startOfWeek, endOfWeek, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings"> & {
  profiles?: { name: string } | null;
};

export function AdminOverview() {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      // Get all bookings for charts
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, profiles(name)")
        .order("session_date", { ascending: true });

      setAllBookings(bookingsData || []);

      const pending = (bookingsData || []).filter(b => b.status === "pending").slice(0, 5);
      setPendingBookings(pending);

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

  // Weekly sessions chart data (last 8 weeks)
  const getWeeklyData = () => {
    const data = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { locale: fr });
      const weekEnd = endOfWeek(subWeeks(new Date(), i), { locale: fr });
      const confirmed = allBookings.filter(b => {
        const d = new Date(b.session_date);
        return d >= weekStart && d <= weekEnd && b.status === "confirmed";
      }).length;
      const cancelled = allBookings.filter(b => {
        const d = new Date(b.session_date);
        return d >= weekStart && d <= weekEnd && b.status === "cancelled";
      }).length;
      data.push({
        week: format(weekStart, "d MMM", { locale: fr }),
        confirmées: confirmed,
        annulées: cancelled,
      });
    }
    return data;
  };

  // Monthly new clients (approximated by bookings from unique clients)
  const getMonthlyData = () => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(new Date(), i));
      const mEnd = endOfMonth(subMonths(new Date(), i));
      const monthBookings = allBookings.filter(b => {
        const d = new Date(b.session_date);
        return d >= mStart && d <= mEnd && b.status === "confirmed";
      });
      data.push({
        mois: format(mStart, "MMM", { locale: fr }),
        séances: monthBookings.length,
      });
    }
    return data;
  };

  // Session types distribution
  const getTypeDistribution = () => {
    const types: Record<string, number> = {};
    const confirmed = allBookings.filter(b => b.status === "confirmed");
    confirmed.forEach(b => { types[b.session_type] = (types[b.session_type] || 0) + 1; });

    const labels: Record<string, string> = {
      individual: "Individuelle",
      duo: "Duo",
      group: "Groupe",
      outdoor: "Extérieur",
    };

    return Object.entries(types).map(([key, value]) => ({
      name: labels[key] || key,
      value,
    }));
  };

  // Conversion rate
  const totalBookings = allBookings.length;
  const confirmedBookings = allBookings.filter(b => b.status === "confirmed").length;
  const conversionRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse border-border/50">
            <CardHeader><div className="h-4 bg-muted rounded w-1/2"></div></CardHeader>
            <CardContent><div className="h-8 bg-muted rounded"></div></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-br from-secondary/10 via-secondary/5 to-background border-secondary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-secondary/20">
              <Activity className="h-8 w-8 text-secondary" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-foreground">
                Tableau de bord administrateur
              </h2>
              <p className="text-muted-foreground">
                Vue d'ensemble de votre activité coaching
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-secondary/20 hover:border-secondary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Demandes en attente</CardTitle>
            <div className="p-2 rounded-lg bg-secondary/10"><AlertCircle className="h-4 w-4 text-secondary" /></div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{pendingBookings.length}</p>
            <p className="text-sm text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Séances aujourd'hui</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{todaySessions}</p>
            <p className="text-sm text-muted-foreground">Confirmées</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-primary/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taux de conversion</CardTitle>
            <div className="p-2 rounded-lg bg-accent/50"><TrendingUp className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{conversionRate}%</p>
            <p className="text-sm text-muted-foreground">{confirmedBookings}/{totalBookings} confirmées</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-primary/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total clients</CardTitle>
            <div className="p-2 rounded-lg bg-accent/50"><Users className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totalClients}</p>
            <p className="text-sm text-muted-foreground">{unreadMessages} message{unreadMessages !== 1 ? "s" : ""} non lu{unreadMessages !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Sessions */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-secondary" />
              Séances par semaine
            </CardTitle>
            <CardDescription>8 dernières semaines</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={getWeeklyData()}>
                <XAxis dataKey="week" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="confirmées" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="annulées" fill="hsl(var(--destructive) / 0.5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Evolution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Évolution mensuelle
            </CardTitle>
            <CardDescription>Séances confirmées sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={getMonthlyData()}>
                <XAxis dataKey="mois" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                />
                <Line type="monotone" dataKey="séances" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Type distribution + Pending */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Type Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Répartition par type</CardTitle>
            <CardDescription>Distribution des séances confirmées</CardDescription>
          </CardHeader>
          <CardContent>
            {getTypeDistribution().length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune donnée</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={getTypeDistribution()} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                      {getTypeDistribution().map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {getTypeDistribution().map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-semibold text-foreground">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Bookings */}
        <Card className="border-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-secondary" />
              Demandes en attente
            </CardTitle>
            <CardDescription>Validez ou refusez les demandes</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingBookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <p className="text-muted-foreground">Aucune demande en attente 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border border-secondary/30 bg-secondary/5">
                    <div>
                      <p className="font-medium text-foreground text-sm">{booking.profiles?.name || "Client"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(booking.session_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
