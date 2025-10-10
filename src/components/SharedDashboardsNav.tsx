import { useState, useEffect } from "react";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";

export default function SharedDashboardsNav() {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const fetchShared = async () => {
      setLoading(true);
      try {
        // get dashboards shared with current user that are accepted
        const { data: shares } = await supabase
          .from("dashboard_shares")
          .select("owner_id, role")
          .eq("shared_with_user_id", user?.id)
          .eq("status", "accepted")
          .limit(50);

        if (!shares || shares.length === 0) {
          setShared([]);
          return;
        }

        // Fetch owner profiles from searchable_profiles
        const ownerIds = shares.map(s => s.owner_id);
        const { data: profiles } = await supabase
          .from("searchable_profiles")
          .select("id, full_name, email")
          .in("id", ownerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const sharesWithProfiles = shares.map(s => ({
          ...s,
          profiles: profileMap.get(s.owner_id) || { id: s.owner_id, full_name: null, email: null }
        }));

        setShared(sharesWithProfiles);
      } catch (err) {
        setShared([]);
      } finally {
        setLoading(false);
      }
    };
    fetchShared();
  }, [open, user]);

  const goTo = (ownerId: string) => {
    // navigate to root with owner query param
    navigate(`/?owner=${ownerId}`);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Dashboards</DrawerTitle>
          <DrawerDescription>Quickly switch between your dashboards and ones shared with you</DrawerDescription>
        </DrawerHeader>

        <div className="p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">My Dashboard</h3>
            <div className="mt-2">
              <Button size="sm" onClick={() => goTo(user?.id || "")} className="w-full text-left">Your dashboard</Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium">Shared With Me</h3>
            <div className="mt-2 space-y-2 max-h-64 overflow-auto">
              {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!loading && shared.length === 0 && <div className="text-sm text-muted-foreground">No shared dashboards</div>}
              {shared.map((s) => {
                const owner = s.profiles || { full_name: s.owner_id };
                return (
                  <Button key={s.owner_id} variant="ghost" size="sm" className="w-full text-left" onClick={() => goTo(s.owner_id)}>
                    {owner.full_name || owner.email || s.owner_id} ({s.role})
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
