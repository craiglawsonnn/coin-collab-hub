import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus, Check, X, Trash2, Edit } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Invite {
  id: string;
  owner_id: string;
  shared_with_user_id: string;
  role: string;
  status: string;
  profiles: Profile;
}

export default function InviteManager({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"viewer" | "editor">("viewer");
  const [sentInvites, setSentInvites] = useState<Invite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([]);
  const [editingInvite, setEditingInvite] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<"viewer" | "editor">("viewer");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchInvites();
    }
  }, [open, user]);

  useEffect(() => {
    if (!query) return setResults([]);
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        // Use searchable_profiles view for optimized search
        const { data, error } = await supabase
          .from("searchable_profiles")
          .select("id,full_name,email")
          .neq("id", user?.id || "")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(10);
        if (error) throw error;
        setResults((data || []) as Profile[]);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, user]);

  const fetchInvites = async () => {
    if (!user) return;
    try {
      // Fetch invites sent by current user
      const { data: sent } = await supabase
        .from("dashboard_shares")
        .select("id, owner_id, shared_with_user_id, role, status")
        .eq("owner_id", user.id);

      // Fetch invites received by current user
      const { data: received } = await supabase
        .from("dashboard_shares")
        .select("id, owner_id, shared_with_user_id, role, status")
        .eq("shared_with_user_id", user.id);

      // Fetch profile data for all relevant users using searchable_profiles view
      const userIds = new Set<string>();
      (sent || []).forEach(s => userIds.add(s.shared_with_user_id));
      (received || []).forEach(r => userIds.add(r.owner_id));

      const { data: profiles } = await supabase
        .from("searchable_profiles")
        .select("id, full_name, email")
        .in("id", Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map sent invites with profile data
      const sentWithProfiles = (sent || []).map(s => ({
        ...s,
        profiles: profileMap.get(s.shared_with_user_id) || { id: s.shared_with_user_id, full_name: null, email: null }
      }));

      // Map received invites with profile data
      const receivedWithProfiles = (received || []).map(r => ({
        ...r,
        profiles: profileMap.get(r.owner_id) || { id: r.owner_id, full_name: null, email: null }
      }));

      setSentInvites(sentWithProfiles);
      setReceivedInvites(receivedWithProfiles);
    } catch (err: any) {
      console.error(err);
    }
  };

  const sendInvite = async (userId: string) => {
    try {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase.from("dashboard_shares").insert({
        owner_id: user.id,
        shared_with_user_id: userId,
        role: selectedRole,
        status: "pending",
      });
      if (error) throw error;
      
      toast({ title: "Invite sent", description: `Dashboard invite sent as ${selectedRole}` });
      setQuery("");
      setResults([]);
      fetchInvites();
    } catch (err: any) {
      toast({ title: "Error sending invite", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const updateInviteStatus = async (inviteId: string, status: "accepted" | "rejected") => {
    try {
      const { error } = await supabase
        .from("dashboard_shares")
        .update({ status })
        .eq("id", inviteId);
      if (error) throw error;
      
      toast({ title: status === "accepted" ? "Invite accepted" : "Invite declined" });
      fetchInvites();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("dashboard_shares")
        .delete()
        .eq("id", inviteId);
      if (error) throw error;
      
      toast({ title: "Invite revoked" });
      fetchInvites();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const updatePermission = async (inviteId: string, newRole: "viewer" | "editor") => {
    try {
      const { error } = await supabase
        .from("dashboard_shares")
        .update({ role: newRole })
        .eq("id", inviteId);
      if (error) throw error;
      
      toast({ title: "Permission updated" });
      setEditingInvite(null);
      fetchInvites();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "pending") return <Badge variant="outline">Pending</Badge>;
    if (status === "accepted") return <Badge variant="default">Accepted</Badge>;
    return <Badge variant="secondary">Declined</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Dashboard Invites</DialogTitle>
          <DialogDescription>Invite users to view or edit your dashboard</DialogDescription>
        </DialogHeader>

        {/* Send new invite */}
        <div className="grid gap-4 py-4">
          <div>
            <Label>Search and invite users</Label>
            <Input 
              placeholder="Type a name or email" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
            />
          </div>

          {query && (
            <div className="space-y-2">
              {loading && <div className="text-sm text-muted-foreground">Searching…</div>}
              {!loading && results.length === 0 && <div className="text-sm text-muted-foreground">No users found</div>}
              {results.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 p-2 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{r.full_name || r.email}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "viewer" | "editor")}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => sendInvite(r.id)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Invite
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Pending invites received */}
        {receivedInvites.filter(i => i.status === "pending").length > 0 && (
          <>
            <div>
              <h3 className="font-semibold mb-2">Pending Invites ({receivedInvites.filter(i => i.status === "pending").length})</h3>
              <div className="space-y-2">
                {receivedInvites.filter(i => i.status === "pending").map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 border rounded bg-muted/30">
                    <div>
                      <div className="font-medium">{invite.profiles?.full_name || invite.profiles?.email || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">wants to share as {invite.role}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => updateInviteStatus(invite.id, "accepted")}>
                        <Check className="h-4 w-4 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateInviteStatus(invite.id, "rejected")}>
                        <X className="h-4 w-4 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Accepted dashboards shared with me */}
        {receivedInvites.filter(i => i.status === "accepted").length > 0 && (
          <>
            <div>
              <h3 className="font-semibold mb-2">Shared With Me</h3>
              <div className="space-y-2">
                {receivedInvites.filter(i => i.status === "accepted").map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{invite.profiles?.full_name || invite.profiles?.email || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">Role: {invite.role}</div>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => revokeInvite(invite.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Leave
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Sent invites (pending and accepted) */}
        {sentInvites.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">My Invites</h3>
            <div className="space-y-2">
              {sentInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{invite.profiles?.full_name || invite.profiles?.email || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {getStatusBadge(invite.status)}
                      {editingInvite === invite.id ? (
                        <Select value={editingRole} onValueChange={(v) => setEditingRole(v as "viewer" | "editor")}>
                          <SelectTrigger className="w-28 h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>Role: {invite.role}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {editingInvite === invite.id ? (
                      <>
                        <Button size="sm" onClick={() => updatePermission(invite.id, editingRole)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingInvite(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setEditingInvite(invite.id);
                          setEditingRole(invite.role as "viewer" | "editor");
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => revokeInvite(invite.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
