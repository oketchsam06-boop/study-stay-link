import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Loader2, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface WalletData {
  id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export default function LandlordWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (user) fetchWallet();
  }, [user]);

  const fetchWallet = async () => {
    // Get or create wallet
    let { data: w } = await supabase
      .from("wallets")
      .select("*")
      .eq("landlord_id", user!.id)
      .maybeSingle();

    if (!w) {
      const { data: created } = await supabase
        .from("wallets")
        .insert({ landlord_id: user!.id })
        .select()
        .single();
      w = created;
    }

    if (w) {
      setWallet(w);
      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", w.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (txns) setTransactions(txns);
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || !wallet) { toast.error("Enter a valid amount"); return; }
    if (amount > wallet.balance) { toast.error("Insufficient balance"); return; }

    setWithdrawing(true);
    try {
      // Insert withdrawal transaction
      const { error: txnErr } = await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        type: "withdrawal",
        amount: -amount,
        description: `Withdrawal of KSh ${amount.toLocaleString()} to M-Pesa`,
      });
      if (txnErr) throw txnErr;

      // Update wallet balance
      const { error: walErr } = await supabase.from("wallets").update({
        balance: wallet.balance - amount,
        total_withdrawn: wallet.total_withdrawn + amount,
      }).eq("id", wallet.id);
      if (walErr) throw walErr;

      toast.success(`KSh ${amount.toLocaleString()} withdrawal initiated!`);
      setWithdrawAmount("");
      fetchWallet();
    } catch {
      toast.error("Withdrawal failed. Try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  const txnIcon = (type: string) => {
    if (type === "deposit_release") return <ArrowDownToLine className="h-4 w-4 text-primary" />;
    if (type === "withdrawal") return <ArrowUpFromLine className="h-4 w-4 text-destructive" />;
    return <History className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) return <p className="text-center py-8 text-muted-foreground">Loading wallet...</p>;

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-primary/20">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-3xl font-bold text-primary">KSh {wallet?.balance?.toLocaleString() || "0"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div>
              <p className="text-muted-foreground">Total Earned</p>
              <p className="font-semibold">KSh {wallet?.total_earned?.toLocaleString() || "0"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Total Withdrawn</p>
              <p className="font-semibold">KSh {wallet?.total_withdrawn?.toLocaleString() || "0"}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Withdraw */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <ArrowUpFromLine className="h-4 w-4" /> Withdraw Funds
        </h3>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Amount (KSh)"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="flex-1"
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="hero" disabled={!withdrawAmount || withdrawing}>
                Withdraw
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Withdrawal</AlertDialogTitle>
                <AlertDialogDescription>
                  KSh {parseFloat(withdrawAmount || "0").toLocaleString()} will be sent to your M-Pesa account. This is a mock withdrawal for demo purposes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleWithdraw} disabled={withdrawing}>
                  {withdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Withdrawal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {/* Transaction History */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <History className="h-4 w-4" /> Transaction History
        </h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((txn) => (
              <div key={txn.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {txnIcon(txn.type)}
                    <div>
                      <p className="text-sm font-medium">
                        {txn.type === "deposit_release" ? "Deposit Released" :
                         txn.type === "withdrawal" ? "Withdrawal" : txn.type}
                      </p>
                      <p className="text-xs text-muted-foreground">{txn.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${txn.amount > 0 ? "text-primary" : "text-destructive"}`}>
                      {txn.amount > 0 ? "+" : ""}KSh {Math.abs(txn.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
