export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      fixtures: {
        Row: {
          created_at: string
          deleted_at: string | null
          height: number
          id: string
          name: string
          pos_x: number
          pos_y: number
          rotation: number
          shape: string
          updated_at: string
          wedding_id: string
          width: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          height: number
          id: string
          name?: string
          pos_x: number
          pos_y: number
          rotation?: number
          shape: string
          updated_at?: string
          wedding_id: string
          width: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          height?: number
          id?: string
          name?: string
          pos_x?: number
          pos_y?: number
          rotation?: number
          shape?: string
          updated_at?: string
          wedding_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          deleted_at: string | null
          dietary: string[]
          id: string
          name: string
          note: string | null
          table_id: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          dietary?: string[]
          id: string
          name?: string
          note?: string | null
          table_id?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          dietary?: string[]
          id?: string
          name?: string
          note?: string | null
          table_id?: string | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      hall_template_fixtures: {
        Row: {
          height: number
          id: string
          name: string
          pos_x: number
          pos_y: number
          rotation: number
          shape: string
          template_id: string
          width: number
        }
        Insert: {
          height: number
          id?: string
          name?: string
          pos_x: number
          pos_y: number
          rotation?: number
          shape: string
          template_id: string
          width: number
        }
        Update: {
          height?: number
          id?: string
          name?: string
          pos_x?: number
          pos_y?: number
          rotation?: number
          shape?: string
          template_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "hall_template_fixtures_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "hall_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hall_template_tables: {
        Row: {
          capacity: number
          height: number
          id: string
          name: string
          pos_x: number
          pos_y: number
          rotation: number
          shape: string
          template_id: string
          width: number
        }
        Insert: {
          capacity: number
          height: number
          id?: string
          name?: string
          pos_x: number
          pos_y: number
          rotation?: number
          shape: string
          template_id: string
          width: number
        }
        Update: {
          capacity?: number
          height?: number
          id?: string
          name?: string
          pos_x?: number
          pos_y?: number
          rotation?: number
          shape?: string
          template_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "hall_template_tables_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "hall_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hall_templates: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          hall_preset: string
          height: number
          id: string
          is_public: boolean
          name: string
          updated_at: string
          width: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          hall_preset: string
          height: number
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          width: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          hall_preset?: string
          height?: number
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          width?: number
        }
        Relationships: []
      }
      halls: {
        Row: {
          created_at: string
          height: number
          preset: string
          updated_at: string
          wedding_id: string
          width: number
        }
        Insert: {
          created_at?: string
          height: number
          preset: string
          updated_at?: string
          wedding_id: string
          width: number
        }
        Update: {
          created_at?: string
          height?: number
          preset?: string
          updated_at?: string
          wedding_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "halls_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_orders: {
        Row: {
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          design_hash: string | null
          guest_names: string[] | null
          id: string
          notes: string | null
          quantity: number
          status: string
          wedding_id: string | null
        }
        Insert: {
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          design_hash?: string | null
          guest_names?: string[] | null
          id?: string
          notes?: string | null
          quantity: number
          status?: string
          wedding_id?: string | null
        }
        Update: {
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          design_hash?: string | null
          guest_names?: string[] | null
          id?: string
          notes?: string | null
          quantity?: number
          status?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_orders_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_type: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          user_type?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_type?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          due: string | null
          id: string
          status: string
          text: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          due?: string | null
          id: string
          status: string
          text: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          due?: string | null
          id?: string
          status?: string
          text?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number
          created_at: string
          deleted_at: string | null
          height: number
          id: string
          name: string
          pos_x: number
          pos_y: number
          rotation: number
          shape: string
          updated_at: string
          wedding_id: string
          width: number
        }
        Insert: {
          capacity: number
          created_at?: string
          deleted_at?: string | null
          height: number
          id: string
          name?: string
          pos_x: number
          pos_y: number
          rotation?: number
          shape: string
          updated_at?: string
          wedding_id: string
          width: number
        }
        Update: {
          capacity?: number
          created_at?: string
          deleted_at?: string | null
          height?: number
          id?: string
          name?: string
          pos_x?: number
          pos_y?: number
          rotation?: number
          shape?: string
          updated_at?: string
          wedding_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_invitations: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          token: string
          wedding_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          role: string
          token?: string
          wedding_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_invitations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          created_at: string
          date: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_wedding_invitation: { Args: { _token: string }; Returns: string }
      guest_names_valid: { Args: { names: string[] }; Returns: boolean }
      is_wedding_member: { Args: { _wedding_id: string }; Returns: boolean }
      transfer_wedding_ownership: {
        Args: { _to_user_id: string; _wedding_id: string }
        Returns: undefined
      }
      wedding_role: { Args: { _wedding_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

