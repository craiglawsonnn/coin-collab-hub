# Admin Panel Documentation

## Overview
The admin panel provides a secure interface for managing all database tables with full CRUD (Create, Read, Update, Delete) capabilities and relationship management.

## Access

### URL
- **Admin Dashboard**: `/admin`
- **Table Management**: `/admin/{tableName}`

### Authentication
Access is restricted to users with the `admin` role in the `user_roles` table.

**To grant admin access to a user:**
1. Go to the Lovable Cloud backend
2. Navigate to the `user_roles` table
3. Insert a new row with:
   - `user_id`: The UUID of the user from the `profiles` table
   - `role`: `admin`

## Features

### 1. Table Navigation
- Left sidebar shows all manageable tables
- Click any table name to view its records
- "Back to App" button returns to main application

### 2. Record List View
- **Search**: Text search across configured fields
- **Sort**: Sort by any configured column (ascending/descending)
- **Pagination**: 
  - Adjustable page size (10, 25, 50, 100 rows)
  - Page navigation controls
  - Total count display
- **Actions**: Edit and delete buttons for each record

### 3. Create/Edit Forms
- Dynamic form generation based on field types:
  - **Text/Number**: Standard input fields
  - **Date**: Date picker
  - **Boolean**: Toggle switch
  - **Select**: Dropdown with predefined options
  - **Relation**: Dropdown populated from related table
- Validation for required fields
- Real-time updates to database

### 4. Relationship Management
- Foreign key fields show as searchable dropdowns
- Displays related record's label field (e.g., email for users)
- Automatically loads up to 100 related records

### 5. Delete Actions
- Confirmation dialog before deletion
- Cascade deletes handled by database

## Configured Tables

Currently configured tables:
- **Profiles**: User profiles and settings
- **User Roles**: Role assignments (admin/user)
- **Transactions**: Financial transactions
- **User Accounts**: Bank/payment accounts
- **User Categories**: Transaction categories
- **Budgets**: Budget limits and tracking
- **Recurring Transactions**: Scheduled transactions
- **Dashboard Shares**: Shared dashboard permissions

## Adding New Tables

To add a new table to the admin panel:

1. Open `src/config/adminTables.ts`
2. Add a new `TableConfig` object to the `adminTableConfigs` array:

```typescript
{
  name: "table_name",           // Database table name
  label: "Display Name",         // Human-readable name
  primaryKey: "id",              // Primary key column
  displayFields: ["col1", "col2"], // Columns shown in list view
  searchFields: ["col1"],        // Columns to search
  sortFields: ["col1", "col2"],  // Columns available for sorting
  fields: [
    {
      name: "column_name",
      label: "Field Label",
      type: "text",              // text|number|date|boolean|select|relation
      required: true,
      editable: true,
      // For select type:
      options: [
        { value: "val1", label: "Label 1" },
        { value: "val2", label: "Label 2" }
      ],
      // For relation type:
      relationTable: "related_table",
      relationDisplay: "display_field",
      relationValue: "id_field"
    }
  ]
}
```

## Security

### Role-Based Access Control
- Admin access is verified server-side using RLS policies
- Uses security definer functions to prevent privilege escalation
- Never stores roles in client-side storage

### Database Security
- All operations respect Row-Level Security (RLS) policies
- Foreign key constraints prevent orphaned records
- Sensitive data is protected by proper RLS policies

### Best Practices
- Always use the admin panel for data management (not direct database access)
- Regularly audit user roles
- Keep the number of admin users minimal
- Monitor the `user_roles` table for unauthorized changes

## Limitations

### Current Restrictions
- Maximum 100 related records loaded for dropdowns
- Bulk operations not yet implemented
- No file upload support (use storage buckets separately)
- Complex JSON fields displayed as strings

### Future Enhancements
- Bulk create/update/delete
- Advanced filtering options
- Export to CSV/Excel
- Relationship visualization
- Audit log viewer

## Troubleshooting

### "Access Denied" Error
- Verify the user has an `admin` role in the `user_roles` table
- Check that the user is logged in
- Confirm RLS policies are correctly configured

### "Cannot Read Property" Errors
- Verify the table exists in the database
- Check that field names in config match database columns
- Ensure relationships reference valid tables

### Records Not Showing
- Check RLS policies on the table
- Verify user permissions
- Look for database errors in browser console

### Form Validation Errors
- Ensure required fields are filled
- Check data types match (number fields with numbers, etc.)
- Verify foreign keys reference existing records

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify database schema matches configuration
3. Review RLS policies and user roles
4. Check this documentation for configuration examples
