import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  userId?: string;
  type?: string;
  title: string;
  body: string;
  url?: string;
}

async function getVapidKeys(supabase: any): Promise<{ publicKey: string; privateKey: string } | null> {
  // Try env secrets first
  let publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  let privateKey = Deno.env.get('VAPID_PRIVATE_KEY');

  if (publicKey && publicKey.length > 20 && privateKey && privateKey.length > 20) {
    return { publicKey, privateKey };
  }

  // Fall back to app_settings table
  const { data: pubData } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'VAPID_PUBLIC_KEY')
    .single();

  const { data: privData } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'VAPID_PRIVATE_KEY')
    .single();

  if (pubData?.value && privData?.value) {
    return { publicKey: pubData.value, privateKey: privData.value };
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const vapidKeys = await getVapidKeys(supabase);
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@coachsportif-rennes.fr';

    if (!vapidKeys) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, type, title, body, url } = await req.json() as PushPayload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetUserIds: string[] = [];

    if (type === 'new_signup' || type === 'new_booking_admin') {
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      targetUserIds = (adminRoles || []).map((r: any) => r.user_id);
    } else if (userId) {
      targetUserIds = [userId];
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No target users found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/espace-client?tab=messages',
    });

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const webPush = await import("https://esm.sh/web-push@3.6.6");
          webPush.setVapidDetails(VAPID_SUBJECT, vapidKeys.publicKey, vapidKeys.privateKey);

          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          await webPush.sendNotification(pushSubscription, payload);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error('Error sending push:', error);
          if (error.statusCode === 404 || error.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-push function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
