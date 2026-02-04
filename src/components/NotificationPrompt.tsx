import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  isPushNotificationSupported,
  getPushNotificationStatus,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
} from "@/lib/pushNotifications";

export function NotificationPrompt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    supported: boolean;
    permission: NotificationPermission | 'unsupported';
    subscribed: boolean;
  }>({ supported: false, permission: 'unsupported', subscribed: false });

  useEffect(() => {
    checkNotificationStatus();
  }, [user]);

  const checkNotificationStatus = async () => {
    const currentStatus = await getPushNotificationStatus();
    setStatus(currentStatus);

    // Show prompt if supported, not subscribed, and permission not denied
    if (
      user &&
      currentStatus.supported &&
      !currentStatus.subscribed &&
      currentStatus.permission !== 'denied'
    ) {
      // Check if user dismissed the prompt before
      const dismissed = localStorage.getItem('notification-prompt-dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  };

  const handleEnableNotifications = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Register service worker
      await registerServiceWorker();

      // Request permission
      const permission = await requestNotificationPermission();
      
      if (permission === 'granted') {
        // Subscribe to push notifications
        const success = await subscribeToPushNotifications(user.id);
        
        if (success) {
          toast({
            title: "Notifications activées",
            description: "Vous recevrez des notifications pour les nouveaux messages.",
          });
          setIsVisible(false);
        } else {
          toast({
            title: "Configuration incomplète",
            description: "Les notifications sont activées mais la configuration serveur est en attente.",
            variant: "destructive",
          });
        }
      } else if (permission === 'denied') {
        toast({
          title: "Notifications refusées",
          description: "Vous pouvez les réactiver dans les paramètres de votre navigateur.",
          variant: "destructive",
        });
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification-prompt-dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible || !status.supported) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 max-w-sm shadow-lg border-primary/20 animate-in slide-in-from-bottom-4">
      <CardHeader className="pb-2 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-base">Notifications</CardTitle>
        </div>
        <CardDescription>
          Recevez des alertes pour les nouveaux messages
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          onClick={handleEnableNotifications}
          disabled={isLoading}
          className="flex-1"
          size="sm"
        >
          {isLoading ? "Activation..." : "Activer"}
        </Button>
        <Button
          variant="outline"
          onClick={handleDismiss}
          size="sm"
        >
          Plus tard
        </Button>
      </CardContent>
    </Card>
  );
}
