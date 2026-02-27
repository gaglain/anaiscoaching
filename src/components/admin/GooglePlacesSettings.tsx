import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Star, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function GooglePlacesSettings() {
  const [apiKey, setApiKey] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["google_places_api_key", "google_places_place_id"]);

      if (data) {
        for (const row of data) {
          if (row.key === "google_places_api_key") setApiKey(row.value);
          if (row.key === "google_places_place_id") setPlaceId(row.value);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim() || !placeId.trim()) {
      toast({ title: "Erreur", description: "Veuillez remplir les deux champs.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Upsert both settings
      for (const { key, value } of [
        { key: "google_places_api_key", value: apiKey.trim() },
        { key: "google_places_place_id", value: placeId.trim() },
      ]) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key, value }, { onConflict: "key" });
        if (error) throw error;
      }

      toast({ title: "Configuration sauvegardée", description: "Les paramètres Google Places ont été enregistrés." });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-secondary" />
          Avis Google (Google Places)
        </CardTitle>
        <CardDescription>
          Configurez l'API Google Places pour afficher vos avis Google My Business sur le site.{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary underline"
          >
            Google Cloud Console
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="google-api-key">Clé API Google</Label>
          <div className="relative">
            <Input
              id="google-api-key"
              type={showKey ? "text" : "password"}
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Clé avec l'API Places activée dans la Google Cloud Console.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="google-place-id">Place ID</Label>
          <Input
            id="google-place-id"
            placeholder="ChIJ..."
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Identifiant de votre établissement.{" "}
            <a
              href="https://developers.google.com/maps/documentation/places/web-service/place-id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary underline"
            >
              Trouver mon Place ID
            </a>
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
