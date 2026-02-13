import { supabase } from "@/integrations/supabase/client";

// VAPID public key - you need to generate this
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    // Wait for the VitePWA-registered service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    console.log('Service Worker ready:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker not available:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  return permission;
}

export async function subscribeToPushNotifications(
  userId: string
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VAPID public key not configured');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await (registration as any).pushManager.getSubscription();
    
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    // Save subscription to database
    const subscriptionJSON = subscription.toJSON();
    
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh || '',
        auth: subscriptionJSON.keys?.auth || '',
      },
      {
        onConflict: 'user_id,endpoint',
      }
    );

    if (error) {
      console.error('Error saving push subscription:', error);
      return false;
    }

    console.log('Push subscription saved');
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

export async function unsubscribeFromPushNotifications(
  userId: string
): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await (registration as any).pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    }
    
    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushNotificationStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
}> {
  if (!isPushNotificationSupported()) {
    return { supported: false, permission: 'unsupported', subscribed: false };
  }

  const permission = Notification.permission;
  let subscribed = false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await (registration as any).pushManager.getSubscription();
    subscribed = !!subscription;
  } catch {
    // Ignore errors
  }

  return { supported: true, permission, subscribed };
}
