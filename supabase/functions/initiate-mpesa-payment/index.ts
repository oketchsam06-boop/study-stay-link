import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, amount, booking_id } = await req.json();

    // Note: To enable Mpesa payments, you need to:
    // 1. Sign up for Mpesa Daraja API at https://developer.safaricom.co.ke/
    // 2. Get your Consumer Key, Consumer Secret, Shortcode, and Passkey
    // 3. Add them as secrets in your project settings
    
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const shortcode = Deno.env.get('MPESA_SHORTCODE');
    const passkey = Deno.env.get('MPESA_PASSKEY');

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      console.log('Mpesa credentials not configured. Simulating payment...');
      
      // Simulate payment for demo purposes
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment initiated (Demo Mode)',
          transaction_id: `DEMO${Date.now()}`,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Get OAuth token
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    const { access_token } = await tokenResponse.json();

    // Initiate STK Push
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const stkResponse = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phone_number,
          PartyB: shortcode,
          PhoneNumber: phone_number,
          CallBackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`,
          AccountReference: booking_id,
          TransactionDesc: 'Hostel Booking Payment',
        }),
      }
    );

    const result = await stkResponse.json();

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error initiating payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
