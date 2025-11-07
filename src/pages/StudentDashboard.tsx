import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  hostels: Database["public"]["Tables"]["hostels"]["Row"];
};

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (profile?.role !== "student") {
      navigate("/landlord/dashboard");
      return;
    }

    fetchBookings();
  }, [user, profile]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, hostels(*)")
      .eq("student_id", user?.id)
      .order("booked_at", { ascending: false });

    if (data && !error) {
      setBookings(data as Booking[]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">
            View and manage your hostel bookings
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Bookings Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start by browsing available hostels
            </p>
            <Button onClick={() => navigate("/hostels")} variant="hero">
              Browse Hostels
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card
                key={booking.id}
                className="p-6 bg-gradient-to-br from-card to-muted/20 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-[var(--transition-smooth)]"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-48 aspect-video rounded-lg overflow-hidden bg-muted">
                    {booking.hostels?.images &&
                    booking.hostels.images.length > 0 ? (
                      <img
                        src={booking.hostels.images[0]}
                        alt={booking.hostels.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Building2 className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        {booking.hostels?.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{booking.hostels?.location}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>
                          Booked: {new Date(booking.booked_at).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge
                        variant={
                          booking.payment_status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {booking.payment_status === "completed"
                          ? "Payment Confirmed"
                          : "Payment Pending"}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Rent: KSh {booking.hostels?.rent_per_month.toLocaleString()}/month
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
