import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Home, Layers, Users, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LeftNav({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="flex">
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
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/') } className="justify-start"><Home className="mr-2 h-4 w-4" /> Home</Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/transactions') } className="justify-start"><Layers className="mr-2 h-4 w-4" /> Transactions</Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/users') } className="justify-start"><Users className="mr-2 h-4 w-4" /> Users</Button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="justify-start"><Settings className="mr-2 h-4 w-4" /> Settings</Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
