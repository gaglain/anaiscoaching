import { useEffect } from "react";
import { useUnreadMessages } from "./useUnreadMessages";

export function useAppBadge() {
  const { unreadCount } = useUnreadMessages();

  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;

    if (unreadCount > 0) {
      navigator.setAppBadge(unreadCount).catch(() => {});
    } else {
      navigator.clearAppBadge?.().catch(() => {});
    }
  }, [unreadCount]);
}
