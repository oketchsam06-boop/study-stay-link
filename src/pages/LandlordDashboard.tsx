import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, MapPin, DoorOpen, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Hostel = Database["public"]["Tables"]["hostels"]["Row"];

export default function LandlordDashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (role !== "landlord") {
      navigate("/student/dashboard");
      return;
    }

    fetchHostels();
  }, [user, role]);

  const fetchHostels = async () => {
    const { data, error } = await supabase
      .from("hostels")
      .select("*")
      .eq("landlord_id", user?.id)
      .order("created_at", { ascending: false });

    if (data && !error) {
      setHostels(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hostel listing?")) {
      return;
    }

    const { error } = await supabase.from("hostels").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete hostel");
    } else {
      toast.success("Hostel deleted successfully");
      fetchHostels();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Hostels</h1>
            <p className="text-muted-foreground">
              Manage your hostel listings and bookings
            </p>
          </div>
          <Link to="/landlord/add-hostel">
            <Button variant="hero">
              <Plus className="mr-2 h-4 w-4" />
              Add Hostel
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading hostels...</p>
          </div>
        ) : hostels.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Hostels Listed</h3>
            <p className="text-muted-foreground mb-6">
              Start by adding your first hostel
            </p>
            <Link to="/landlord/add-hostel">
              <Button variant="hero">
                <Plus className="mr-2 h-4 w-4" />
                Add Hostel
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {hostels.map((hostel) => {
              const availableRooms = hostel.total_rooms - hostel.occupied_rooms;
              const isFull = availableRooms === 0;

              return (
                <Card
                  key={hostel.id}
                  className="overflow-hidden bg-gradient-to-br from-card to-muted/20 shadow-[var(--shadow-card)]"
                >
                  <div className="aspect-video bg-muted">
                    {hostel.images && hostel.images.length > 0 ? (
                      <img
                        src={hostel.images[0]}
                        alt={hostel.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <DoorOpen className="h-16 w-16 text-primary/40" />
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xl font-semibold line-clamp-1">
                        {hostel.name}
                      </h3>
                      {hostel.is_verified ? (
                        <Badge className="shrink-0 bg-primary">Verified</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          Pending
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{hostel.location}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Rooms</p>
                        <p className="font-medium">{hostel.total_rooms}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className={`font-medium ${isFull ? "text-destructive" : "text-primary"}`}>
                          {availableRooms}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <p className="text-2xl font-bold text-primary">
                        KSh {hostel.rent_per_month.toLocaleString()}
                        <span className="text-sm text-muted-foreground font-normal">
                          /month
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/hostels/${hostel.id}`)}
                      >
                        Manage Rooms
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(hostel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
