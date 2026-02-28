import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, MapPin, DoorOpen, Trash2, Calendar, User, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import LandlordWallet from "@/components/LandlordWallet";

type Hostel = Database["public"]["Tables"]["hostels"]["Row"];

interface BookingRow {
  id: string;
  student_id: string;
  hostel_id: string;
  room_id: string | null;
  deposit_amount: number;
  platform_fee: number;
  total_paid: number;
  escrow_status: string;
  booked_at: string;
  confirmed_at: string | null;
  hostels: { name: string };
  rooms: { room_number: string } | null;
  profiles: { full_name: string; email: string; phone: string | null } | null;
}

const escrowColors: Record<string, string> = {
  held_in_escrow: "bg-amber-500/20 text-amber-700",
  released_to_landlord: "bg-primary/20 text-primary",
  refunded_to_student: "bg-blue-500/20 text-blue-700",
  under_review: "bg-destructive/20 text-destructive",
};

export default function LandlordDashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (role !== "landlord") { navigate("/student/dashboard"); return; }
    fetchData();

    // Real-time booking notifications
    const channel = supabase
      .channel("landlord-bookings")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, (payload) => {
        toast.info("📱 New booking received!");
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, role]);

  const fetchData = async () => {
    const [hostelsRes, bookingsRes] = await Promise.all([
      supabase.from("hostels").select("*").eq("landlord_id", user?.id).order("created_at", { ascending: false }),
      supabase.from("bookings")
        .select("*, hostels(name), rooms(room_number), profiles(full_name, email, phone)")
        .in("hostel_id", (await supabase.from("hostels").select("id").eq("landlord_id", user?.id!)).data?.map((h) => h.id) || [])
        .order("booked_at", { ascending: false }),
    ]);
    if (hostelsRes.data) setHostels(hostelsRes.data);
    if (bookingsRes.data) setBookings(bookingsRes.data as BookingRow[]);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hostel listing?")) return;
    const { error } = await supabase.from("hostels").delete().eq("id", id);
    if (error) toast.error("Failed to delete hostel");
    else { toast.success("Hostel deleted successfully"); fetchData(); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Landlord Dashboard</h1>
            <p className="text-muted-foreground">Manage your hostels and view bookings</p>
          </div>
          <Link to="/landlord/add-hostel">
            <Button variant="hero"><Plus className="mr-2 h-4 w-4" /> Add Hostel</Button>
          </Link>
        </div>

        <Tabs defaultValue="hostels">
          <TabsList className="mb-6">
            <TabsTrigger value="hostels">My Hostels</TabsTrigger>
            <TabsTrigger value="bookings">
              Bookings
              {bookings.filter((b) => b.escrow_status === "held_in_escrow").length > 0 && (
                <Badge className="ml-2 bg-amber-500/20 text-amber-700 text-xs">
                  {bookings.filter((b) => b.escrow_status === "held_in_escrow").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="wallet">
              <Wallet className="mr-1 h-4 w-4" /> Wallet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hostels">
            {loading ? (
              <p className="text-center py-12 text-muted-foreground">Loading hostels...</p>
            ) : hostels.length === 0 ? (
              <Card className="p-12 text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Hostels Listed</h3>
                <p className="text-muted-foreground mb-6">Start by adding your first hostel</p>
                <Link to="/landlord/add-hostel"><Button variant="hero"><Plus className="mr-2 h-4 w-4" /> Add Hostel</Button></Link>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {hostels.map((hostel) => {
                  const availableRooms = hostel.total_rooms - hostel.occupied_rooms;
                  const isFull = availableRooms === 0;
                  return (
                    <Card key={hostel.id} className="overflow-hidden bg-gradient-to-br from-card to-muted/20 shadow-[var(--shadow-card)]">
                      <div className="aspect-video bg-muted">
                        {hostel.images && hostel.images.length > 0 ? (
                          <img src={hostel.images[0]} alt={hostel.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                            <DoorOpen className="h-16 w-16 text-primary/40" />
                          </div>
                        )}
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xl font-semibold line-clamp-1">{hostel.name}</h3>
                          {hostel.is_verified ? <Badge className="shrink-0 bg-primary">Verified</Badge> : <Badge variant="secondary" className="shrink-0">Pending</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" /><span className="line-clamp-1">{hostel.location}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><p className="text-muted-foreground">Total Rooms</p><p className="font-medium">{hostel.total_rooms}</p></div>
                          <div><p className="text-muted-foreground">Available</p><p className={`font-medium ${isFull ? "text-destructive" : "text-primary"}`}>{availableRooms}</p></div>
                        </div>
                        <div className="pt-4 border-t border-border">
                          <p className="text-2xl font-bold text-primary">KSh {hostel.rent_per_month.toLocaleString()}<span className="text-sm text-muted-foreground font-normal">/month</span></p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/hostels/${hostel.id}`)}>Manage Rooms</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(hostel.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            {bookings.length === 0 ? (
              <Card className="p-12 text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Bookings Yet</h3>
                <p className="text-muted-foreground">Bookings will appear here when students book your rooms</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="p-5 space-y-3 shadow-[var(--shadow-card)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{booking.hostels?.name} — {booking.rooms?.room_number || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.booked_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={escrowColors[booking.escrow_status] || "bg-muted"}>
                        {booking.escrow_status === "held_in_escrow" ? "Deposit Held" :
                         booking.escrow_status === "released_to_landlord" ? "Completed" :
                         booking.escrow_status === "refunded_to_student" ? "Refunded" :
                         booking.escrow_status === "under_review" ? "Under Review" : booking.escrow_status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.profiles?.full_name || "Student"}</span>
                      <span className="text-muted-foreground">• {booking.profiles?.email}</span>
                      {booking.profiles?.phone && <span className="text-muted-foreground">• {booking.profiles?.phone}</span>}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-muted rounded p-2">
                      <div>Deposit: <span className="font-semibold">KSh {booking.deposit_amount?.toLocaleString()}</span></div>
                      <div>Fee: <span className="font-semibold">KSh {booking.platform_fee?.toLocaleString()}</span></div>
                      <div>Total: <span className="font-bold text-primary">KSh {booking.total_paid?.toLocaleString()}</span></div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="wallet">
            <LandlordWallet />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
