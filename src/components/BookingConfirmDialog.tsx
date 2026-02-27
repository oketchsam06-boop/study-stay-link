import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Loader2, Shield, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface BookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomNumber: string;
  depositAmount: number;
  platformFee: number;
  loading: boolean;
  onConfirm: () => void;
}

export default function BookingConfirmDialog({
  open, onOpenChange, roomNumber, depositAmount, platformFee, loading, onConfirm,
}: BookingConfirmDialogProps) {
  const total = depositAmount + platformFee;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">Confirm Booking — {roomNumber}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Room Deposit</span>
                  <span className="font-medium">KSh {depositAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="font-medium">KSh {platformFee.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">KSh {total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  Your deposit of <strong>KSh {depositAmount.toLocaleString()}</strong> will be held in escrow until you confirm the room after viewing. The platform fee of KSh {platformFee} is non-refundable.
                </span>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-accent/50 p-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Refund Policy:</strong> If you cancel before confirmation, your deposit will be refunded. The platform fee is non-refundable.
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-2">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button variant="hero" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pay KSh {total.toLocaleString()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
