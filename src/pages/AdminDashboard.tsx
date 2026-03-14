import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, User, Building2, Calendar, Wallet } from "lucide-react";
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
  escrow_status: string;
  booked_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  dispute_reason: string | null;
  admin_resolution: string | null;
  hostels: { name: string; landlord_id: string } | null;
  rooms: { room_number: string } | null;
  profiles: { full_name: string; email: string; phone: string | null } | null;
}

const escrowColors: Record<string, string> = {
  held_in_escrow: "bg-amber-500/20 text-amber-700",
  released_to_landlord: "bg-primary/20 text-primary",
  refunded_to_student: "bg-blue-500/20 text-blue-700",
  under_review: "bg-destructive/20 text-destructive",
  pending: "bg-muted text-muted-foreground",
};

const escrowLabels: Record<string, string> = {
  held_in_escrow: "Deposit Held",
  released_to_landlord: "Completed",
  refunded_to_student: "Refunded",
  under_review: "Under Review",
  pending: "Pending",
};

export default function AdminDashboard() {
  const { user, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!roles.includes("admin")) { navigate("/"); return; }
    fetchBookings();
  }, [user, roles, authLoading]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, hostels(name, landlord_id), rooms(room_number), profiles!bookings_student_id_fkey(full_name, email, phone)")
      .order("booked_at", { ascending: false });
    console.log("Admin bookings fetch:", { count: data?.length, error });
    if (data) setBookings(data as BookingRow[]);
    setLoading(false);
  };

  const handleResolveRelease = async (booking: BookingRow) => {
    setActionId(booking.id);
    try {
      const { error } = await supabase.rpc("admin_release_booking", {
        _booking_id: booking.id,
        _resolution: resolutionNote || "Admin released deposit to landlord",
      });
      if (error) throw error;

      toast.success("Deposit released to landlord");
      setResolutionNote("");
      fetchBookings();
    } catch { toast.error("Failed to resolve dispute"); }
    finally { setActionId(null); }
  };

  const handleResolveRefund = async (booking: BookingRow) => {
    setActionId(booking.id);
    try {
      const { error } = await supabase.rpc("admin_refund_booking", {
        _booking_id: booking.id,
        _resolution: resolutionNote || "Admin refunded deposit to student",
      });
      if (error) throw error;

      toast.success("Deposit refunded to student");
      setResolutionNote("");
      fetchBookings();
    } catch { toast.error("Failed to resolve dispute"); }
    finally { setActionId(null); }
  };

  const disputes = bookings.filter((b) => b.escrow_status === "under_review");
  const escrowHeld = bookings.filter((b) => b.escrow_status === "held_in_escrow");
  const resolved = bookings.filter((b) => ["released_to_landlord", "refunded_to_student"].includes(b.escrow_status));

  const stats = {
    total: bookings.length,
    disputes: disputes.length,
    escrow: escrowHeld.length,
    resolved: resolved.length,
    totalEscrow: escrowHeld.reduce((sum, b) => sum + b.deposit_amount, 0),
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage disputes, escrow, and platform operations</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Bookings</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4 text-center border-destructive/30">
            <p className="text-sm text-destructive">Open Disputes</p>
            <p className="text-3xl font-bold text-destructive">{stats.disputes}</p>
          </Card>
          <Card className="p-4 text-center border-amber-300">
            <p className="text-sm text-amber-700">In Escrow</p>
            <p className="text-3xl font-bold text-amber-700">KSh {stats.totalEscrow.toLocaleString()}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-3xl font-bold text-primary">{stats.resolved}</p>
          </Card>
        </div>

        <Tabs defaultValue="disputes">
          <TabsList className="mb-6">
            <TabsTrigger value="disputes">
              Disputes {disputes.length > 0 && <Badge className="ml-2 bg-destructive/20 text-destructive text-xs">{disputes.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="escrow">
              Escrow {escrowHeld.length > 0 && <Badge className="ml-2 bg-amber-500/20 text-amber-700 text-xs">{escrowHeld.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="all">All Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="disputes">
            {disputes.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">No Open Disputes</h3>
                <p className="text-muted-foreground">All disputes have been resolved</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {disputes.map((booking) => (
                  <DisputeCard key={booking.id} booking={booking} actionId={actionId}
                    resolutionNote={resolutionNote} setResolutionNote={setResolutionNote}
                    onRelease={() => handleResolveRelease(booking)} onRefund={() => handleResolveRefund(booking)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="escrow">
            {escrowHeld.length === 0 ? (
              <Card className="p-12 text-center">
                <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Funds in Escrow</h3>
              </Card>
            ) : (
              <div className="space-y-4">
                {escrowHeld.map((b) => <BookingCard key={b.id} booking={b} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {loading ? <p className="text-center py-12 text-muted-foreground">Loading...</p> : (
              <div className="space-y-4">
                {bookings.map((b) => <BookingCard key={b.id} booking={b} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: BookingRow }) {
  return (
    <Card className="p-5 space-y-3 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{booking.hostels?.name} — {booking.rooms?.room_number || "N/A"}</p>
          <p className="text-sm text-muted-foreground">{new Date(booking.booked_at).toLocaleDateString()}</p>
        </div>
        <Badge className={escrowColors[booking.escrow_status] || "bg-muted"}>
          {escrowLabels[booking.escrow_status] || booking.escrow_status}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span>{booking.profiles?.full_name || "Student"}</span>
        <span className="text-muted-foreground">• {booking.profiles?.email}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs bg-muted rounded p-2">
        <div>Deposit: <span className="font-semibold">KSh {booking.deposit_amount?.toLocaleString()}</span></div>
        <div>Fee: <span className="font-semibold">KSh {booking.platform_fee?.toLocaleString()}</span></div>
        <div>Total: <span className="font-bold text-primary">KSh {booking.total_paid?.toLocaleString()}</span></div>
      </div>
      {booking.admin_resolution && (
        <div className="bg-primary/10 rounded p-2 text-xs"><strong>Resolution:</strong> {booking.admin_resolution}</div>
      )}
    </Card>
  );
}

function DisputeCard({ booking, actionId, resolutionNote, setResolutionNote, onRelease, onRefund }: {
  booking: BookingRow; actionId: string | null;
  resolutionNote: string; setResolutionNote: (v: string) => void;
  onRelease: () => void; onRefund: () => void;
}) {
  return (
    <Card className="p-5 space-y-4 border-destructive/30 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{booking.hostels?.name} — {booking.rooms?.room_number || "N/A"}</p>
          <p className="text-sm text-muted-foreground">{new Date(booking.booked_at).toLocaleDateString()}</p>
        </div>
        <Badge className="bg-destructive/20 text-destructive"><AlertTriangle className="mr-1 h-3 w-3" /> Dispute</Badge>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span>{booking.profiles?.full_name}</span>
        <span className="text-muted-foreground">• {booking.profiles?.email}</span>
        {booking.profiles?.phone && <span className="text-muted-foreground">• {booking.profiles?.phone}</span>}
      </div>

      <div className="bg-destructive/10 rounded-lg p-3 text-sm">
        <strong className="text-destructive">Dispute Reason:</strong>
        <p className="mt-1">{booking.dispute_reason}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs bg-muted rounded p-2">
        <div>Deposit: <span className="font-semibold">KSh {booking.deposit_amount?.toLocaleString()}</span></div>
        <div>Fee: <span className="font-semibold">KSh {booking.platform_fee?.toLocaleString()}</span></div>
        <div>Total: <span className="font-bold text-primary">KSh {booking.total_paid?.toLocaleString()}</span></div>
      </div>

      <Textarea placeholder="Admin resolution note..." value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} />

      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="default" size="sm" disabled={actionId === booking.id}>
              <CheckCircle className="mr-1 h-3 w-3" /> Release to Landlord
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Release deposit to landlord?</AlertDialogTitle>
              <AlertDialogDescription>KSh {booking.deposit_amount?.toLocaleString()} will be credited to the landlord's wallet.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRelease}>
                {actionId === booking.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Release Funds
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={actionId === booking.id}>
              <XCircle className="mr-1 h-3 w-3" /> Refund Student
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Refund deposit to student?</AlertDialogTitle>
              <AlertDialogDescription>KSh {booking.deposit_amount?.toLocaleString()} will be refunded and the room marked vacant.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onRefund}>
                {actionId === booking.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Refund
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
