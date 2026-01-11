import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CLIENT_ID = 'loh9vmmeprzaevga91nxoa69jg';
const CLIENT_SECRET = 'va8ylds4ugpddc8wg2ejabdxyburwbmiljz8gm7wg59qtpucalxzr1zt9i';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`;
    
    const response = await fetch('https://api.notificationapi.com/sender/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        notificationId: 'rise_staff',
        user: {
          id: 'jolonlevene98@gmail.com',
          number: '+15005550006'
        },
        mergeTags: {},
        options: {
          sms: {
            message: 'Your verification code is: 123456. Reply STOP to opt-out.'
          }
        }
      }),
    });

    const result = await response.json();
    console.log('NotificationAPI response:', result);

    return new Response(JSON.stringify({
      success: response.ok,
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
