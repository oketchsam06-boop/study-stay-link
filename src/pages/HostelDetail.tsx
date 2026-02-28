import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import ImageLightbox from "@/components/ImageLightbox";
import BookingConfirmDialog from "@/components/BookingConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, DoorOpen, Loader2, ArrowLeft, Plus, BedDouble, Pencil, Trash2, RotateCcw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const PLATFORM_FEE = 50;

interface Hostel {
  id: string; name: string; location: string; description: string | null;
  distance_from_gate: number | null; images: string[] | null; is_verified: boolean | null;
  landlord_id: string; title_deed_image: string | null; [key: string]: any;
}

interface Room {
  id: string; hostel_id: string; room_number: string; price_per_month: number;
  deposit_amount: number; is_vacant: boolean; description: string | null; images: string[] | null;
}

export default function HostelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingRoomId, setBookingRoomId] = useState<string | null>(null);
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [markingVacantId, setMarkingVacantId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => { if (id) { fetchHostel(); fetchRooms(); } }, [id]);

  const fetchHostel = async () => {
    const { data, error } = await supabase.from("hostels").select("*").eq("id", id).maybeSingle();
    if (data && !error) setHostel(data as Hostel);
    else { toast.error("Hostel not found"); navigate("/hostels"); }
    setLoading(false);
  };

  const fetchRooms = async () => {
    const { data } = await supabase.from("rooms").select("*").eq("hostel_id", id!).order("room_number");
    if (data) setRooms(data as Room[]);
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleBookRoomClick = (room: Room) => {
    if (!user) { toast.error("Please sign in to book a room"); navigate("/auth"); return; }
    if (role !== "student") { toast.error("Only students can book rooms"); return; }
    setBookingRoom(room);
    setConfirmDialogOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!bookingRoom || !user || !hostel) return;
    const room = bookingRoom;
    setBookingRoomId(room.id);
    try {
      // Fresh vacancy check
      const { data: freshRoom } = await supabase.from("rooms").select("is_vacant").eq("id", room.id).single();
      if (!freshRoom || !freshRoom.is_vacant) {
        toast.error("This room has already been booked");
        setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, is_vacant: false } : r));
        setConfirmDialogOpen(false);
        setBookingRoomId(null);
        return;
      }

      const depositAmount = room.deposit_amount || room.price_per_month;
      const totalPaid = depositAmount + PLATFORM_FEE;

      // Insert booking — trigger handles escrow_status + room vacancy atomically
      const { data: booking, error } = await supabase.from("bookings").insert({
        student_id: user.id,
        hostel_id: hostel.id,
        room_id: room.id,
        deposit_amount: depositAmount,
        platform_fee: PLATFORM_FEE,
        payment_amount: totalPaid,
        payment_status: "completed",
        mpesa_transaction_id: `MOCK${Date.now()}`,
      }).select().single();

      if (error) {
        if (error.message?.includes("ROOM_ALREADY_BOOKED")) {
          setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, is_vacant: false } : r));
          toast.error("This room was just booked by another student");
          setConfirmDialogOpen(false);
          return;
        }
        throw error;
      }

      // Create receipt
      if (booking) {
        const receiptNumber = `HL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        await supabase.from("receipts").insert({
          booking_id: booking.id,
          student_id: user.id,
          receipt_number: receiptNumber,
          deposit_amount: depositAmount,
          platform_fee: PLATFORM_FEE,
          total_paid: totalPaid,
          payment_method: "mpesa",
          status: "deposit_held",
        });
      }

      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, is_vacant: false } : r));
      setConfirmDialogOpen(false);
      toast.success("Room booked! Deposit held in escrow.");
      navigate("/student/dashboard");
    } catch {
      toast.error("Booking failed. Please try again.");
    } finally {
      setBookingRoomId(null);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    setDeletingRoomId(roomId);
    try {
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) throw error;
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      toast.success("Room deleted successfully");
    } catch { toast.error("Failed to delete room"); }
    finally { setDeletingRoomId(null); }
  };

  const handleMarkVacant = async (roomId: string) => {
    setMarkingVacantId(roomId);
    try {
      const { error } = await supabase.from("rooms").update({ is_vacant: true }).eq("id", roomId);
      if (error) throw error;
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, is_vacant: true } : r));
      toast.success("Room marked as vacant");
    } catch { toast.error("Failed to update room"); }
    finally { setMarkingVacantId(null); }
  };

  const isOwner = user && hostel && hostel.landlord_id === user.id;
  const vacantRooms = rooms.filter((r) => r.is_vacant);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container px-4 py-8"><Skeleton className="h-[400px] rounded-lg mb-8" /><Skeleton className="h-[200px] rounded-lg" /></div>
    </div>
  );

  if (!hostel) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <ImageLightbox images={lightboxImages} initialIndex={lightboxIndex} open={lightboxOpen} onOpenChange={setLightboxOpen} />

      {bookingRoom && (
        <BookingConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={(open) => { setConfirmDialogOpen(open); if (!open) setBookingRoom(null); }}
          roomNumber={bookingRoom.room_number}
          depositAmount={bookingRoom.deposit_amount || bookingRoom.price_per_month}
          platformFee={PLATFORM_FEE}
          loading={bookingRoomId === bookingRoom.id}
          onConfirm={handleConfirmBooking}
        />
      )}

      <div className="container px-4 py-8 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate("/hostels")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hostels
        </Button>

        {/* Hostel Info */}
        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted shadow-[var(--shadow-card)] cursor-pointer"
              onClick={() => hostel.images?.length && openLightbox(hostel.images, 0)}>
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
                  <div key={i} className="aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer"
                    onClick={() => openLightbox(hostel.images!, i + 1)}>
                    <img src={img} alt={`${hostel.name} ${i + 2}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{hostel.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="h-5 w-5" /><span>{hostel.location}</span>
              </div>
              {hostel.distance_from_gate && (
                <p className="text-muted-foreground">📍 {hostel.distance_from_gate}km from main gate</p>
              )}
            </div>
            {hostel.description && (
              <div><h2 className="font-semibold text-lg mb-1">About</h2><p className="text-muted-foreground">{hostel.description}</p></div>
            )}
            <Card className="p-5 bg-gradient-to-br from-card to-muted/20">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Vacant Rooms</p><p className="text-3xl font-bold text-primary">{vacantRooms.length}</p></div>
                <div><p className="text-sm text-muted-foreground">Total Rooms</p><p className="text-3xl font-bold">{rooms.length}</p></div>
              </div>
            </Card>
            {isOwner && (
              <Button variant="hero" className="w-full" onClick={() => navigate(`/landlord/hostel/${hostel.id}/add-room`)}>
                <Plus className="mr-2 h-4 w-4" /> Add Vacant Room
              </Button>
            )}
          </div>
        </div>

        {/* Rooms Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">{isOwner ? "All Rooms" : "Available Rooms"}</h2>
          {(isOwner ? rooms : vacantRooms).length === 0 ? (
            <Card className="p-12 text-center">
              <BedDouble className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Rooms Yet</h3>
              <p className="text-muted-foreground">
                {isOwner ? "Add rooms to start receiving bookings" : "No vacant rooms available at the moment"}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(isOwner ? rooms : vacantRooms).map((room) => (
                <Card key={room.id} className="overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow">
                  <div className="aspect-video bg-muted cursor-pointer"
                    onClick={() => room.images?.length && openLightbox(room.images, 0)}>
                    {room.images && room.images.length > 0 ? (
                      <img src={room.images[0]} alt={room.room_number} className="w-full h-full object-cover" />
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
                        {room.is_vacant ? "Vacant" : "Booked"}
                      </Badge>
                    </div>
                    {room.description && <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>}
                    <div className="flex items-baseline justify-between pt-2 border-t border-border">
                      <span className="text-xl font-bold text-primary">KSh {room.price_per_month.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>

                    {role === "student" && room.is_vacant && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground bg-muted rounded p-2">
                          <div className="flex justify-between"><span>Deposit</span><span>KSh {(room.deposit_amount || room.price_per_month).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Platform Fee</span><span>KSh {PLATFORM_FEE}</span></div>
                          <div className="flex justify-between font-semibold border-t border-border/50 mt-1 pt-1">
                            <span>Total</span><span>KSh {((room.deposit_amount || room.price_per_month) + PLATFORM_FEE).toLocaleString()}</span>
                          </div>
                        </div>
                        <Button variant="hero" className="w-full" size="sm" disabled={bookingRoomId === room.id} onClick={() => handleBookRoomClick(room)}>
                          {bookingRoomId === room.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Book Now — KSh {((room.deposit_amount || room.price_per_month) + PLATFORM_FEE).toLocaleString()}
                        </Button>
                      </div>
                    )}

                    {isOwner && (
                      <div className="flex flex-col gap-2">
                        {!room.is_vacant && (
                          <Button variant="outline" size="sm" className="w-full" disabled={markingVacantId === room.id} onClick={() => handleMarkVacant(room.id)}>
                            {markingVacantId === room.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
                            Mark as Vacant
                          </Button>
                        )}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/landlord/hostel/${hostel.id}/room/${room.id}/edit`)}>
                            <Pencil className="mr-1 h-3 w-3" /> Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="flex-1" disabled={deletingRoomId === room.id}>
                                {deletingRoomId === room.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {room.room_number}?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteRoom(room.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
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
