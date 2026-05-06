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
          host_venue_id: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          host_venue_id?: string | null
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          host_venue_id?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weddings_host_venue_id_fkey"
            columns: ["host_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
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
      venues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      venue_halls: {
        Row: {
          created_at: string
          description: string | null
          height: number
          id: string
          is_public: boolean
          name: string
          preset: string
          updated_at: string
          venue_id: string
          width: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          height: number
          id?: string
          is_public?: boolean
          name?: string
          preset: string
          updated_at?: string
          venue_id: string
          width: number
        }
        Update: {
          created_at?: string
          description?: string | null
          height?: number
          id?: string
          is_public?: boolean
          name?: string
          preset?: string
          updated_at?: string
          venue_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "venue_halls_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_hall_tables: {
        Row: {
          capacity: number
          created_at: string
          deleted_at: string | null
          hall_id: string
          height: number
          id: string
          name: string
          pos_x: number
          pos_y: number
          rotation: number
          shape: string
          updated_at: string
          width: number
        }
        Insert: {
          capacity: number
          created_at?: string
          deleted_at?: string | null
          hall_id: string
          height: number
          id: string
          name?: string
          pos_x: number
          pos_y: number
          rotation?: number
          shape: string
          updated_at?: string
          width: number
        }
        Update: {
          capacity?: number
          created_at?: string
          deleted_at?: string | null
          hall_id?: string
          height?: number
          id?: string
          name?: string
          pos_x?: number
          pos_y?: number
          rotation?: number
          shape?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "venue_hall_tables_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "venue_halls"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_hall_fixtures: {
        Row: {
          created_at: string
          deleted_at: string | null
          hall_id: string
          height: number
          id: string
          name: string
          pos_x: number
          pos_y: number
          rotation: number
          shape: string
          updated_at: string
          width: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          hall_id: string
          height: number
          id: string
          name?: string
          pos_x: number
          pos_y: number
          rotation?: number
          shape: string
          updated_at?: string
          width: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          hall_id?: string
          height?: number
          id?: string
          name?: string
          pos_x?: number
          pos_y?: number
          rotation?: number
          shape?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "venue_hall_fixtures_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "venue_halls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_venue_hall: { Args: { _hall_id: string }; Returns: boolean }
      claim_wedding_invitation: { Args: { _token: string }; Returns: string }
      guest_names_valid: { Args: { names: string[] }; Returns: boolean }
      is_venue_hall_owner: { Args: { _hall_id: string }; Returns: boolean }
      is_venue_owner: { Args: { _venue_id: string }; Returns: boolean }
      is_wedding_member: { Args: { _wedding_id: string }; Returns: boolean }
      set_user_type: { Args: { _user_type: string }; Returns: undefined }
      start_wedding_from_hall: {
        Args: { _hall_id: string; _name: string; _date: string | null }
        Returns: string
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

