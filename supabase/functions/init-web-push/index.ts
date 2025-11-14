import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to generate VAPID keys
async function generateVAPIDKeys() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyRaw = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  // Convert to base64url
  const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const privateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyRaw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { publicKey, privateKey };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if VAPID keys already exist
    const { data: existingConfig, error: fetchError } = await supabaseClient
      .from('push_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let config = existingConfig;

    // If no config exists, generate and store new keys
    if (!config) {
      console.log('Generating new VAPID keys...');
      const { publicKey, privateKey } = await generateVAPIDKeys();

      const { data: newConfig, error: insertError } = await supabaseClient
        .from('push_config')
        .insert({ public_key: publicKey, private_key: privateKey })
        .select()
        .single();

      if (insertError) throw insertError;
      config = newConfig;
      console.log('VAPID keys generated and stored');
    }

    // Return only the public key to client
    return new Response(
      JSON.stringify({ publicKey: config.public_key }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in init-web-push:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});