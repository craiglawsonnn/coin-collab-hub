import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Adjustment {
  id: string;
  transaction_id: string;
  amount: number;
  as_of: string;
  note: string | null;
  created_at: string;
  undone_at?: string | null;
  undone_by?: string | null;
  created_by_name?: string | null;
  undone_by_name?: string | null;
}

export default function AdjustmentList({ onUndo }: { onUndo?: () => void }) {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToDelete, setSelectedToDelete] = useState<Adjustment | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      fetchAdjustments();
    }
  }, [authLoading, user]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("balance_adjustments")
        .select("id,transaction_id,amount,as_of,note,created_at,user_id,undone_at,undone_by")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const raw = data || [];

      // fetch profile names for user_id and undone_by
      const userIds = Array.from(new Set(raw.map((r: any) => r.user_id).filter(Boolean)));
      const undoneByIds = Array.from(new Set(raw.map((r: any) => r.undone_by).filter(Boolean)));
      const ids = Array.from(new Set([...userIds, ...undoneByIds]));

      let profilesMap: Record<string, { full_name?: string | null; email?: string | null }> = {};
      if (ids.length > 0) {
        const { data: profiles } = await (supabase as any).from("profiles").select("id,full_name,email").in("id", ids).limit(1000);
        for (const p of profiles || []) profilesMap[p.id] = p;
      }

      const withNames = raw.map((r: any) => ({
        ...r,
        created_by_name: profilesMap[r.user_id]?.full_name || profilesMap[r.user_id]?.email || null,
        undone_by_name: profilesMap[r.undone_by]?.full_name || profilesMap[r.undone_by]?.email || null,
      }));

      setAdjustments(withNames || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async (adjustment: Adjustment) => {
    try {
      if (!user) {
        toast({ title: "Not signed in", description: "You must be signed in to undo an adjustment", variant: "destructive" });
        return;
      }

      // Instead of deleting, mark adjustment as undone and insert a reversing transaction
      // reversing transaction: if original adjustment amount was positive (income), insert an expense of same amount, and vice versa
      const reverseTx: any = {
        user_id: user.id,
        date: new Date().toISOString().split("T")[0],
        category: "Misc",
        description: `UNDO: ${adjustment.note || "Balance rectified"}`,
        account: "Adjustment",
        payment_method: "Adjustment",
        gross_income: 0,
        net_income: 0,
        tax_paid: 0,
        expense: 0,
      };

      const amt = Number(adjustment.amount);
      if (amt > 0) {
        // original was positive (income), reverse with expense
        reverseTx.expense = Math.abs(amt);
      } else {
        // original was negative (expense), reverse with income
        reverseTx.net_income = Math.abs(amt);
        reverseTx.gross_income = Math.abs(amt);
      }

      const { data: txData, error: txErr } = await supabase.from("transactions").insert([reverseTx]).select("id").single();
      if (txErr) throw txErr;

      // mark adjustment as undone
      const { error: adjErr } = await (supabase as any)
        .from("balance_adjustments")
        .update({ undone_at: new Date().toISOString(), undone_by: user.id })
        .eq("id", adjustment.id);
      if (adjErr) throw adjErr;

      toast({ title: "Adjustment undone" });
      fetchAdjustments();
      onUndo?.();
    } catch (err: any) {
      toast({ title: "Error undoing", description: err.message || String(err), variant: "destructive" });
    }
  };

  const handleHardDelete = async (adjustment: Adjustment) => {
    try {
      // Delete transaction (if exists) and adjustment record
      const { error: txErr } = await supabase.from("transactions").delete().eq("id", adjustment.transaction_id);
      if (txErr) throw txErr;

      const { error: adjErr } = await (supabase as any).from("balance_adjustments").delete().eq("id", adjustment.id);
      if (adjErr) throw adjErr;

      toast({ title: "Adjustment permanently deleted" });
      setSelectedToDelete(null);
      fetchAdjustments();
      onUndo?.();
    } catch (err: any) {
      toast({ title: "Error deleting", description: err.message || String(err), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Balance Adjustments</h2>
        <p className="text-muted-foreground">Loading...</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Balance Adjustments</h2>
        </div>

        {adjustments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No adjustments yet.</p>
        ) : (
          <div className="space-y-3">
            {adjustments.map((adj) => {
              const isUndone = !!adj.undone_at;
              return (
                <div
                  key={adj.id}
                  className={`flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors ${isUndone ? "opacity-50 grayscale" : ""}`}
                >
                  <div>
                    <p className="font-medium">€{Number(adj.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{adj.note || "Balance rectified"}</p>
                    {adj.created_by_name && (
                      <p className="text-xs text-muted-foreground">By: {String(adj.created_by_name).split(" ")[0]}</p>
                    )}
                    <p className="text-xs text-muted-foreground">As of: {new Date(adj.as_of).toLocaleDateString()}</p>
                    {isUndone && adj.undone_at && (
                      <>
                        <p className="text-xs text-muted-foreground">Undone: {new Date(adj.undone_at).toLocaleString()}</p>
                        {adj.undone_by_name && (
                          <p className="text-xs text-muted-foreground">Undone by: {String(adj.undone_by_name).split(" ")[0]}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isUndone ? (
                      <Button variant="ghost" size="icon" onClick={() => handleUndo(adj)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => setSelectedToDelete(adj)}>
                        Delete permanently
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Confirm permanent delete dialog */}
      <Dialog open={!!selectedToDelete} onOpenChange={(open) => { if (!open) setSelectedToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete adjustment</DialogTitle>
            <DialogDescription>
              This will permanently delete the adjustment record and its related transaction. This action cannot be undone. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedToDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedToDelete && handleHardDelete(selectedToDelete)}
            >
              Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
