import { useState, useEffect } from "react";
import { Bell, BellOff, Mail, Smartphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  isPushNotificationSupported,
  getPushNotificationStatus,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/lib/pushNotifications";

interface NotificationPreferences {
  email: boolean;
  push: boolean;
}

export function ClientSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Push state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushDenied, setPushDenied] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);

  // Email preference state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailLoading, setEmailLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkPushStatus();
      fetchPreferences();
    }
  }, [user]);

  const checkPushStatus = async () => {
    const status = await getPushNotificationStatus();
    setPushSupported(status.supported);
    setPushEnabled(status.subscribed);
    setPushDenied(status.permission === "denied");
    setPushLoading(false);
  };

  const fetchPreferences = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();

      if (data?.notification_preferences) {
        const prefs = data.notification_preferences as unknown as NotificationPreferences;
        setEmailEnabled(prefs.email ?? true);
      }
    } catch (e) {
      console.error("Error fetching preferences:", e);
    } finally {
      setEmailLoading(false);
    }
  };

  const updatePreferences = async (prefs: Partial<NotificationPreferences>) => {
    if (!user) return;
    const newPrefs: NotificationPreferences = {
      email: prefs.email ?? emailEnabled,
      push: prefs.push ?? pushEnabled,
    };

    const { error } = await supabase
      .from("profiles")
      .update({ notification_preferences: newPrefs as any })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating preferences:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder les préférences.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleEmailToggle = async (checked: boolean) => {
    setEmailLoading(true);
    const success = await updatePreferences({ email: checked });
    if (success) {
      setEmailEnabled(checked);
      toast({
        title: checked ? "Notifications email activées" : "Notifications email désactivées",
        description: checked
          ? "Vous recevrez une copie des messages par email."
          : "Vous ne recevrez plus de copie par email.",
      });
    }
    setEmailLoading(false);
  };

  const handlePushToggle = async (checked: boolean) => {
    if (!user) return;
    setPushLoading(true);

    try {
      if (checked) {
        await registerServiceWorker();
        const permission = await requestNotificationPermission();

        if (permission === "granted") {
          const success = await subscribeToPushNotifications(user.id);
          if (success) {
            setPushEnabled(true);
            await updatePreferences({ push: true });
            toast({ title: "Notifications push activées", description: "Vous recevrez des alertes en temps réel." });
          } else {
            toast({ title: "Erreur", description: "Impossible d'activer les notifications.", variant: "destructive" });
          }
        } else if (permission === "denied") {
          setPushDenied(true);
          toast({ title: "Notifications refusées", description: "Réactivez-les dans les paramètres de votre navigateur.", variant: "destructive" });
        }
      } else {
        const success = await unsubscribeFromPushNotifications(user.id);
        if (success) {
          setPushEnabled(false);
          await updatePreferences({ push: false });
          toast({ title: "Notifications push désactivées" });
        }
      }
    } catch (error) {
      console.error("Push toggle error:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            Préférences de notifications
          </CardTitle>
          <CardDescription>
            Choisissez comment vous souhaitez être notifié(e) des nouveaux messages et événements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Email notifications */}
          <div className="flex items-center justify-between">
            <Label htmlFor="email-toggle" className="flex items-center gap-3 cursor-pointer">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">Notifications par email</span>
                <span className="text-xs text-muted-foreground">
                  Recevez une copie des messages et alertes par email
                </span>
              </div>
            </Label>
            <Switch
              id="email-toggle"
              checked={emailEnabled}
              onCheckedChange={handleEmailToggle}
              disabled={emailLoading}
            />
          </div>

          <Separator />

          {/* Push notifications */}
          <div className="flex items-center justify-between">
            <Label htmlFor="push-toggle" className="flex items-center gap-3 cursor-pointer">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">Notifications push</span>
                <span className="text-xs text-muted-foreground">
                  {!pushSupported
                    ? "Non supportées par votre navigateur"
                    : pushDenied
                    ? "Bloquées — modifiez les paramètres du navigateur"
                    : "Alertes en temps réel dans le navigateur"}
                </span>
              </div>
            </Label>
            <Switch
              id="push-toggle"
              checked={pushEnabled}
              onCheckedChange={handlePushToggle}
              disabled={pushLoading || !pushSupported || pushDenied}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
