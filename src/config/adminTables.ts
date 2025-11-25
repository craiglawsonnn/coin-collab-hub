// Configuration for admin panel tables
export interface TableField {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "boolean" | "select" | "relation";
  required?: boolean;
  editable?: boolean;
  options?: { value: string; label: string }[];
  relationTable?: string;
  relationDisplay?: string;
  relationValue?: string;
}

export interface TableConfig {
  name: string;
  label: string;
  primaryKey: string;
  fields: TableField[];
  displayFields: string[];
  searchFields: string[];
  sortFields: string[];
}

export const adminTableConfigs: TableConfig[] = [
  {
    name: "profiles",
    label: "Profiles",
    primaryKey: "id",
    displayFields: ["email", "full_name", "base_currency", "created_at"],
    searchFields: ["email", "full_name"],
    sortFields: ["email", "created_at"],
    fields: [
      { name: "email", label: "Email", type: "text", required: true, editable: true },
      { name: "full_name", label: "Full Name", type: "text", editable: true },
      { name: "base_currency", label: "Base Currency", type: "text", editable: true },
      { name: "preferences", label: "Preferences", type: "text", editable: true },
    ],
  },
  {
    name: "user_roles",
    label: "User Roles",
    primaryKey: "id",
    displayFields: ["user_id", "role", "created_at"],
    searchFields: [],
    sortFields: ["created_at"],
    fields: [
      { 
        name: "user_id", 
        label: "User", 
        type: "relation", 
        required: true, 
        editable: true,
        relationTable: "profiles",
        relationDisplay: "email",
        relationValue: "id"
      },
      { 
        name: "role", 
        label: "Role", 
        type: "select", 
        required: true, 
        editable: true,
        options: [
          { value: "admin", label: "Admin" },
          { value: "user", label: "User" },
        ]
      },
    ],
  },
  {
    name: "transactions",
    label: "Transactions",
    primaryKey: "id",
    displayFields: ["date", "description", "category", "amount_minor", "currency_code", "account"],
    searchFields: ["description", "category"],
    sortFields: ["date", "amount_minor"],
    fields: [
      { 
        name: "user_id", 
        label: "User", 
        type: "relation", 
        required: true, 
        editable: true,
        relationTable: "profiles",
        relationDisplay: "email",
        relationValue: "id"
      },
      { name: "date", label: "Date", type: "date", required: true, editable: true },
      { name: "description", label: "Description", type: "text", editable: true },
      { name: "category", label: "Category", type: "text", required: true, editable: true },
      { name: "account", label: "Account", type: "text", required: true, editable: true },
      { name: "amount_minor", label: "Amount (minor)", type: "number", editable: true },
      { name: "currency_code", label: "Currency", type: "text", required: true, editable: true },
      { name: "payment_method", label: "Payment Method", type: "text", required: true, editable: true },
      { name: "gross_income", label: "Gross Income", type: "number", editable: true },
      { name: "net_income", label: "Net Income", type: "number", editable: true },
      { name: "tax_paid", label: "Tax Paid", type: "number", editable: true },
      { name: "expense", label: "Expense", type: "number", editable: true },
    ],
  },
  {
    name: "user_accounts",
    label: "User Accounts",
    primaryKey: "id",
    displayFields: ["account_name", "currency_code", "is_active"],
    searchFields: ["account_name"],
    sortFields: ["account_name"],
    fields: [
      { 
        name: "user_id", 
        label: "User", 
        type: "relation", 
        required: true, 
        editable: true,
        relationTable: "profiles",
        relationDisplay: "email",
        relationValue: "id"
      },
      { name: "account_name", label: "Account Name", type: "text", required: true, editable: true },
      { name: "currency_code", label: "Currency", type: "text", required: true, editable: true },
      { name: "is_active", label: "Active", type: "boolean", editable: true },
    ],
  },
  {
    name: "user_categories",
    label: "User Categories",
    primaryKey: "id",
    displayFields: ["category_name", "is_expense", "is_active"],
    searchFields: ["category_name"],
    sortFields: ["category_name"],
    fields: [
      { 
        name: "user_id", 
        label: "User", 
        type: "relation", 
        required: true, 
        editable: true,
        relationTable: "profiles",
        relationDisplay: "email",
        relationValue: "id"
      },
      { name: "category_name", label: "Category Name", type: "text", required: true, editable: true },
      { name: "is_expense", label: "Is Expense", type: "boolean", editable: true },
      { name: "is_active", label: "Active", type: "boolean", editable: true },
    ],
  },
  {
    name: "budgets",
    label: "Budgets",
    primaryKey: "id",
    displayFields: ["amount", "period", "category", "currency_code", "is_active"],
    searchFields: ["category"],
    sortFields: ["amount", "created_at"],
    fields: [
      { 
        name: "user_id", 
        label: "User", 
        type: "relation", 
        required: true, 
        editable: true,
        relationTable: "profiles",
        relationDisplay: "email",
        relationValue: "id"
      },
      { name: "amount", label: "Amount", type: "number", required: true, editable: true },
      { name: "currency_code", label: "Currency", type: "text", required: true, editable: true },
      { name: "period", label: "Period", type: "text", required: true, editable: true },
      { name: "category", label: "Category", type: "text", editable: true },
      { name: "is_active", label: "Active", type: "boolean", editable: true },
    ],
  },
  {
    name: "recurring_transactions",
    label: "Recurring Transactions",
    primaryKey: "id",
    displayFields: ["description", "category", "frequency", "next_occurrence_date", "is_active"],
    searchFields: ["description", "category"],
    sortFields: ["next_occurrence_date"],
    fields: [
      { 
        name: "user_id", 
        label: "User", 
        type: "relation", 
        required: true, 
        editable: true,
        relationTable: "profiles",
        relationDisplay: "email",
        relationValue: "id"
      },
      { name: "description", label: "Description", type: "text", editable: true },
      { name: "category", label: "Category", type: "text", required: true, editable: true },
      { name: "account", label: "Account", type: "text", required: true, editable: true },
      { name: "payment_method", label: "Payment Method", type: "text", required: true, editable: true },
      { 
        name: "frequency", 
        label: "Frequency", 
        type: "select", 
        required: true, 
        editable: true,
        options: [
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
          { value: "yearly", label: "Yearly" },
        ]
      },
      { name: "start_date", label: "Start Date", type: "date", required: true, editable: true },
      { name: "end_date", label: "End Date", type: "date", editable: true },
      { name: "next_occurrence_date", label: "Next Occurrence", type: "date", required: true, editable: true },
      { name: "gross_income", label: "Gross Income", type: "number", editable: true },
      { name: "net_income", label: "Net Income", type: "number", editable: true },
      { name: "tax_paid", label: "Tax Paid", type: "number", editable: true },
      { name: "expense", label: "Expense", type: "number", editable: true },
      { name: "is_active", label: "Active", type: "boolean", editable: true },
    ],
  },
  {
    name: "dashboard_shares",
    label: "Dashboard Shares",
    primaryKey: "id",
    displayFields: ["owner_id", "shared_with_user_id", "role", "status"],
    searchFields: [],
    sortFields: ["created_at"],
    fields: [
      { 
        name: "owner_id", 
        label: "Owner", 
        type: "relation", 
        required: true, 
        editable: true,
        relationTable: "profiles",
        relationDisplay: "email",
        relationValue: "id"
      },
      { 
        name: "shared_with_user_id", 
        label: "Shared With", 
        type: "relation", 
        required: true, 
        editable: true,
        relationTable: "profiles",
        relationDisplay: "email",
        relationValue: "id"
      },
      { 
        name: "role", 
        label: "Role", 
        type: "select", 
        required: true, 
        editable: true,
        options: [
          { value: "viewer", label: "Viewer" },
          { value: "editor", label: "Editor" },
          { value: "admin", label: "Admin" },
        ]
      },
      { 
        name: "status", 
        label: "Status", 
        type: "select", 
        required: true, 
        editable: true,
        options: [
          { value: "pending", label: "Pending" },
          { value: "accepted", label: "Accepted" },
          { value: "rejected", label: "Rejected" },
        ]
      },
    ],
  },
];
