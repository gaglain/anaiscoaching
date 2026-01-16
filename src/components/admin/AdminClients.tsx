import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Loader2, Calendar, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface ClientWithStats extends Profile {
  bookingsCount: number;
  lastBooking: string | null;
}

export function AdminClients() {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch bookings stats for each client
      const clientsWithStats: ClientWithStats[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("client_id", profile.id);

          const { data: lastBookingData } = await supabase
            .from("bookings")
            .select("session_date")
            .eq("client_id", profile.id)
            .eq("status", "confirmed")
            .order("session_date", { ascending: false })
            .limit(1);

          return {
            ...profile,
            bookingsCount: count || 0,
            lastBooking: lastBookingData?.[0]?.session_date || null,
          };
        })
      );

      setClients(clientsWithStats);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLevelBadge = (level: string | null) => {
    switch (level) {
      case "beginner":
        return <Badge variant="outline" className="text-green-600 border-green-500/30">Débutant</Badge>;
      case "intermediate":
        return <Badge variant="outline" className="text-blue-600 border-blue-500/30">Intermédiaire</Badge>;
      case "advanced":
        return <Badge variant="outline" className="text-purple-600 border-purple-500/30">Avancé</Badge>;
      default:
        return <Badge variant="outline">Non défini</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Liste des clients</h2>
          <p className="text-muted-foreground">{clients.length} client(s) inscrit(s)</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "Aucun client trouvé" : "Aucun client inscrit"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <CardDescription>
                      Inscrit le {format(new Date(client.created_at), "d MMMM yyyy", { locale: fr })}
                    </CardDescription>
                  </div>
                  {getLevelBadge(client.level)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {client.phone && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">📱</span> {client.phone}
                  </p>
                )}
                {client.goals && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">🎯</span> {client.goals}
                  </p>
                )}
                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{client.bookingsCount} séance(s)</span>
                  </div>
                  {client.lastBooking && (
                    <div className="text-sm text-muted-foreground">
                      Dernière: {format(new Date(client.lastBooking), "d MMM", { locale: fr })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
