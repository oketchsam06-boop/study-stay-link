import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, hostel_name, booking_details } = await req.json();

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.log('Resend API key not configured. Email not sent.');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Email service not configured',
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: "HostelLink <onboarding@resend.dev>",
      to: [email],
      subject: `Booking Confirmation - ${hostel_name}`,
      html: `
        <h1>Booking Successful!</h1>
        <p>Thank you for booking with HostelLink.</p>
        <h2>Booking Details:</h2>
        <ul>
          <li><strong>Hostel:</strong> ${hostel_name}</li>
          <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
          <li><strong>Payment:</strong> KSh ${booking_details.amount}</li>
        </ul>
        <p>The landlord will contact you shortly with further details.</p>
        <p>Best regards,<br>The HostelLink Team</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
