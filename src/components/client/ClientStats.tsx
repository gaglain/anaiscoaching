import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Target, Award, Flame, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings">;

interface MonthlyStats {
  month: string;
  sessions: number;
}

export function ClientStats() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllBookings();
    }
  }, [user]);

  const fetchAllBookings = async () => {
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

  // Calculate statistics
  const confirmedBookings = bookings.filter(b => b.status === "confirmed");
  const completedBookings = confirmedBookings.filter(b => new Date(b.session_date) < new Date());
  const cancelledBookings = bookings.filter(b => b.status === "cancelled");
  
  const totalSessions = completedBookings.length;
  const attendanceRate = bookings.length > 0 
    ? Math.round((completedBookings.length / (completedBookings.length + cancelledBookings.length)) * 100) || 100
    : 100;

  // Calculate streak (consecutive weeks with at least one session)
  const calculateStreak = (): number => {
    if (completedBookings.length === 0) return 0;
    
    const sortedBookings = [...completedBookings].sort(
      (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
    );
    
    let streak = 0;
    let currentWeekStart = new Date();
    currentWeekStart.setHours(0, 0, 0, 0);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    
    for (let i = 0; i < 52; i++) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const hasSessionInWeek = sortedBookings.some(b => {
        const sessionDate = new Date(b.session_date);
        return sessionDate >= currentWeekStart && sessionDate < weekEnd;
      });
      
      if (hasSessionInWeek) {
        streak++;
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Monthly stats for the last 6 months
  const getMonthlyStats = (): MonthlyStats[] => {
    const stats: MonthlyStats[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const sessionsInMonth = completedBookings.filter(b => {
        const sessionDate = new Date(b.session_date);
        return sessionDate >= monthStart && sessionDate <= monthEnd;
      }).length;
      
      stats.push({
        month: format(monthDate, "MMM", { locale: fr }),
        sessions: sessionsInMonth,
      });
    }
    
    return stats;
  };

  // Session types distribution
  const getSessionTypesDistribution = () => {
    const types: Record<string, number> = {};
    
    completedBookings.forEach(b => {
      types[b.session_type] = (types[b.session_type] || 0) + 1;
    });
    
    return Object.entries(types).map(([type, count]) => ({
      type,
      count,
      label: getSessionTypeLabel(type),
    }));
  };

  const getSessionTypeLabel = (type: string): string => {
    switch (type) {
      case "individual": return "Individuelle";
      case "duo": return "Duo";
      case "group": return "Groupe";
      case "outdoor": return "Extérieur";
      default: return type;
    }
  };

  // Days since first session
  const daysSinceStart = completedBookings.length > 0
    ? differenceInDays(new Date(), new Date(completedBookings[completedBookings.length - 1].session_date))
    : 0;

  const streak = calculateStreak();
  const monthlyStats = getMonthlyStats();
  const maxMonthlySessions = Math.max(...monthlyStats.map(s => s.sessions), 1);
  const sessionTypes = getSessionTypesDistribution();

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse border-border/50">
            <CardHeader className="pb-2">
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
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 hover:border-primary/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Séances réalisées
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totalSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">
              depuis {daysSinceStart} jours
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-primary/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux d'assiduité
            </CardTitle>
            <div className="p-2 rounded-lg bg-accent/50">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{attendanceRate}%</p>
            <Progress value={attendanceRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-primary/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Série en cours
            </CardTitle>
            <div className="p-2 rounded-lg bg-secondary/10">
              <Flame className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{streak}</p>
            <p className="text-xs text-muted-foreground mt-1">
              semaine{streak > 1 ? "s" : ""} consécutive{streak > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-primary/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Moyenne mensuelle
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {monthlyStats.length > 0 
                ? (monthlyStats.reduce((acc, m) => acc + m.sessions, 0) / monthlyStats.length).toFixed(1)
                : 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              séances par mois
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Activity Chart */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Activité des 6 derniers mois
          </CardTitle>
          <CardDescription>
            Nombre de séances réalisées par mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-40">
            {monthlyStats.map((stat, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <span className="text-sm font-semibold text-foreground mb-1">
                    {stat.sessions}
                  </span>
                  <div 
                    className="w-full bg-primary/80 rounded-t-md transition-all duration-500"
                    style={{ 
                      height: `${Math.max((stat.sessions / maxMonthlySessions) * 100, 8)}px`,
                      minHeight: stat.sessions > 0 ? '20px' : '8px',
                      opacity: stat.sessions > 0 ? 1 : 0.3
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground capitalize">
                  {stat.month}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Types & Achievements */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Session Types */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Types de séances</CardTitle>
            <CardDescription>
              Répartition de vos séances par type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessionTypes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Aucune séance réalisée pour le moment
              </p>
            ) : (
              <div className="space-y-4">
                {sessionTypes.map(({ type, count, label }) => (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm text-muted-foreground">{count} séance{count > 1 ? "s" : ""}</span>
                    </div>
                    <Progress 
                      value={(count / totalSessions) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Badges
            </CardTitle>
            <CardDescription>
              Vos accomplissements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {totalSessions >= 1 && (
                <Badge variant="outline" className="py-2 px-3 border-primary/30 bg-primary/5">
                  🎯 Première séance
                </Badge>
              )}
              {totalSessions >= 5 && (
                <Badge variant="outline" className="py-2 px-3 border-primary/30 bg-primary/5">
                  🌟 5 séances
                </Badge>
              )}
              {totalSessions >= 10 && (
                <Badge variant="outline" className="py-2 px-3 border-primary/30 bg-primary/5">
                  💪 10 séances
                </Badge>
              )}
              {totalSessions >= 25 && (
                <Badge variant="outline" className="py-2 px-3 border-primary/30 bg-primary/5">
                  🔥 25 séances
                </Badge>
              )}
              {totalSessions >= 50 && (
                <Badge variant="outline" className="py-2 px-3 border-secondary/30 bg-secondary/5">
                  🏆 50 séances
                </Badge>
              )}
              {streak >= 4 && (
                <Badge variant="outline" className="py-2 px-3 border-secondary/30 bg-secondary/5">
                  ⚡ 1 mois de régularité
                </Badge>
              )}
              {streak >= 12 && (
                <Badge variant="outline" className="py-2 px-3 border-secondary/30 bg-secondary/5">
                  🚀 3 mois de régularité
                </Badge>
              )}
              {attendanceRate >= 90 && totalSessions >= 5 && (
                <Badge variant="outline" className="py-2 px-3 border-primary/30 bg-primary/5">
                  ✨ Assidu
                </Badge>
              )}
              {totalSessions === 0 && (
                <p className="text-muted-foreground text-sm">
                  Réalisez votre première séance pour débloquer des badges !
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
