import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  event_type: 'visitor' | 'form_submission' | 'clip_upload' | 'playlist_change';
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
    const { event_type, title, body, data }: NotifyRequest = await req.json();

    if (!event_type || !title || !body) {
      throw new Error('Missing required fields: event_type, title, body');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log notification event
    await supabaseClient
      .from('staff_notification_events')
      .insert({
        event_type,
        event_data: { title, body, data }
      });

    // Get VAPID keys
    const { data: config, error: configError } = await supabaseClient
      .from('push_config')
      .select('*')
      .limit(1)
      .single();

    if (configError || !config) {
      throw new Error('VAPID keys not configured');
    }

    // Get all staff subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('staff_web_push_subscriptions')
      .select('subscription, user_id');

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Notify Staff] No staff subscriptions found');
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`[Notify Staff] Sending to ${subscriptions.length} staff members`);

    // Send to all staff members
    const results = await Promise.allSettled(
      subscriptions.map(async ({ subscription }) => {
        const sub = subscription as any;
        const endpoint = sub.endpoint;
        const audience = new URL(endpoint).origin;

        const jwt = await createJWT(config.private_key, audience);

        const payload = JSON.stringify({
          title,
          body,
          icon: '/lovable-uploads/icon-192x192.png',
          badge: '/lovable-uploads/icon-192x192.png',
          data: data || {},
        });

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'Authorization': `vapid t=${jwt}, k=${config.public_key}`,
            'TTL': '86400',
          },
          body: payload,
        });

        if (!response.ok) {
          console.error(`[Notify Staff] Push failed: ${response.status}`);
          throw new Error(`Push notification failed: ${response.status}`);
        }

        return { success: true };
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    console.log(`[Notify Staff] Sent: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failureCount 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Notify Staff] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
