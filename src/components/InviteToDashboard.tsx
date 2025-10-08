import { useState, useEffect } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface InviteToDashboardProps {
  dashboardId?: string;
}

export default function InviteToDashboard({ dashboardId }: InviteToDashboardProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!query) return setResults([]);
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id,full_name,email")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(10);
        if (error) throw error;
        setResults((data || []) as any[]);
      } catch (err: any) {
        // don't spam the user
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const sendInvite = async (userId: string, role: "viewer" | "editor" = "viewer") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const payload = {
        owner_id: user.id,
        shared_with_user_id: userId,
        role: role,
      };
      const { error } = await supabase.from("dashboard_shares").insert(payload);
      if (error) throw error;
      toast({ title: "Invite sent", description: `Dashboard shared as ${role}` });
      setQuery("");
      setResults([]);
    } catch (err: any) {
      toast({ title: "Error sending invite", description: err?.message || String(err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite someone to this dashboard</DialogTitle>
          <DialogDescription>Search users on the platform by name or email and invite them to view this dashboard.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          <Label>Search users</Label>
          <Input placeholder="Type a name or email" value={query} onChange={(e) => setQuery(e.target.value)} />

          <div className="max-h-56 overflow-auto mt-2 space-y-2">
            {loading && <div className="text-sm text-muted-foreground">Searching…</div>}
            {!loading && results.length === 0 && query && <div className="text-sm text-muted-foreground">No users found</div>}
            {results.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium">{r.full_name || r.email}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => sendInvite(r.id, "viewer")}>View</Button>
                  <Button size="sm" onClick={() => sendInvite(r.id, "editor")}>Edit</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
