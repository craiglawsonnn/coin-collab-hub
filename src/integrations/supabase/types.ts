export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      balance_adjustments: {
        Row: {
          amount: number
          as_of: string
          created_at: string | null
          id: string
          note: string | null
          transaction_id: string
          undone_at: string | null
          undone_by: string | null
          user_id: string
        }
        Insert: {
          amount: number
          as_of?: string
          created_at?: string | null
          id?: string
          note?: string | null
          transaction_id: string
          undone_at?: string | null
          undone_by?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          as_of?: string
          created_at?: string | null
          id?: string
          note?: string | null
          transaction_id?: string
          undone_at?: string | null
          undone_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_adjustments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_shares: {
        Row: {
          created_at: string | null
          id: string
          owner_id: string
          role: Database["public"]["Enums"]["dashboard_role"]
          shared_with_user_id: string
          status: Database["public"]["Enums"]["dashboard_invite_status"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          owner_id: string
          role?: Database["public"]["Enums"]["dashboard_role"]
          shared_with_user_id: string
          status?: Database["public"]["Enums"]["dashboard_invite_status"]
        }
        Update: {
          created_at?: string | null
          id?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["dashboard_role"]
          shared_with_user_id?: string
          status?: Database["public"]["Enums"]["dashboard_invite_status"]
        }
        Relationships: []
      }
      graph_views: {
        Row: {
          charts: Json
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          charts?: Json
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          charts?: Json
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "graph_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graph_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "searchable_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          account: string
          category: string
          created_at: string
          description: string | null
          end_date: string | null
          expense: number | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          gross_income: number | null
          id: string
          is_active: boolean
          net_income: number | null
          next_occurrence_date: string
          payment_method: string
          start_date: string
          tax_paid: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account: string
          category: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          expense?: number | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          gross_income?: number | null
          id?: string
          is_active?: boolean
          net_income?: number | null
          next_occurrence_date: string
          payment_method: string
          start_date?: string
          tax_paid?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: string
          category?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          expense?: number | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          gross_income?: number | null
          id?: string
          is_active?: boolean
          net_income?: number | null
          next_occurrence_date?: string
          payment_method?: string
          start_date?: string
          tax_paid?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account: string
          category: string
          created_at: string | null
          date: string
          description: string | null
          expense: number | null
          gross_income: number | null
          id: string
          net_flow: number | null
          net_income: number | null
          payment_method: string
          tax_paid: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account: string
          category: string
          created_at?: string | null
          date?: string
          description?: string | null
          expense?: number | null
          gross_income?: number | null
          id?: string
          net_flow?: number | null
          net_income?: number | null
          payment_method: string
          tax_paid?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account?: string
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          expense?: number | null
          gross_income?: number | null
          id?: string
          net_flow?: number | null
          net_income?: number | null
          payment_method?: string
          tax_paid?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          account_name: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_categories: {
        Row: {
          category_name: string
          created_at: string
          id: string
          is_active: boolean
          is_expense: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_expense?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_expense?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      searchable_profiles: {
        Row: {
          email: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          email?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      dashboard_invite_status: "pending" | "accepted" | "rejected"
      dashboard_role: "viewer" | "editor" | "admin"
      recurrence_frequency:
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "yearly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      dashboard_invite_status: ["pending", "accepted", "rejected"],
      dashboard_role: ["viewer", "editor", "admin"],
      recurrence_frequency: [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "yearly",
      ],
    },
  },
} as const
