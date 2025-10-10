import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Home,
  Layers,
  Users,
  Settings,
  LayoutGrid,
  UserPlus,
  Menu, // 3-stack burger
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
  useSidebar, // hook from your sidebar lib
} from "@/components/ui/sidebar";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SharedDash = { id: string; name: string; owner?: string };

export default function LeftNav({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const ownerParam = searchParams.get("owner");
  
  const [shared, setShared] = useState<SharedDash[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
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
          // Fetch owner profiles from searchable_profiles
          const ownerIds = shares.map(s => s.owner_id);
          const { data: profiles } = await supabase
            .from("searchable_profiles")
            .select("id, full_name, email")
            .in("id", ownerIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

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
    };
    load();
  }, [user?.id]);

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
                          onClick={() => navigate(ownerParam ? `/transactions?owner=${ownerParam}` : "/transactions")}
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
                          <div className="px-2 py-2 text-sm text-muted-foreground italic">
                            Loading…
                          </div>
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
            <div className="flex items-center gap-2">
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

        {/* Fluid content area */}
        <SidebarInset className="flex-1 min-w-0 w-full max-w-none">
          {children}
        </SidebarInset>
      </div>

      {/* Invite Manager Dialog */}
      <InviteManager open={inviteOpen} onOpenChange={setInviteOpen} />
    </SidebarProvider>
  );
}

/** Header burger that calls the correct toggle API across sidebar variants. */
function HeaderBurger() {
  const api = safeSidebarApi();

  // If the hook is missing entirely, fall back to the library trigger (built-in icon).
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

/** Floating burger — only visible when the sidebar is collapsed.
 *  Positioned below the page title so it won’t cover it. */
function FloatingBurger() {
  const api = safeSidebarApi();
  if (!api) return null;           // no API -> nothing to render
  if (api.open) return null;       // only show when closed/collapsed

  return (
    <div className="fixed left-3 top-16 md:top-20 z-50 pointer-events-auto">
      <Button
        variant="default"
        size="icon"
        className="h-10 w-10 rounded-full shadow-lg bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
function safeSidebarApi():
  | { open: boolean; smartToggle: () => void }
  | undefined {
  try {
    const ctx: any = useSidebar();
    const open: boolean =
      typeof ctx?.open === "boolean"
        ? ctx.open
        : typeof ctx?.state === "string"
        ? ctx.state === "open"
        : !!ctx?.isOpen;

    const smartToggle = () => {
      // Try common function names, then fall back to setOpen
      if (typeof ctx?.toggle === "function") return ctx.toggle();
      if (typeof ctx?.toggleSidebar === "function") return ctx.toggleSidebar();
      if (typeof ctx?.setOpen === "function") return ctx.setOpen(!open);
      if (typeof ctx?.setCollapsed === "function") return ctx.setCollapsed(open); // some variants invert meaning
      // absolute last resort: click a hidden SidebarTrigger if you keep one in DOM
    };

    return { open, smartToggle };
  } catch {
    return undefined;
  }
}
