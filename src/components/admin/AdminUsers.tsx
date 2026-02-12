import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Shield, ShieldCheck, Search, Loader2, UserCog, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserWithRole {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  role: "admin" | "client";
}

export function AdminUsers() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; user: UserWithRole | null; action: "promote" | "demote" }>({
    open: false, user: null, action: "promote",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, name, email, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const roleMap = new Map<string, "admin" | "client">();
      for (const r of rolesRes.data || []) {
        // If a user has admin role anywhere, mark as admin
        if (r.role === "admin") {
          roleMap.set(r.user_id, "admin");
        } else if (!roleMap.has(r.user_id)) {
          roleMap.set(r.user_id, "client");
        }
      }

      const merged: UserWithRole[] = (profilesRes.data || []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) || "client",
      }));

      setUsers(merged);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Erreur", description: "Impossible de charger les utilisateurs.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async () => {
    const { user: targetUser, action } = confirmDialog;
    if (!targetUser) return;
    setIsUpdating(true);

    try {
      if (action === "promote") {
        // Insert admin role
        const { error } = await supabase.from("user_roles").insert({ user_id: targetUser.id, role: "admin" as any });
        if (error) throw error;
        toast({ title: "Rôle mis à jour", description: `${targetUser.name} est maintenant administrateur.` });
      } else {
        // Remove admin role
        const { error } = await supabase.from("user_roles").delete().eq("user_id", targetUser.id).eq("role", "admin" as any);
        if (error) throw error;
        toast({ title: "Rôle mis à jour", description: `${targetUser.name} n'est plus administrateur.` });
      }

      setConfirmDialog({ open: false, user: null, action: "promote" });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const adminCount = users.filter((u) => u.role === "admin").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-semibold text-foreground">Gestion des utilisateurs</h2>
          <p className="text-muted-foreground">
            {users.length} utilisateur(s) — {adminCount} admin(s)
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-border focus:border-secondary"
          />
        </div>
      </div>

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-4">
              <UserCog className="h-8 w-8 text-secondary" />
            </div>
            <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredUsers.map((u) => {
            const isSelf = u.id === currentUser?.id;
            const isAdmin = u.role === "admin";

            return (
              <Card key={u.id} className="border-border/50 hover:border-secondary/30 transition-colors">
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-full ${isAdmin ? "bg-secondary/10" : "bg-muted"}`}>
                      {isAdmin ? (
                        <ShieldCheck className="h-5 w-5 text-secondary" />
                      ) : (
                        <Shield className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{u.name}</span>
                        <Badge
                          variant={isAdmin ? "default" : "outline"}
                          className={isAdmin ? "bg-secondary text-secondary-foreground" : "border-border"}
                        >
                          {isAdmin ? "Admin" : "Client"}
                        </Badge>
                        {isSelf && (
                          <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                            Vous
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Inscrit le {format(new Date(u.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {!isSelf && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setConfirmDialog({
                          open: true,
                          user: u,
                          action: isAdmin ? "demote" : "promote",
                        })
                      }
                      className={
                        isAdmin
                          ? "border-destructive/30 text-destructive hover:bg-destructive/5 shrink-0"
                          : "border-secondary/30 text-secondary hover:bg-secondary/5 shrink-0"
                      }
                    >
                      {isAdmin ? (
                        <>
                          <ShieldOff className="h-4 w-4 mr-1" />
                          Retirer admin
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          Promouvoir admin
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "promote" ? "Promouvoir en administrateur" : "Retirer les droits administrateur"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "promote"
                ? `${confirmDialog.user?.name} aura accès à l'ensemble du back-office (réservations, clients, messages, documents).`
                : `${confirmDialog.user?.name} n'aura plus accès au back-office et sera redirigé(e) vers l'espace client.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, user: null, action: "promote" })}>
              Annuler
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={isUpdating}
              variant={confirmDialog.action === "demote" ? "destructive" : "default"}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {confirmDialog.action === "promote" ? "Confirmer la promotion" : "Confirmer le retrait"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
