import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, DoorOpen, CheckCircle2, Loader2, ArrowLeft, Plus, BedDouble } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Hostel {
  id: string;
  name: string;
  location: string;
  description: string | null;
  distance_from_gate: number | null;
  images: string[] | null;
  is_verified: boolean | null;
  landlord_id: string;
  title_deed_image: string | null;
  [key: string]: any;
}

interface Room {
  id: string;
  hostel_id: string;
  room_number: string;
  price_per_month: number;
  is_vacant: boolean;
  description: string | null;
  images: string[] | null;
}

export default function HostelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingRoomId, setBookingRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchHostel();
      fetchRooms();
    }
  }, [id]);

  const fetchHostel = async () => {
    const { data, error } = await supabase
      .from("hostels")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (data && !error) {
      setHostel(data as Hostel);
    } else {
      toast.error("Hostel not found");
      navigate("/hostels");
    }
    setLoading(false);
  };

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("hostel_id", id!)
      .order("room_number");

    if (data) setRooms(data as Room[]);
  };

  const handleBookRoom = async (room: Room) => {
    if (!user) {
      toast.error("Please sign in to book a room");
      navigate("/auth");
      return;
    }
    if (role !== "student") {
      toast.error("Only students can book rooms");
      return;
    }
    if (!room.is_vacant) {
      toast.error("This room is no longer vacant");
      return;
    }

    setBookingRoomId(room.id);

    try {
      const { error } = await supabase.from("bookings").insert({
        student_id: user.id,
        hostel_id: hostel!.id,
        room_id: room.id,
        payment_amount: 50,
        payment_status: "completed",
        mpesa_transaction_id: `MOCK${Date.now()}`,
      });

      if (error) throw error;

      // Mark room as not vacant
      await supabase
        .from("rooms")
        .update({ is_vacant: false })
        .eq("id", room.id);

      toast.success("Room booked successfully!");
      navigate("/student/dashboard");
    } catch (error) {
      toast.error("Booking failed. Please try again.");
    } finally {
      setBookingRoomId(null);
    }
  };

  const isOwner = user && hostel && hostel.landlord_id === user.id;
  const vacantRooms = rooms.filter((r) => r.is_vacant);

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

        {/* Hostel Info */}
        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted shadow-[var(--shadow-card)]">
              {hostel.images && hostel.images.length > 0 ? (
                <img src={hostel.images[0]} alt={hostel.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <DoorOpen className="h-24 w-24 text-primary/40" />
                </div>
              )}
            </div>
            {hostel.images && hostel.images.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {hostel.images.slice(1, 4).map((img, i) => (
                  <div key={i} className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <img src={img} alt={`${hostel.name} ${i + 2}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-bold mb-2">{hostel.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="h-5 w-5" />
                <span>{hostel.location}</span>
              </div>
              {hostel.distance_from_gate && (
                <p className="text-muted-foreground">
                  📍 {hostel.distance_from_gate}km from main gate
                </p>
              )}
            </div>

            {hostel.description && (
              <div>
                <h2 className="font-semibold text-lg mb-1">About</h2>
                <p className="text-muted-foreground">{hostel.description}</p>
              </div>
            )}

            <Card className="p-5 bg-gradient-to-br from-card to-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vacant Rooms</p>
                  <p className="text-3xl font-bold text-primary">{vacantRooms.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Rooms</p>
                  <p className="text-3xl font-bold">{rooms.length}</p>
                </div>
              </div>
            </Card>

            {isOwner && (
              <Button
                variant="hero"
                className="w-full"
                onClick={() => navigate(`/landlord/hostel/${hostel.id}/add-room`)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Vacant Room
              </Button>
            )}
          </div>
        </div>

        {/* Rooms Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {isOwner ? "All Rooms" : "Available Rooms"}
          </h2>

          {(isOwner ? rooms : vacantRooms).length === 0 ? (
            <Card className="p-12 text-center">
              <BedDouble className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Rooms Yet</h3>
              <p className="text-muted-foreground">
                {isOwner
                  ? "Add rooms to start receiving bookings"
                  : "No vacant rooms available at the moment"}
              </p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(isOwner ? rooms : vacantRooms).map((room) => (
                <Card
                  key={room.id}
                  className="overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow"
                >
                  <div className="aspect-video bg-muted">
                    {room.images && room.images.length > 0 ? (
                      <img
                        src={room.images[0]}
                        alt={room.room_number}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <BedDouble className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{room.room_number}</h3>
                      <Badge className={room.is_vacant ? "bg-primary" : "bg-destructive"}>
                        {room.is_vacant ? "Vacant" : "Occupied"}
                      </Badge>
                    </div>
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-baseline justify-between pt-2 border-t border-border">
                      <span className="text-xl font-bold text-primary">
                        KSh {room.price_per_month.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>

                    {role === "student" && room.is_vacant && (
                      <Button
                        variant="hero"
                        className="w-full"
                        size="sm"
                        disabled={bookingRoomId === room.id}
                        onClick={() => handleBookRoom(room)}
                      >
                        {bookingRoomId === room.id && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Book Now - KSh 50
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
