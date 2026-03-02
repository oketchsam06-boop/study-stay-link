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
    const { type, booking_id, student_id, hostel_name, room_number, deposit_amount, platform_fee, total_paid } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get student profile
    const { data: student } = await supabase.from('profiles').select('full_name, email, phone').eq('id', student_id).single();

    if (!student) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }

    const notifications: string[] = [];

    // --- SMS ---
    if (student.phone) {
      let smsMessage = '';
      switch (type) {
        case 'booking_confirmed':
          smsMessage = `HostelLink: Your booking at ${hostel_name} (Room ${room_number}) is confirmed! Deposit KSh ${deposit_amount} held in escrow. Booking ID: ${booking_id?.slice(0, 8)}`;
          break;
        case 'deposit_released':
          smsMessage = `HostelLink: You confirmed Room ${room_number} at ${hostel_name}. Deposit of KSh ${deposit_amount} released to landlord.`;
          break;
        case 'booking_cancelled':
          smsMessage = `HostelLink: Your booking at ${hostel_name} (Room ${room_number}) has been cancelled. Deposit of KSh ${deposit_amount} will be refunded.`;
          break;
        case 'dispute_resolved':
          smsMessage = `HostelLink: Your dispute for ${hostel_name} (Room ${room_number}) has been resolved. Check your dashboard for details.`;
          break;
        default:
          smsMessage = `HostelLink: Update on your booking at ${hostel_name}. Check your dashboard.`;
      }

      try {
        await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
          body: JSON.stringify({ phone_number: student.phone, message: smsMessage }),
        });
        notifications.push('sms');
      } catch (e) { console.error('SMS failed:', e); }
    }

    // --- Email ---
    try {
      let subject = '';
      let body = '';
      switch (type) {
        case 'booking_confirmed':
          subject = `Booking Confirmed — ${hostel_name}`;
          body = `Hi ${student.full_name},\n\nYour room (${room_number}) at ${hostel_name} has been booked!\n\nDeposit: KSh ${deposit_amount?.toLocaleString()}\nPlatform Fee: KSh ${platform_fee?.toLocaleString()}\nTotal Paid: KSh ${total_paid?.toLocaleString()}\n\nYour deposit is held in escrow until you confirm the room after viewing.\n\nBooking ID: ${booking_id}\n\n— HostelLink Team`;
          break;
        case 'deposit_released':
          subject = `Deposit Released — ${hostel_name}`;
          body = `Hi ${student.full_name},\n\nYou've confirmed Room ${room_number} at ${hostel_name}. Your deposit of KSh ${deposit_amount?.toLocaleString()} has been released to the landlord.\n\nEnjoy your new room!\n\n— HostelLink Team`;
          break;
        case 'booking_cancelled':
          subject = `Booking Cancelled — ${hostel_name}`;
          body = `Hi ${student.full_name},\n\nYour booking for Room ${room_number} at ${hostel_name} has been cancelled.\n\nYour deposit of KSh ${deposit_amount?.toLocaleString()} will be refunded.\n\n— HostelLink Team`;
          break;
        case 'dispute_resolved':
          subject = `Dispute Resolved — ${hostel_name}`;
          body = `Hi ${student.full_name},\n\nYour dispute for Room ${room_number} at ${hostel_name} has been resolved. Please check your dashboard for details.\n\n— HostelLink Team`;
          break;
      }

      if (subject) {
        await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
          body: JSON.stringify({ to: student.email, subject, body }),
        });
        notifications.push('email');
      }
    } catch (e) { console.error('Email failed:', e); }

    return new Response(JSON.stringify({ success: true, notifications_sent: notifications }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error: any) {
    console.error('Notification error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
