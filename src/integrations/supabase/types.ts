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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          id: string
          key: string
          unlocked_at: string
        }
        Insert: {
          id?: string
          key: string
          unlocked_at?: string
        }
        Update: {
          id?: string
          key?: string
          unlocked_at?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          due_date: string
          id: string
          name: string
          paid: boolean
          recurring: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          due_date: string
          id?: string
          name: string
          paid?: boolean
          recurring?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          due_date?: string
          id?: string
          name?: string
          paid?: boolean
          recurring?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          balance: number
          created_at: string
          debt_type: string
          due_date: string | null
          id: string
          monthly_payment: number
          name: string
          original_amount: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          debt_type?: string
          due_date?: string | null
          id?: string
          monthly_payment?: number
          name: string
          original_amount?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          debt_type?: string
          due_date?: string | null
          id?: string
          monthly_payment?: number
          name?: string
          original_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      monthly_reviews: {
        Row: {
          created_at: string
          id: string
          month: number
          notes: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          color: string | null
          created_at: string
          current_amount: number
          icon: string | null
          id: string
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          current_amount?: number
          icon?: string | null
          id?: string
          name: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          current_amount?: number
          icon?: string | null
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          created_at: string
          icon: string | null
          id: string
          name: string
          next_renewal: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_cycle?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          next_renewal?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          next_renewal?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          added_by: string | null
          amount: number
          category: string
          created_at: string
          id: string
          note: string | null
          occurred_on: string
          payment_method: string | null
          type: Database["public"]["Enums"]["txn_type"]
        }
        Insert: {
          added_by?: string | null
          amount: number
          category: string
          created_at?: string
          id?: string
          note?: string | null
          occurred_on?: string
          payment_method?: string | null
          type: Database["public"]["Enums"]["txn_type"]
        }
        Update: {
          added_by?: string | null
          amount?: number
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          occurred_on?: string
          payment_method?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      txn_type: "income" | "expense"
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
      txn_type: ["income", "expense"],
    },
  },
} as const
