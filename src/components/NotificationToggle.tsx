import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  isPushNotificationSupported,
  getPushNotificationStatus,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/lib/pushNotifications";

export function NotificationToggle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supported, setSupported] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [user]);

  const checkStatus = async () => {
    const status = await getPushNotificationStatus();
    setSupported(status.supported);
    setEnabled(status.subscribed);
    setDenied(status.permission === "denied");
    setIsLoading(false);
  };

  const handleToggle = async (checked: boolean) => {
    if (!user) return;
    setIsLoading(true);

    try {
      if (checked) {
        await registerServiceWorker();
        const permission = await requestNotificationPermission();

        if (permission === "granted") {
          const success = await subscribeToPushNotifications(user.id);
          if (success) {
            setEnabled(true);
            toast({ title: "Notifications activées", description: "Vous recevrez des alertes pour les nouveaux messages." });
          } else {
            toast({ title: "Erreur", description: "Impossible d'activer les notifications.", variant: "destructive" });
          }
        } else if (permission === "denied") {
          setDenied(true);
          toast({ title: "Notifications refusées", description: "Réactivez-les dans les paramètres de votre navigateur.", variant: "destructive" });
        }
      } else {
        const success = await unsubscribeFromPushNotifications(user.id);
        if (success) {
          setEnabled(false);
          toast({ title: "Notifications désactivées" });
        }
      }
    } catch (error) {
      console.error("Notification toggle error:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Notifications push
          </CardTitle>
          <CardDescription>
            Les notifications push ne sont pas supportées par votre navigateur.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-secondary" />
          Notifications push
        </CardTitle>
        <CardDescription>
          Recevez des alertes en temps réel pour les nouveaux messages et événements importants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="push-toggle" className="flex flex-col gap-1 cursor-pointer">
            <span>{enabled ? "Activées" : "Désactivées"}</span>
            {denied && (
              <span className="text-xs text-destructive">
                Bloquées par le navigateur — modifiez les paramètres du site.
              </span>
            )}
          </Label>
          <Switch
            id="push-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || denied}
          />
        </div>
      </CardContent>
    </Card>
  );
}
