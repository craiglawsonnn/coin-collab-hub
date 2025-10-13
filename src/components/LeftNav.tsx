import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Home,
  Layers,
  Users,
  Settings,
  LayoutGrid,
  UserPlus,
  Menu,
  Inbox,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InviteManager from "@/components/InviteManager";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SharedDash = { id: string; name: string; owner?: string };
type PendingInvite = {
  id?: string;                // nullable in case your table lacks a PK id
  owner_id: string;
  role?: string | null;
  created_at?: string | null;
  inviter_name?: string | null;
  inviter_email?: string | null;
};

export default function LeftNav({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const ownerParam = searchParams.get("owner");

  const [shared, setShared] = useState<SharedDash[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // NEW: pending invite inbox state
  const [inboxOpen, setInboxOpen] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [actingOn, setActingOn] = useState<string | undefined>(undefined);

  // Load shared dashboards
  async function loadSharedDashboards() {
    if (!user?.id) return;
    
    setLoadingShared(true);
    try {
      const { data: shares, error } = await supabase
        .from("dashboard_shares")
        .select("owner_id, role, status")
        .eq("shared_with_user_id", user.id)
        .eq("status", "accepted");

      if (error) {
        console.error("Error loading shared dashboards:", error);
        setShared([]);
      } else if (shares && shares.length > 0) {
        const ownerIds = shares.map((s) => s.owner_id);
        const { data: profiles } = await supabase
          .from("searchable_profiles")
          .select("id, full_name, email")
          .in("id", ownerIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
        const rows = shares.map((share: any) => {
          const profile = profileMap.get(share.owner_id);
          return {
            id: share.owner_id,
            name: profile?.full_name || profile?.email || "Shared Dashboard",
            owner: profile?.email || share.owner_id,
          };
        });
        setShared(rows);
      } else {
        setShared([]);
      }
    } catch (err) {
      console.error("Error:", err);
      setShared([]);
    } finally {
      setLoadingShared(false);
    }
  }

  useEffect(() => {
    loadSharedDashboards();
  }, [user?.id]);

  // NEW: load pending invites
  useEffect(() => {
    if (!user?.id) return;
    refreshInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function refreshInbox() {
    try {
      setLoadingInbox(true);
      const { data: pend, error } = await supabase
        .from("dashboard_shares")
        .select("id, owner_id, role, status, created_at")
        .eq("shared_with_user_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const owners = (pend || []).map((p) => p.owner_id);
      let profilesMap = new Map<string, { full_name: string | null; email: string | null }>();
      if (owners.length) {
        const { data: profiles } = await supabase
          .from("searchable_profiles")
          .select("id, full_name, email")
          .in("id", owners);

        profilesMap = new Map((profiles || []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]));
      }

      const enriched: PendingInvite[] = (pend || []).map((p: any) => {
        const prof = profilesMap.get(p.owner_id);
        return {
          id: p.id,
          owner_id: p.owner_id,
          role: p.role,
          created_at: p.created_at,
          inviter_name: prof?.full_name ?? null,
          inviter_email: prof?.email ?? null,
        };
      });
      setPendingInvites(enriched);
    } catch (e) {
      console.error("Failed to load pending invites:", e);
      setPendingInvites([]);
    } finally {
      setLoadingInbox(false);
    }
  }

  async function acceptInvite(inv: PendingInvite) {
    setActingOn(inv.id);
    try {
      // prefer id, else fall back to owner/shared_with composite
      const q = supabase.from("dashboard_shares").update({ status: "accepted" });
      const { error } =
        inv.id
          ? await q.eq("id", inv.id)
          : await q.match({ owner_id: inv.owner_id, shared_with_user_id: user!.id });
      if (error) throw error;
    } catch (e) {
      console.error(e);
    } finally {
      setActingOn(undefined);
      await refreshInbox();
      await loadSharedDashboards(); // Refresh shared dashboards list
    }
  }

  async function declineInvite(inv: PendingInvite) {
    setActingOn(inv.id);
    try {
      const q = supabase.from("dashboard_shares").update({ status: "rejected" });
      const { error } =
        inv.id
          ? await q.eq("id", inv.id)
          : await q.match({ owner_id: inv.owner_id, shared_with_user_id: user!.id });
      if (error) throw error;
    } catch (e) {
      console.error(e);
    } finally {
      setActingOn(undefined);
      await refreshInbox();
    }
  }

  return (
    <SidebarProvider>
      {/* Floating burger — only when collapsed */}
      <FloatingBurger />

      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-between h-14 px-3">
              <div className="text-lg font-bold">CoinCollab</div>
              <HeaderBurger />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <Accordion type="multiple" defaultValue={["home"]} className="w-full">
                  {/* Home group */}
                  <AccordionItem value="home" className="border-none">
                    <AccordionTrigger className="px-2 py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        <span>Home</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2">
                      <div className="flex flex-col gap-1 pl-8 pr-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => navigate(ownerParam ? `/?owner=${ownerParam}` : "/")}
                        >
                          <LayoutGrid className="mr-2 h-4 w-4" />
                          Main dashboard
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() =>
                            navigate(ownerParam ? `/transactions?owner=${ownerParam}` : "/transactions")
                          }
                        >
                          <Layers className="mr-2 h-4 w-4" />
                          Transactions
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => navigate(ownerParam ? `/graphs?owner=${ownerParam}` : "/graphs")}
                        >
                          <Layers className="mr-2 h-4 w-4" />
                          Graphs
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Users group */}
                  <AccordionItem value="users" className="border-none">
                    <AccordionTrigger className="px-2 py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Users</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2">
                      <div className="flex flex-col gap-1 pl-8 pr-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => setInviteOpen(true)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Invite User
                        </Button>

                        <div className="mt-2 text-xs uppercase text-muted-foreground px-2">
                          Shared with you
                        </div>

                        {loadingShared ? (
                          <div className="px-2 py-2 text-sm text-muted-foreground italic">Loading…</div>
                        ) : shared.length === 0 ? (
                          <div className="px-2 py-2 text-sm italic text-muted-foreground">
                            there are no dashboards that have been shared with you yet :(
                          </div>
                        ) : (
                          shared.map((d) => (
                            <Button
                              key={d.id}
                              variant="ghost"
                              size="sm"
                              className="justify-start"
                              onClick={() => navigate(`/?owner=${d.id}`)}
                              title={d.owner ? `Owner: ${d.owner}` : undefined}
                            >
                              <LayoutGrid className="mr-2 h-4 w-4" />
                              {d.name}
                            </Button>
                          ))
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <div className="flex flex-col gap-2 w-full">
              {/* Invite inbox button with badge */}
              <Button
                variant="outline"
                size="sm"
                className="justify-between"
                onClick={() => setInboxOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  Invite inbox
                </span>
                {pendingInvites.length > 0 && (
                  <span className="ml-2 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
                    {pendingInvites.length}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/settings")}
                className="justify-start"
              >
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Content */}
        <SidebarInset className="flex-1 min-w-0 w-full max-w-none">{children}</SidebarInset>
      </div>

      {/* Invite Manager Dialog (existing) */}
      <InviteManager open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* NEW: Inbox dialog */}
      <Dialog open={inboxOpen} onOpenChange={setInboxOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pending Invites</DialogTitle>
            <DialogDescription>
              These dashboards were shared with you. Accept to add them to your sidebar.
            </DialogDescription>
          </DialogHeader>

          {loadingInbox ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : pendingInvites.length === 0 ? (
            <div className="text-sm text-muted-foreground">No pending invites.</div>
          ) : (
            <div className="space-y-3">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id ?? inv.owner_id}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {inv.inviter_name || inv.inviter_email || inv.owner_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {inv.role ? `Role: ${inv.role}` : "Shared dashboard"}
                      {inv.created_at ? ` • ${new Date(inv.created_at).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => acceptInvite(inv)}
                      disabled={actingOn === inv.id}
                    >
                      {actingOn === inv.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => declineInvite(inv)}
                      disabled={actingOn === inv.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInboxOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

/** Header burger that calls the correct toggle API across sidebar variants. */
function HeaderBurger() {
  const api = safeSidebarApi();
  if (!api) return <SidebarTrigger className="shrink-0" aria-label="Toggle sidebar" />;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      aria-label="Toggle sidebar"
      onClick={api.smartToggle}
      title="Toggle menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

/** Floating burger — only visible when the sidebar is collapsed. */
function FloatingBurger() {
  const api = safeSidebarApi();
  if (!api || api.open) return null;
  return (
    <div className="fixed left-3 top-16 md:top-20 z-50 pointer-events-auto">
      <Button
        variant="default"
        size="icon"
        className="h-10 w-10 rounded-full shadow-lg"
        aria-label="Open sidebar"
        title="Open menu"
        onClick={api.smartToggle}
      >
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  );
}

/** Normalizes different sidebar API shapes across shadcn variants. */
function safeSidebarApi(): { open: boolean; smartToggle: () => void } | undefined {
  try {
    const ctx: any = useSidebar();
    const open: boolean =
      typeof ctx?.open === "boolean"
        ? ctx.open
        : typeof ctx?.state === "string"
        ? ctx.state === "open"
        : !!ctx?.isOpen;

    const smartToggle = () => {
      if (typeof ctx?.toggle === "function") return ctx.toggle();
      if (typeof ctx?.toggleSidebar === "function") return ctx.toggleSidebar();
      if (typeof ctx?.setOpen === "function") return ctx.setOpen(!open);
      if (typeof ctx?.setCollapsed === "function") return ctx.setCollapsed(open);
    };

    return { open, smartToggle };
  } catch {
    return undefined;
  }
}
