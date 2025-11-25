import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { adminTableConfigs } from "@/config/adminTables";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-border p-4">
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Database Management</p>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-1">
              <Link to="/">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  size="sm"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Back to App
                </Button>
              </Link>
              
              <div className="my-4 border-t border-border" />
              
              <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                TABLES
              </p>
              
              {adminTableConfigs.map((table) => {
                const isActive = location.pathname === `/admin/${table.name}`;
                return (
                  <Link key={table.name} to={`/admin/${table.name}`}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        isActive && "bg-secondary text-secondary-foreground"
                      )}
                      size="sm"
                    >
                      {table.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              size="sm"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
