import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Shield, ShieldCheck, Search, Loader2, UserCog, ShieldOff, Plus, Trash2 } from "lucide-react";
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

  // Role change dialog
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; user: UserWithRole | null; action: "promote" | "demote" }>({
    open: false, user: null, action: "promote",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Create user dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "client" });
  const [isCreating, setIsCreating] = useState(false);

  // Delete user dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserWithRole | null }>({ open: false, user: null });
  const [isDeleting, setIsDeleting] = useState(false);

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
        const { error } = await supabase.from("user_roles").insert({ user_id: targetUser.id, role: "admin" as any });
        if (error) throw error;
        toast({ title: "Rôle mis à jour", description: `${targetUser.name} est maintenant administrateur.` });
      } else {
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

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({ title: "Erreur", description: "Tous les champs sont requis.", variant: "destructive" });
      return;
    }
    if (newUser.password.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }
    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "create", ...newUser },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Utilisateur créé", description: `${newUser.name} a été ajouté avec succès.` });
      setCreateDialog(false);
      setNewUser({ name: "", email: "", password: "", role: "client" });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    const targetUser = deleteDialog.user;
    if (!targetUser) return;
    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "delete", user_id: targetUser.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Utilisateur supprimé", description: `${targetUser.name} a été supprimé.` });
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
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
        <div className="flex gap-2 items-start">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-border focus:border-secondary"
            />
          </div>
          <Button onClick={() => setCreateDialog(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
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
                    <div className="flex gap-2 shrink-0">
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
                            ? "border-destructive/30 text-destructive hover:bg-destructive/5"
                            : "border-secondary/30 text-secondary hover:bg-secondary/5"
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
                            Promouvoir
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, user: u })}
                        className="border-destructive/30 text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Role change dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "promote" ? "Promouvoir en administrateur" : "Retirer les droits administrateur"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "promote"
                ? `${confirmDialog.user?.name} aura accès à l'ensemble du back-office.`
                : `${confirmDialog.user?.name} n'aura plus accès au back-office.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, user: null, action: "promote" })}>
              Annuler
            </Button>
            <Button onClick={handleRoleChange} disabled={isUpdating} variant={confirmDialog.action === "demote" ? "destructive" : "default"}>
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {confirmDialog.action === "promote" ? "Confirmer" : "Retirer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>
              Créez un nouveau compte utilisateur. Il pourra se connecter immédiatement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nom complet</Label>
              <Input id="new-name" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} placeholder="Jean Dupont" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="jean@exemple.fr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Mot de passe</Label>
              <Input id="new-password" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} placeholder="Min. 6 caractères" />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser((p) => ({ ...p, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateUser} disabled={isCreating} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer l'utilisateur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'utilisateur</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteDialog.user?.name}</strong> ? Cette action est irréversible. Toutes ses données (réservations, messages, documents) seront supprimées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
