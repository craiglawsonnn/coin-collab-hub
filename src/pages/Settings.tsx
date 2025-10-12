import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountsSettings } from "@/components/settings/AccountsSettings";
import { CategoriesSettings } from "@/components/settings/CategoriesSettings";
import { RecurringTransactions } from "@/components/settings/RecurringTransactions";

export default function Settings() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your accounts, categories, and recurring transactions</p>
      </div>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
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
      </Tabs>
    </div>
  );
}