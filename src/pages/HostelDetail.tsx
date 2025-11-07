import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, DoorOpen, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";

type Hostel = Database["public"]["Tables"]["hostels"]["Row"];

export default function HostelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (id) {
      fetchHostel();
    }
  }, [id]);

  const fetchHostel = async () => {
    const { data, error } = await supabase
      .from("hostels")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (data && !error) {
      setHostel(data);
    } else {
      toast.error("Hostel not found");
      navigate("/hostels");
    }
    setLoading(false);
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error("Please sign in to book a hostel");
      navigate("/auth");
      return;
    }

    if (profile?.role !== "student") {
      toast.error("Only students can book hostels");
      return;
    }

    if (!hostel) return;

    const availableRooms = hostel.total_rooms - hostel.occupied_rooms;
    if (availableRooms === 0) {
      toast.error("This hostel is currently full");
      return;
    }

    setBooking(true);

    // In a real app, this would initiate Mpesa payment
    // For now, we'll simulate the booking
    try {
      const { error } = await supabase.from("bookings").insert({
        student_id: user.id,
        hostel_id: hostel.id,
        payment_amount: 50,
        payment_status: "completed",
        mpesa_transaction_id: `MOCK${Date.now()}`,
      });

      if (error) throw error;

      // Update occupied rooms
      await supabase
        .from("hostels")
        .update({ occupied_rooms: hostel.occupied_rooms + 1 })
        .eq("id", hostel.id);

      toast.success("Booking successful! You'll receive details via email.");
      navigate("/student/dashboard");
    } catch (error) {
      toast.error("Booking failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container px-4 py-8">
          <Skeleton className="h-[400px] rounded-lg mb-8" />
          <Skeleton className="h-[200px] rounded-lg" />
        </div>
      </div>
    );
  }

  if (!hostel) return null;

  const availableRooms = hostel.total_rooms - hostel.occupied_rooms;
  const isFull = availableRooms === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/hostels")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Hostels
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted shadow-[var(--shadow-card)]">
              {hostel.images && hostel.images.length > 0 ? (
                <img
                  src={hostel.images[0]}
                  alt={hostel.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <DoorOpen className="h-24 w-24 text-primary/40" />
                </div>
              )}
            </div>

            {hostel.images && hostel.images.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {hostel.images.slice(1, 4).map((img, i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-lg overflow-hidden bg-muted"
                  >
                    <img
                      src={img}
                      alt={`${hostel.name} ${i + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold">{hostel.name}</h1>
                {hostel.is_verified && (
                  <Badge className="bg-primary">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="h-5 w-5" />
                <span>{hostel.location}</span>
              </div>

              {hostel.distance_from_gate && (
                <p className="text-muted-foreground">
                  📍 {hostel.distance_from_gate}km from main gate
                </p>
              )}
            </div>

            <Card className="p-6 bg-gradient-to-br from-card to-muted/20">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-primary">
                    KSh {hostel.rent_per_month.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Rooms:</span>
                    <span className="font-medium">{hostel.total_rooms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-medium text-primary">
                      {availableRooms} rooms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plot Number:</span>
                    <span className="font-medium">{hostel.plot_number}</span>
                  </div>
                </div>

                <Button
                  onClick={handleBooking}
                  disabled={isFull || booking}
                  variant="hero"
                  className="w-full"
                  size="lg"
                >
                  {booking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isFull ? "Fully Booked" : "Book Now - KSh 50"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Pay KSh 50 booking fee via Mpesa
                </p>
              </div>
            </Card>

            {hostel.description && (
              <div>
                <h2 className="font-semibold text-lg mb-2">Description</h2>
                <p className="text-muted-foreground">{hostel.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
