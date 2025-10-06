import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wallet } from "lucide-react";

export default function AccountBalances() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<{ account: string; balance: number }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("transactions").select("account,net_flow").limit(2000);
        if (error) throw error;
        const rows = data || [];
        if (!rows.length) {
          setAccounts([]);
          setLoading(false);
          return;
        }

        const map: Record<string, number> = {};
        for (const r of rows) {
          const acc = r.account || "(unknown)";
          const val = Number(r.net_flow || 0);
          map[acc] = (map[acc] || 0) + val;
        }

        const list = Object.entries(map).map(([account, balance]) => ({ account, balance }));
        // sort by balance desc
        list.sort((a, b) => b.balance - a.balance);
        setAccounts(list);
      } catch (err: any) {
        toast({ title: "Error fetching accounts", description: err.message || String(err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [open, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Accounts"
          className="group hover:bg-primary hover:text-white focus:bg-primary focus:text-white active:bg-primary active:text-white"
        >
          <Wallet className="h-5 w-5 text-primary transition-colors group-hover:text-white group-focus:text-white group-active:text-white" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Account Balances</DialogTitle>
          <DialogDescription>Balances across all accounts. Background will be dimmed while open.</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : accounts.length === 0 ? (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">No accounts</span>
              <span className="font-medium">€0.00</span>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.account} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <span className="text-sm">{a.account}</span>
                  <span className="font-medium">€{a.balance.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
