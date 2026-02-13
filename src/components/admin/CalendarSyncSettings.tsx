import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Save, RefreshCw, Link2, Unlink, Loader2, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Provider = "google" | "outlook";

interface CalendarConnection {
  provider: string;
  email: string;
  connected_at: string;
  token_expires_at: string | null;
}

export function CalendarSyncSettings() {
  const { user } = useAuth();

  // Credentials
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleSecret, setGoogleSecret] = useState("");
  const [outlookClientId, setOutlookClientId] = useState("");
  const [outlookSecret, setOutlookSecret] = useState("");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [savingCreds, setSavingCreds] = useState<Provider | null>(null);

  // Connections
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [connecting, setConnecting] = useState<Provider | null>(null);
  const [syncing, setSyncing] = useState<Provider | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(true);

  useEffect(() => {
    loadCredentials();
    loadConnections();
  }, []);

  const loadCredentials = async () => {
    setLoadingCreds(true);
    const { data } = await supabase
      .from("calendar_credentials")
      .select("provider, client_id, client_secret");

    if (data) {
      for (const cred of data) {
        if (cred.provider === "google") {
          setGoogleClientId(cred.client_id);
          setGoogleSecret(cred.client_secret);
        } else if (cred.provider === "outlook") {
          setOutlookClientId(cred.client_id);
          setOutlookSecret(cred.client_secret);
        }
      }
    }
    setLoadingCreds(false);
  };

  const loadConnections = async () => {
    try {
      const { data } = await supabase.functions.invoke("calendar-sync", {
        body: { action: "status" },
      });
      setConnections(data?.connections || []);
    } catch {
      // No connections yet
    }
  };

  const saveCredentials = async (provider: Provider) => {
    const clientId = provider === "google" ? googleClientId : outlookClientId;
    const clientSecret = provider === "google" ? googleSecret : outlookSecret;

    if (!clientId.trim() || !clientSecret.trim()) {
      toast({ title: "Erreur", description: "Veuillez remplir les deux champs.", variant: "destructive" });
      return;
    }

    setSavingCreds(provider);
    try {
      const { error } = await supabase
        .from("calendar_credentials")
        .upsert({ provider, client_id: clientId.trim(), client_secret: clientSecret.trim() }, { onConflict: "provider" });

      if (error) throw error;
      toast({ title: "Credentials sauvegardés", description: `Les identifiants ${provider === "google" ? "Google" : "Outlook"} ont été enregistrés.` });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSavingCreds(null);
    }
  };

  const connectCalendar = async (provider: Provider) => {
    setConnecting(provider);
    try {
      const { data, error } = await supabase.functions.invoke("calendar-sync", {
        body: { action: "get-auth-url", provider },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || "Impossible de générer l'URL d'autorisation");
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setConnecting(null);
    }
  };

  const disconnectCalendar = async (provider: Provider) => {
    try {
      await supabase.functions.invoke("calendar-sync", {
        body: { action: "disconnect", provider },
      });
      setConnections(prev => prev.filter(c => c.provider !== provider));
      toast({ title: "Déconnecté", description: `Calendrier ${provider === "google" ? "Google" : "Outlook"} déconnecté.` });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const syncNow = async (provider: Provider) => {
    setSyncing(provider);
    try {
      const { data, error } = await supabase.functions.invoke("calendar-sync", {
        body: { action: "sync", provider },
      });

      if (error) throw error;
      toast({
        title: "Synchronisation terminée",
        description: `${data?.pushed || 0} événement(s) synchronisé(s)${data?.errors ? `, ${data.errors} erreur(s)` : ""}.`,
      });
    } catch (error: any) {
      toast({ title: "Erreur de synchronisation", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const isConnected = (provider: Provider) => connections.some(c => c.provider === provider);
  const getConnection = (provider: Provider) => connections.find(c => c.provider === provider);

  const toggleSecret = (key: string) => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));

  if (loadingCreds) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-secondary" />
            Google Calendar
            {isConnected("google") && <Badge className="bg-primary/10 text-primary border-primary/20">Connecté</Badge>}
          </CardTitle>
          <CardDescription>
            Synchronisez vos séances avec Google Calendar.{" "}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-secondary underline">
              Console Google Cloud
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              placeholder="xxx.apps.googleusercontent.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Client Secret</Label>
            <div className="relative">
              <Input
                type={showSecrets["googleSecret"] ? "text" : "password"}
                value={googleSecret}
                onChange={(e) => setGoogleSecret(e.target.value)}
                placeholder="GOCSPX-..."
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => toggleSecret("googleSecret")}>
                {showSecrets["googleSecret"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            URI de redirection : <code className="bg-muted px-1 py-0.5 rounded text-xs">{`https://nycrvkfayqjoeumxftnw.supabase.co/functions/v1/google-calendar-callback`}</code>
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => saveCredentials("google")} disabled={savingCreds === "google"} variant="outline">
              {savingCreds === "google" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
            {!isConnected("google") ? (
              <Button onClick={() => connectCalendar("google")} disabled={connecting === "google" || !googleClientId}>
                {connecting === "google" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                Connecter Google
              </Button>
            ) : (
              <>
                <Button onClick={() => syncNow("google")} disabled={syncing === "google"} variant="secondary">
                  {syncing === "google" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Synchroniser
                </Button>
                <Button onClick={() => disconnectCalendar("google")} variant="destructive" size="sm">
                  <Unlink className="h-4 w-4 mr-2" />
                  Déconnecter
                </Button>
              </>
            )}
          </div>
          {isConnected("google") && (
            <p className="text-sm text-muted-foreground">
              ✅ Connecté en tant que <span className="font-medium text-foreground">{getConnection("google")?.email}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Outlook Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-secondary" />
            Microsoft Outlook
            {isConnected("outlook") && <Badge className="bg-primary/10 text-primary border-primary/20">Connecté</Badge>}
          </CardTitle>
          <CardDescription>
            Synchronisez vos séances avec Outlook Calendar.{" "}
            <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-secondary underline">
              Azure Portal
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Application (Client) ID</Label>
            <Input
              value={outlookClientId}
              onChange={(e) => setOutlookClientId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label>Client Secret</Label>
            <div className="relative">
              <Input
                type={showSecrets["outlookSecret"] ? "text" : "password"}
                value={outlookSecret}
                onChange={(e) => setOutlookSecret(e.target.value)}
                placeholder="Client secret value"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => toggleSecret("outlookSecret")}>
                {showSecrets["outlookSecret"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            URI de redirection : <code className="bg-muted px-1 py-0.5 rounded text-xs">{`https://nycrvkfayqjoeumxftnw.supabase.co/functions/v1/outlook-calendar-callback`}</code>
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => saveCredentials("outlook")} disabled={savingCreds === "outlook"} variant="outline">
              {savingCreds === "outlook" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
            {!isConnected("outlook") ? (
              <Button onClick={() => connectCalendar("outlook")} disabled={connecting === "outlook" || !outlookClientId}>
                {connecting === "outlook" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                Connecter Outlook
              </Button>
            ) : (
              <>
                <Button onClick={() => syncNow("outlook")} disabled={syncing === "outlook"} variant="secondary">
                  {syncing === "outlook" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Synchroniser
                </Button>
                <Button onClick={() => disconnectCalendar("outlook")} variant="destructive" size="sm">
                  <Unlink className="h-4 w-4 mr-2" />
                  Déconnecter
                </Button>
              </>
            )}
          </div>
          {isConnected("outlook") && (
            <p className="text-sm text-muted-foreground">
              ✅ Connecté en tant que <span className="font-medium text-foreground">{getConnection("outlook")?.email}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
