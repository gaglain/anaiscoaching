import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings, CreditCard, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AdminSettings() {
  const [stripeKey, setStripeKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!stripeKey.trim()) {
      toast({ title: "Erreur", description: "Veuillez entrer une clé Stripe.", variant: "destructive" });
      return;
    }
    // For now, store in localStorage until Stripe is properly integrated
    localStorage.setItem("stripe_publishable_key", stripeKey.trim());
    setSaved(true);
    toast({ title: "Clé enregistrée", description: "Votre clé Stripe a été sauvegardée localement." });
  };

  useState(() => {
    const savedKey = localStorage.getItem("stripe_publishable_key");
    if (savedKey) {
      setStripeKey(savedKey);
      setSaved(true);
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-secondary" />
            Paiement Stripe
          </CardTitle>
          <CardDescription>
            Configurez votre compte Stripe pour accepter les paiements en ligne. 
            Vous pouvez obtenir votre clé sur{" "}
            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-secondary underline">
              dashboard.stripe.com
            </a>.
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
              <Button onClick={handleSave} disabled={saved} className="gap-2">
                <Save className="h-4 w-4" />
                {saved ? "Enregistré" : "Enregistrer"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cette clé est stockée localement. L'intégration complète avec paiement sera activée ultérieurement.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-secondary" />
            Paramètres généraux
          </CardTitle>
          <CardDescription>
            D'autres paramètres seront disponibles prochainement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun paramètre supplémentaire pour le moment.</p>
        </CardContent>
      </Card>
    </div>
  );
}
