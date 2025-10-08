import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Layers, Users, Settings, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [shared, setShared] = useState<SharedDash[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoadingShared(true);
      try {
        /**
         * Adjust this query to match your schema.
         * Common patterns:
         *  - "dashboard_shares" join "dashboards"
         *  - or a view like "v_shared_dashboards"
         */
        let rows: SharedDash[] = [];

        // Try a likely view first
        let { data, error } = await supabase
          .from("v_shared_dashboards")
          .select("id,name,owner")
          .eq("member_id", user.id);

        if (error) {
          // Fallback: try a share table + RPC-ish join done client side (best-effort)
          const share = await supabase
            .from("dashboard_shares")
            .select("dashboard_id, dashboard_name, owner_name")
            .eq("member_id", user.id);

          if (!share.error && share.data) {
            rows = share.data.map((r: any) => ({
              id: r.dashboard_id,
              name: r.dashboard_name ?? "Shared dashboard",
              owner: r.owner_name ?? undefined,
            }));
          }
        } else if (data) {
          rows = data.map((r: any) => ({
            id: r.id,
            name: r.name ?? "Shared dashboard",
            owner: r.owner ?? undefined,
          }));
        }

        setShared(rows);
      } catch {
        setShared([]);
      } finally {
        setLoadingShared(false);
      }
    };

    load();
  }, [user?.id]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">CoinCollab</div>
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
                          onClick={() => navigate("/")}
                        >
                          <LayoutGrid className="mr-2 h-4 w-4" />
                          Main dashboard
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => navigate("/transactions")}
                        >
                          <Layers className="mr-2 h-4 w-4" />
                          Transactions
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => navigate("/graphs")}
                        >
                          <Layers className="mr-2 h-4 w-4" />
                          Graphs
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Users group (shared dashboards) */}
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
                          onClick={() => navigate("/users")}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Manage users
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
                              onClick={() => navigate(`/dashboards/${d.id}`)}
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
              <SidebarTrigger />
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
    </SidebarProvider>
  );
}
