import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import ReceiptCard from "@/components/ReceiptCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, Calendar, MapPin, CheckCircle, XCircle, AlertTriangle, Loader2, Receipt } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface BookingRow {
  id: string;
  student_id: string;
  hostel_id: string;
  room_id: string | null;
  deposit_amount: number;
  platform_fee: number;
  total_paid: number;
  payment_amount: number;
  payment_status: string;
  escrow_status: string;
  booked_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  dispute_reason: string | null;
  mpesa_transaction_id: string | null;
  hostels: { name: string; location: string; images: string[] | null; rent_per_month: number };
  rooms: { room_number: string; price_per_month: number } | null;
}

interface ReceiptRow {
  id: string;
  booking_id: string;
  receipt_number: string;
  deposit_amount: number;
  platform_fee: number;
  total_paid: number;
  payment_method: string;
  status: string;
  issued_at: string;
}

const escrowBadge: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  held_in_escrow: { label: "Deposit Held", className: "bg-amber-500/20 text-amber-700 border-amber-300" },
  released_to_landlord: { label: "Completed", className: "bg-primary/20 text-primary border-primary/30" },
  refunded_to_student: { label: "Refunded", className: "bg-blue-500/20 text-blue-700 border-blue-300" },
  under_review: { label: "Under Review", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

export default function StudentDashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [disputeText, setDisputeText] = useState("");

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (role !== "student") { navigate("/landlord/dashboard"); return; }
    fetchData();
  }, [user, role]);

  const fetchData = async () => {
    const [bookingsRes, receiptsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, hostels(name, location, images, rent_per_month), rooms(room_number, price_per_month)")
        .eq("student_id", user?.id)
        .order("booked_at", { ascending: false }),
      supabase
        .from("receipts")
        .select("*")
        .eq("student_id", user?.id)
        .order("issued_at", { ascending: false }),
    ]);
    if (bookingsRes.data) setBookings(bookingsRes.data as BookingRow[]);
    if (receiptsRes.data) setReceipts(receiptsRes.data as ReceiptRow[]);
    setLoading(false);
  };

  const handleConfirmRoom = async (bookingId: string) => {
    setActionId(bookingId);
    try {
      const { error } = await supabase.from("bookings").update({
        escrow_status: "released_to_landlord",
        confirmed_at: new Date().toISOString(),
      }).eq("id", bookingId);
      if (error) throw error;
      toast.success("Room confirmed! Deposit released to landlord.");
      fetchData();
    } catch { toast.error("Failed to confirm. Please try again."); }
    finally { setActionId(null); }
  };

  const handleCancelBooking = async (bookingId: string, roomId: string | null) => {
    setActionId(bookingId);
    try {
      const { error } = await supabase.from("bookings").update({
        escrow_status: "refunded_to_student",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "Student cancelled before confirmation",
      }).eq("id", bookingId);
      if (error) throw error;

      // Re-mark room as vacant
      if (roomId) {
        await supabase.from("rooms").update({ is_vacant: true }).eq("id", roomId);
      }

      toast.success("Booking cancelled. Deposit refunded.");
      fetchData();
    } catch { toast.error("Failed to cancel. Please try again."); }
    finally { setActionId(null); }
  };

  const handleRaiseDispute = async (bookingId: string) => {
    if (!disputeText.trim()) { toast.error("Please describe the issue"); return; }
    setActionId(bookingId);
    try {
      const { error } = await supabase.from("bookings").update({
        escrow_status: "under_review",
        dispute_reason: disputeText,
      }).eq("id", bookingId);
      if (error) throw error;
      toast.success("Dispute raised. Admin will review.");
      setDisputeText("");
      fetchData();
    } catch { toast.error("Failed to raise dispute."); }
    finally { setActionId(null); }
  };

  const getReceiptForBooking = (bookingId: string) => receipts.find((r) => r.booking_id === bookingId);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Manage your bookings and receipts</p>
        </div>

        <Tabs defaultValue="bookings">
          <TabsList className="mb-6">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            {loading ? (
              <p className="text-center py-12 text-muted-foreground">Loading bookings...</p>
            ) : bookings.length === 0 ? (
              <Card className="p-12 text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Bookings Yet</h3>
                <p className="text-muted-foreground mb-6">Start by browsing available hostels</p>
                <Button onClick={() => navigate("/hostels")} variant="hero">Browse Hostels</Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const badge = escrowBadge[booking.escrow_status] || escrowBadge.pending;
                  const isEscrow = booking.escrow_status === "held_in_escrow";
                  const receipt = getReceiptForBooking(booking.id);

                  return (
                    <Card key={booking.id} className="p-6 bg-gradient-to-br from-card to-muted/20 shadow-[var(--shadow-card)]">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-48 aspect-video rounded-lg overflow-hidden bg-muted">
                          {booking.hostels?.images && booking.hostels.images.length > 0 ? (
                            <img src={booking.hostels.images[0]} alt={booking.hostels.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                              <Building2 className="h-12 w-12 text-primary/40" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-xl font-semibold mb-1">{booking.hostels?.name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" /><span>{booking.hostels?.location}</span>
                              </div>
                            </div>
                            <Badge className={badge.className}>{badge.label}</Badge>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>Booked: {new Date(booking.booked_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-border space-y-1">
                            {booking.rooms && <p className="text-sm font-medium">Room: {booking.rooms.room_number}</p>}
                            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                              <div>Deposit: <span className="font-medium text-foreground">KSh {booking.deposit_amount?.toLocaleString()}</span></div>
                              <div>Fee: <span className="font-medium text-foreground">KSh {booking.platform_fee?.toLocaleString()}</span></div>
                              <div>Total: <span className="font-bold text-primary">KSh {booking.total_paid?.toLocaleString()}</span></div>
                            </div>
                          </div>

                          {receipt && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Receipt className="h-3 w-3" />
                              <span>Receipt: {receipt.receipt_number}</span>
                            </div>
                          )}

                          {/* Actions for escrow bookings */}
                          {isEscrow && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="default" size="sm" disabled={actionId === booking.id}>
                                    <CheckCircle className="mr-1 h-3 w-3" /> Confirm Room
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm this room?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Your deposit of KSh {booking.deposit_amount?.toLocaleString()} will be released to the landlord. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleConfirmRoom(booking.id)}>
                                      {actionId === booking.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Release Deposit
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" disabled={actionId === booking.id}>
                                    <XCircle className="mr-1 h-3 w-3" /> Cancel Booking
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Your deposit of KSh {booking.deposit_amount?.toLocaleString()} will be refunded. The platform fee of KSh {booking.platform_fee} is non-refundable.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleCancelBooking(booking.id, booking.room_id)}>
                                      {actionId === booking.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Cancel & Refund
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" disabled={actionId === booking.id}>
                                    <AlertTriangle className="mr-1 h-3 w-3" /> Raise Dispute
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Raise a dispute</AlertDialogTitle>
                                    <AlertDialogDescription>Describe the issue. An admin will review and decide on the deposit.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <Textarea placeholder="Describe the issue…" value={disputeText} onChange={(e) => setDisputeText(e.target.value)} className="mb-4" />
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setDisputeText("")}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRaiseDispute(booking.id)}>
                                      Submit Dispute
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}

                          {booking.escrow_status === "under_review" && booking.dispute_reason && (
                            <div className="bg-destructive/10 rounded p-2 text-xs text-destructive">
                              <strong>Dispute:</strong> {booking.dispute_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="receipts">
            {receipts.length === 0 ? (
              <Card className="p-12 text-center">
                <Receipt className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Receipts Yet</h3>
                <p className="text-muted-foreground">Receipts will appear here after you book a room</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {receipts.map((r) => {
                  const booking = bookings.find((b) => b.id === r.booking_id);
                  return (
                    <ReceiptCard
                      key={r.id}
                      receipt={{
                        ...r,
                        hostel_name: booking?.hostels?.name,
                        room_number: booking?.rooms?.room_number,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
