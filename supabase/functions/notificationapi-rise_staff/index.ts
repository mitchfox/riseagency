import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CLIENT_ID = 'loh9vmmeprzaevga91nxoa69jg';
const CLIENT_SECRET = 'va8ylds4ugpddc8wg2ejabdxyburwbmiljz8gm7wg59qtpucalxzr1zt9i';
const API_HOST = 'api.notificationapi.com';
const REGION = 'us-east-1';
const SERVICE = 'execute-api';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions for AWS Signature v4
function toHex(data: Uint8Array): string {
  return Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Async(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const msgBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return toHex(new Uint8Array(hashBuffer));
}

async function hmacSha256(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(data)
  );
  
  return new Uint8Array(signature);
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode(`AWS4${key}`), dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

async function signRequest(
  method: string,
  path: string,
  body: string,
  host: string
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  // Canonical request components
  const canonicalUri = path;
  const canonicalQuerystring = '';
  const payloadHash = await sha256Async(body);
  
  const canonicalHeaders = 
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n`;
  
  const signedHeaders = 'content-type;host;x-amz-date';
  
  const canonicalRequest = 
    `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  // String to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const canonicalRequestHash = await sha256Async(canonicalRequest);
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
  
  // Signing key and signature
  const signingKey = await getSignatureKey(CLIENT_SECRET, dateStamp, REGION, SERVICE);
  const signatureBytes = await hmacSha256(signingKey, stringToSign);
  const signature = toHex(signatureBytes);
  
  // Authorization header
  const authorizationHeader = 
    `${algorithm} Credential=${CLIENT_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;
  
  return {
    'Content-Type': 'application/json',
    'Host': host,
    'X-Amz-Date': amzDate,
    'Authorization': authorizationHeader,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, email } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Phone number is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Message is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Sending SMS to:', phone, 'with message:', message);

    const payload = {
      notificationId: 'rise_staff',
      user: {
        id: email || phone,
        number: phone.startsWith('+') ? phone : `+${phone}`
      },
      mergeTags: {},
      options: {
        sms: {
          message: message
        }
      }
    };

    const bodyStr = JSON.stringify(payload);
    const path = `/${CLIENT_ID}/sender/send`;
    
    // Sign the request with AWS Signature v4
    const signedHeaders = await signRequest('POST', path, bodyStr, API_HOST);

    console.log('Making signed request to NotificationAPI...');

    const response = await fetch(`https://${API_HOST}${path}`, {
      method: 'POST',
      headers: signedHeaders,
      body: bodyStr,
    });

    const responseText = await response.text();
    console.log('NotificationAPI response status:', response.status);
    console.log('NotificationAPI response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (!response.ok) {
      console.error('NotificationAPI error:', response.status, result);
      return new Response(JSON.stringify({
        success: false,
        error: result.message || `API error: ${response.status}`,
        details: result
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      result
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});