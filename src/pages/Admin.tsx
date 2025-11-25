import { useParams, Navigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminTableConfigs } from "@/config/adminTables";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database } from "lucide-react";

const Admin = () => {
  const { tableName } = useParams<{ tableName: string }>();
  const { isAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access the admin panel. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Find the table config
  const tableConfig = tableName
    ? adminTableConfigs.find((t) => t.name === tableName)
    : null;

  return (
    <AdminLayout>
      {!tableName ? (
        // Dashboard view
        <div className="p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-6 w-6" />
                <CardTitle>Admin Dashboard</CardTitle>
              </div>
              <CardDescription>
                Welcome to the admin panel. Select a table from the sidebar to manage records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {adminTableConfigs.map((table) => (
                  <Card key={table.name} className="hover:border-primary cursor-pointer transition-colors">
                    <CardHeader>
                      <CardTitle className="text-base">{table.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {table.fields.length} fields
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-semibold mb-2">Getting Started</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Select a table from the sidebar to view and manage records</li>
                  <li>Use the search and filter tools to find specific records</li>
                  <li>Click "Add New" to create records with relationship support</li>
                  <li>Edit or delete records using the action buttons</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : tableConfig ? (
        // Table view
        <AdminTable config={tableConfig} />
      ) : (
        // Invalid table
        <Navigate to="/admin" replace />
      )}
    </AdminLayout>
  );
};

export default Admin;
