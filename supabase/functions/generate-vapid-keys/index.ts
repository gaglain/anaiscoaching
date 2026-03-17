import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Web Push VAPID key generation using Web Crypto API
async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  // URL-safe base64 encode
  const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // For VAPID private key, we need the raw 32-byte D value from JWK
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const privateKey = jwk.d!;

  return { publicKey, privateKey };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate new VAPID keys
    const keys = await generateVapidKeys();

    console.log('Generated new VAPID keys, public key length:', keys.publicKey.length);

    // Store keys in app_settings table for persistence
    for (const [key, value] of [['VAPID_PUBLIC_KEY', keys.publicKey], ['VAPID_PRIVATE_KEY', keys.privateKey]]) {
      await supabase.from('app_settings').upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    }

    // Clear old push subscriptions since keys changed
    await supabase.from('push_subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    return new Response(
      JSON.stringify({
        success: true,
        publicKey: keys.publicKey,
        message: 'VAPID keys generated. Update your secrets with these values.',
        instructions: {
          VAPID_PUBLIC_KEY: keys.publicKey,
          VAPID_PRIVATE_KEY: keys.privateKey,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error generating VAPID keys:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
