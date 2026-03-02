import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('M-Pesa callback payload:', JSON.stringify(payload));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Extract M-Pesa STK Push callback data
    const stkCallback = payload?.Body?.stkCallback;
    if (!stkCallback) {
      return new Response(JSON.stringify({ error: 'Invalid callback format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const resultCode = stkCallback.ResultCode;
    const merchantRequestId = stkCallback.MerchantRequestID;
    const checkoutRequestId = stkCallback.CheckoutRequestID;

    if (resultCode !== 0) {
      console.log(`Payment failed: ${stkCallback.ResultDesc}`);
      // Payment failed — find booking by checkout request and mark failed
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, room_id')
        .eq('mpesa_transaction_id', checkoutRequestId)
        .single();

      if (booking) {
        await supabase.from('bookings').update({
          payment_status: 'failed',
          escrow_status: 'pending',
        }).eq('id', booking.id);

        // Re-mark room as vacant
        if (booking.room_id) {
          await supabase.from('rooms').update({ is_vacant: true }).eq('id', booking.room_id);
        }
      }

      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // Extract callback metadata
    const items = stkCallback.CallbackMetadata?.Item || [];
    const amount = items.find((i: any) => i.Name === 'Amount')?.Value;
    const mpesaReceiptNumber = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
    const transactionDate = items.find((i: any) => i.Name === 'TransactionDate')?.Value;
    const phoneNumber = items.find((i: any) => i.Name === 'PhoneNumber')?.Value;

    console.log(`Payment successful: ${mpesaReceiptNumber}, Amount: ${amount}, Phone: ${phoneNumber}`);

    // Find and update booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, student_id, hostel_id, room_id, deposit_amount, platform_fee, total_paid')
      .eq('mpesa_transaction_id', checkoutRequestId)
      .single();

    if (booking) {
      await supabase.from('bookings').update({
        payment_status: 'completed',
        escrow_status: 'held_in_escrow',
        mpesa_transaction_id: mpesaReceiptNumber,
      }).eq('id', booking.id);

      // Get hostel name for notification
      const { data: hostel } = await supabase.from('hostels').select('name').eq('id', booking.hostel_id).single();
      const { data: room } = await supabase.from('rooms').select('room_number').eq('id', booking.room_id!).single();

      // Trigger notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
          body: JSON.stringify({
            type: 'booking_confirmed',
            booking_id: booking.id,
            student_id: booking.student_id,
            hostel_name: hostel?.name,
            room_number: room?.room_number,
            deposit_amount: booking.deposit_amount,
            platform_fee: booking.platform_fee,
            total_paid: booking.total_paid,
          }),
        });
      } catch (e) { console.error('Notification trigger failed:', e); }
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error: any) {
    console.error('Callback error:', error);
    return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
