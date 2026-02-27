import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Download, Receipt } from "lucide-react";

interface ReceiptData {
  receipt_number: string;
  deposit_amount: number;
  platform_fee: number;
  total_paid: number;
  payment_method: string;
  status: string;
  issued_at: string;
  hostel_name?: string;
  room_number?: string;
}

const statusColors: Record<string, string> = {
  deposit_held: "bg-amber-500/20 text-amber-700 border-amber-300",
  released: "bg-primary/20 text-primary border-primary/30",
  refunded: "bg-blue-500/20 text-blue-700 border-blue-300",
};

export default function ReceiptCard({ receipt, onDownload }: { receipt: ReceiptData; onDownload?: () => void }) {
  return (
    <Card className="p-5 space-y-4 border-border/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-semibold">{receipt.receipt_number}</span>
        </div>
        <Badge className={statusColors[receipt.status] || "bg-muted"}>
          {receipt.status === "deposit_held" ? "Deposit Held" : receipt.status === "released" ? "Released" : receipt.status}
        </Badge>
      </div>

      {(receipt.hostel_name || receipt.room_number) && (
        <p className="text-sm text-muted-foreground">
          {receipt.hostel_name}{receipt.room_number ? ` — ${receipt.room_number}` : ""}
        </p>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span>KSh {receipt.deposit_amount.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Platform Fee</span><span>KSh {receipt.platform_fee.toLocaleString()}</span></div>
        <Separator />
        <div className="flex justify-between font-bold"><span>Total Paid</span><span className="text-primary">KSh {receipt.total_paid.toLocaleString()}</span></div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span>Via {receipt.payment_method.toUpperCase()}</span>
        <span>{new Date(receipt.issued_at).toLocaleDateString()}</span>
      </div>

      {onDownload && (
        <Button variant="outline" size="sm" className="w-full" onClick={onDownload}>
          <Download className="mr-2 h-3 w-3" /> Download Receipt
        </Button>
      )}
    </Card>
  );
}
