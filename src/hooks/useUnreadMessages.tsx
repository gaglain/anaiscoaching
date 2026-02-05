 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/hooks/useAuth";
 
 export function useUnreadMessages() {
   const { user } = useAuth();
   const [unreadCount, setUnreadCount] = useState(0);
   const [isLoading, setIsLoading] = useState(true);
 
   useEffect(() => {
     if (!user) {
       setUnreadCount(0);
       setIsLoading(false);
       return;
     }
 
     const fetchUnreadCount = async () => {
       try {
         const { count, error } = await supabase
           .from("messages")
           .select("*", { count: "exact", head: true })
           .eq("receiver_id", user.id)
           .is("read_at", null);
 
         if (error) {
           console.error("Error fetching unread messages:", error);
           return;
         }
 
         setUnreadCount(count || 0);
       } catch (e) {
         console.error("Error fetching unread messages:", e);
       } finally {
         setIsLoading(false);
       }
     };
 
     fetchUnreadCount();
 
     // Subscribe to new messages in real-time
     const channel = supabase
       .channel("unread-messages")
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "messages",
           filter: `receiver_id=eq.${user.id}`,
         },
         () => {
           fetchUnreadCount();
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [user]);
 
   return { unreadCount, isLoading };
 }