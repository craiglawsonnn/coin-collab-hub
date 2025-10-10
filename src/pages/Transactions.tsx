import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const viewingOwnerId = searchParams.get("owner") || user?.id;
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [direction, setDirection] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchPage();
  }, [sort, direction, page, viewingOwnerId]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const limit = 50;
      let query: any = supabase
        .from("transactions")
        .select("*")
        .eq("user_id", viewingOwnerId);
      if (sort === "date") query = query.order("date", { ascending: direction === "asc" }).range(page * limit, page * limit + limit - 1);
      else if (sort === "amount") query = query.order("net_flow", { ascending: direction === "asc" }).range(page * limit, page * limit + limit - 1);

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(viewingOwnerId !== user?.id ? `/?owner=${viewingOwnerId}` : '/')}>Back</Button>
          <h2 className="text-2xl font-bold">All Transactions</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setSort("date"); setDirection((d) => d === "asc" ? "desc" : "asc"); }}>
            Sort by date
          </Button>
          <Button onClick={() => { setSort("amount"); setDirection((d) => d === "asc" ? "desc" : "asc"); }}>
            Sort by amount
          </Button>
        </div>
      </div>

      <Card className="p-4">
        {loading ? <p>Loading...</p> : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{t.description || "No description"}</div>
                  <div className="text-xs text-muted-foreground">{t.category} • {t.account} • {new Date(t.date).toLocaleDateString()}</div>
                </div>
                <div className="font-bold">€{(Number(t.net_flow) || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-between items-center mt-4">
        <Button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
        <div>Page {page + 1}</div>
        <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
