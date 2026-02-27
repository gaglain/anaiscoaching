import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, CreditCard, Eye, EyeOff, Save, Lock, Tag, FolderOpen, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { NotificationToggle } from "@/components/NotificationToggle";
import { useCategories } from "@/hooks/useCategories";
import { CalendarSyncSettings } from "@/components/admin/CalendarSyncSettings";
import { GooglePlacesSettings } from "@/components/admin/GooglePlacesSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function AdminSettings() {
  const { user } = useAuth();
  const [stripeKey, setStripeKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Categories
  const { categories: docCategories, addCategory: addDocCategory, deleteCategory: deleteDocCategory } = useCategories("document");
  const { categories: clientCategories, addCategory: addClientCategory, deleteCategory: deleteClientCategory } = useCategories("client");
  const [newDocCategory, setNewDocCategory] = useState("");
  const [newClientCategory, setNewClientCategory] = useState("");

  const handleSaveStripe = () => {
    if (!stripeKey.trim()) {
      toast({ title: "Erreur", description: "Veuillez entrer une clé Stripe.", variant: "destructive" });
      return;
    }
    localStorage.setItem("stripe_publishable_key", stripeKey.trim());
    setSaved(true);
    toast({ title: "Clé enregistrée", description: "Votre clé Stripe a été sauvegardée localement." });
  };

  useState(() => {
    const savedKey = localStorage.getItem("stripe_publishable_key");
    if (savedKey) { setStripeKey(savedKey); setSaved(true); }
  });

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Mot de passe modifié", description: "Votre mot de passe a été mis à jour avec succès." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAddCategory = async (type: "document" | "client") => {
    const name = type === "document" ? newDocCategory : newClientCategory;
    if (!name.trim()) return;
    const success = type === "document" ? await addDocCategory(name) : await addClientCategory(name);
    if (success) {
      type === "document" ? setNewDocCategory("") : setNewClientCategory("");
      toast({ title: "Catégorie ajoutée" });
    } else {
      toast({ title: "Erreur", description: "Cette catégorie existe peut-être déjà.", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: string, type: "document" | "client") => {
    const success = type === "document" ? await deleteDocCategory(id) : await deleteClientCategory(id);
    if (success) toast({ title: "Catégorie supprimée" });
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <NotificationToggle />

      {/* Calendar Sync */}
      <CalendarSyncSettings />

      {/* Google Places / Avis */}
      <GooglePlacesSettings />

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-secondary" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription>Mettez à jour votre mot de passe de connexion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez le mot de passe"
            />
          </div>
          <Button onClick={handlePasswordChange} disabled={isChangingPassword || !newPassword}>
            {isChangingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            Modifier le mot de passe
          </Button>
        </CardContent>
      </Card>

      {/* Document Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-secondary" />
            Catégories de documents
          </CardTitle>
          <CardDescription>Gérez les catégories disponibles pour classer les documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {docCategories.map((cat) => (
              <Badge key={cat.id} variant="secondary" className="gap-1 pr-1 py-1">
                {cat.name}
                <button onClick={() => handleDeleteCategory(cat.id, "document")} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newDocCategory}
              onChange={(e) => setNewDocCategory(e.target.value)}
              placeholder="Nouvelle catégorie..."
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory("document"); } }}
            />
            <Button size="icon" variant="outline" onClick={() => handleAddCategory("document")}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-secondary" />
            Catégories de clients
          </CardTitle>
          <CardDescription>Gérez les catégories pour segmenter vos clients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {clientCategories.map((cat) => (
              <Badge key={cat.id} variant="secondary" className="gap-1 pr-1 py-1">
                {cat.name}
                <button onClick={() => handleDeleteCategory(cat.id, "client")} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newClientCategory}
              onChange={(e) => setNewClientCategory(e.target.value)}
              placeholder="Nouvelle catégorie..."
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory("client"); } }}
            />
            <Button size="icon" variant="outline" onClick={() => handleAddCategory("client")}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stripe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-secondary" />
            Paiement Stripe
          </CardTitle>
          <CardDescription>
            Configurez votre compte Stripe pour accepter les paiements en ligne.{" "}
            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-secondary underline">
              dashboard.stripe.com
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stripe-key">Clé publique Stripe (pk_...)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="stripe-key"
                  type={showKey ? "text" : "password"}
                  placeholder="pk_live_... ou pk_test_..."
                  value={stripeKey}
                  onChange={(e) => { setStripeKey(e.target.value); setSaved(false); }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveStripe} disabled={saved} className="gap-2">
                <Save className="h-4 w-4" />
                {saved ? "Enregistré" : "Enregistrer"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cette clé est stockée localement. L'intégration complète sera activée ultérieurement.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-secondary" />
            Informations du compte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Email :</span> {user?.email || "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
