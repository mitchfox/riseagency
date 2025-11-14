import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  player_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Helper to convert base64url to Uint8Array
function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper to create JWT for Web Push
async function createJWT(privateKey: string, audience: string): Promise<string> {
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 43200, // 12 hours
    sub: 'mailto:noreply@riseportal.app'
  };

  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const payloadBase64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const message = `${headerBase64}.${payloadBase64}`;
  
  // Import private key
  const privateKeyBuffer = base64UrlToUint8Array(privateKey);
  const privateKeyArrayBuffer = privateKeyBuffer.buffer.slice(
    privateKeyBuffer.byteOffset,
    privateKeyBuffer.byteOffset + privateKeyBuffer.byteLength
  ) as ArrayBuffer;
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyArrayBuffer,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  );

  // Sign the message
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    cryptoKey,
    encoder.encode(message)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${message}.${signatureBase64}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { player_id, title, body, data }: PushPayload = await req.json();

    if (!player_id || !title || !body) {
      throw new Error('Missing required fields: player_id, title, body');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get VAPID keys
    const { data: config, error: configError } = await supabaseClient
      .from('push_config')
      .select('*')
      .limit(1)
      .single();

    if (configError || !config) {
      throw new Error('VAPID keys not configured');
    }

    // Get player's web push subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from('web_push_subscriptions')
      .select('subscription')
      .eq('player_id', player_id)
      .maybeSingle();

    if (subError) throw subError;

    if (!subscription) {
      console.log(`No web push subscription found for player ${player_id}`);
      return new Response(
        JSON.stringify({ message: 'No subscription found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const pushSubscription = subscription.subscription as any;
    const endpoint = pushSubscription.endpoint;
    
    // Extract audience from endpoint
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // Create JWT
    const jwt = await createJWT(config.private_key, audience);

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      data: data || {},
    });

    // Send push notification
    const pushResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `vapid t=${jwt}, k=${config.public_key}`,
        'TTL': '86400',
      },
      body: notificationPayload,
    });

    if (!pushResponse.ok) {
      const errorText = await pushResponse.text();
      console.error('Push notification failed:', errorText);
      throw new Error(`Push failed: ${pushResponse.status} - ${errorText}`);
    }

    console.log(`Web push notification sent to player ${player_id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending web push:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});