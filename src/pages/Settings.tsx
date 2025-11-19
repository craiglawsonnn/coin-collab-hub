import { useNavigate } from "react-router-dom";
import LeftNav from "@/components/LeftNav";
import ThemeToggle from "@/components/ThemeToggle";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AccountsSettings } from "@/components/settings/AccountsSettings";
import { CategoriesSettings } from "@/components/settings/CategoriesSettings";
import { RecurringTransactions } from "@/components/settings/RecurringTransactions";
import Budgets from "@/components/settings/Budgets";
import { PasswordSettings } from "@/components/settings/PasswordSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Animated background preference
  const [animatedBg, setAnimatedBg] = useState<boolean>(() => {
    const saved = localStorage.getItem("ui:veilEnabled");
    return saved === "1";
  });

  const handleAnimatedBgToggle = (checked: boolean) => {
    setAnimatedBg(checked);
    localStorage.setItem("ui:veilEnabled", checked ? "1" : "0");
    window.dispatchEvent(new Event("storage")); // Notify other components
  };

  return (
    <LeftNav>
      {/* Header (matches Dashboard look/feel) */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Go back"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your accounts, categories, and recurring transactions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Page body */}
      <main className="w-full px-4 py-6">
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Types</CardTitle>
                <CardDescription>
                  Manage your custom account types (e.g., Bank accounts, Cash, Credit cards)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AccountsSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Categories</CardTitle>
                <CardDescription>
                  Manage your custom transaction categories for income and expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoriesSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recurring" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recurring Transactions</CardTitle>
                <CardDescription>
                  Set up transactions that repeat automatically (e.g., monthly rent, weekly subscriptions)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecurringTransactions />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budgets" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Management</CardTitle>
                <CardDescription>
                  Set spending limits for overall expenses or specific categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Budgets />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <PasswordSettings />
          </TabsContent>

          <TabsContent value="display" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Display Settings</CardTitle>
                <CardDescription>
                  Customize the appearance and performance of your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="animated-bg">Animated Background</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable animated backgrounds for a dynamic visual experience. Disable for better performance.
                    </p>
                  </div>
                  <Switch
                    id="animated-bg"
                    checked={animatedBg}
                    onCheckedChange={handleAnimatedBgToggle}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </LeftNav>
  );
}
