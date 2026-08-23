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
          geometry: Json | null
          hall_id: string | null
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
          geometry?: Json | null
          hall_id?: string | null
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
          geometry?: Json | null
          hall_id?: string | null
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
            foreignKeyName: "fixtures_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
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
          age_group: string | null
          created_at: string
          deleted_at: string | null
          dietary: string[]
          id: string
          name: string
          note: string | null
          seat_id: string | null
          table_id: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          deleted_at?: string | null
          dietary?: string[]
          id: string
          name?: string
          note?: string | null
          seat_id?: string | null
          table_id?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          age_group?: string | null
          created_at?: string
          deleted_at?: string | null
          dietary?: string[]
          id?: string
          name?: string
          note?: string | null
          seat_id?: string | null
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
          floor: number | null
          geometry: Json | null
          height: number
          id: string
          name: string
          pos_x: number
          pos_y: number
          preset: string
          updated_at: string
          wedding_id: string
          width: number
        }
        Insert: {
          created_at?: string
          floor?: number | null
          geometry?: Json | null
          height: number
          id?: string
          name?: string
          pos_x?: number
          pos_y?: number
          preset: string
          updated_at?: string
          wedding_id: string
          width: number
        }
        Update: {
          created_at?: string
          floor?: number | null
          geometry?: Json | null
          height?: number
          id?: string
          name?: string
          pos_x?: number
          pos_y?: number
          preset?: string
          updated_at?: string
          wedding_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "halls_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_courses: {
        Row: {
          archived_at: string | null
          choose_count: number
          created_at: string
          id: string
          menu_package_id: string
          name: string
          per_guest_choice: boolean
          position: number
          serving_note: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          choose_count?: number
          created_at?: string
          id?: string
          menu_package_id: string
          name: string
          per_guest_choice?: boolean
          position?: number
          serving_note?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          choose_count?: number
          created_at?: string
          id?: string
          menu_package_id?: string
          name?: string
          per_guest_choice?: boolean
          position?: number
          serving_note?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_courses_tenant_id_menu_package_id_fkey"
            columns: ["tenant_id", "menu_package_id"]
            isOneToOne: false
            referencedRelation: "menu_packages"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      menu_options: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          menu_course_id: string
          name: string
          note: string | null
          position: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          menu_course_id: string
          name: string
          note?: string | null
          position?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          menu_course_id?: string
          name?: string
          note?: string | null
          position?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_options_tenant_id_menu_course_id_fkey"
            columns: ["tenant_id", "menu_course_id"]
            isOneToOne: false
            referencedRelation: "menu_courses"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      menu_packages: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          price_per_person_minor: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          price_per_person_minor?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          price_per_person_minor?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
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
          geometry: Json | null
          hall_id: string | null
          height: number
          id: string
          name: string
          pos_x: number
          pos_y: number
          rotation: number
          seats: Json
          shape: string
          updated_at: string
          wedding_id: string
          width: number
        }
        Insert: {
          capacity: number
          created_at?: string
          deleted_at?: string | null
          geometry?: Json | null
          hall_id?: string | null
          height: number
          id: string
          name?: string
          pos_x: number
          pos_y: number
          rotation?: number
          seats?: Json
          shape: string
          updated_at?: string
          wedding_id: string
          width: number
        }
        Update: {
          capacity?: number
          created_at?: string
          deleted_at?: string | null
          geometry?: Json | null
          hall_id?: string | null
          height?: number
          id?: string
          name?: string
          pos_x?: number
          pos_y?: number
          rotation?: number
          seats?: Json
          shape?: string
          updated_at?: string
          wedding_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "tables_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          tenant_id: string
          token: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          role: string
          tenant_id: string
          token?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accent_color: string | null
          created_at: string
          currency: string
          id: string
          locale: string
          logo_url: string | null
          name: string
          open_linking: boolean
          primary_color: string | null
          slug: string
          status: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          currency?: string
          id?: string
          locale?: string
          logo_url?: string | null
          name: string
          open_linking?: boolean
          primary_color?: string | null
          slug: string
          status?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          currency?: string
          id?: string
          locale?: string
          logo_url?: string | null
          name?: string
          open_linking?: boolean
          primary_color?: string | null
          slug?: string
          status?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
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
          tenant_id: string | null
          updated_at: string
          venue_access: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          name?: string
          owner_id: string
          tenant_id?: string | null
          updated_at?: string
          venue_access?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          name?: string
          owner_id?: string
          tenant_id?: string | null
          updated_at?: string
          venue_access?: string
        }
        Relationships: [
          {
            foreignKeyName: "weddings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      wedding_seatmap: {
        Row: {
          age_group: string | null
          dietary: string[] | null
          id: string | null
          seat_id: string | null
          table_id: string | null
          wedding_id: string | null
        }
        Insert: {
          age_group?: string | null
          dietary?: string[] | null
          id?: string | null
          seat_id?: string | null
          table_id?: string | null
          wedding_id?: string | null
        }
        Update: {
          age_group?: string | null
          dietary?: string[] | null
          id?: string | null
          seat_id?: string | null
          table_id?: string | null
          wedding_id?: string | null
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
    }
    Functions: {
      claim_tenant_invitation: { Args: { _token: string }; Returns: string }
      claim_wedding_invitation: { Args: { _token: string }; Returns: string }
      delete_own_account: { Args: never; Returns: undefined }
      dietary_tags_valid: { Args: { tags: string[] }; Returns: boolean }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      is_tenant_staff: { Args: { _tenant_id: string }; Returns: boolean }
      is_wedding_member: { Args: { _wedding_id: string }; Returns: boolean }
      link_wedding_to_venue: {
        Args: { p_slug: string; p_wedding_id: string }
        Returns: string
      }
      my_tenant_id: { Args: never; Returns: string }
      my_wedding_role: { Args: { p_wedding_id: string }; Returns: string }
      reorder_menu_courses: {
        Args: { p_ids: string[]; p_menu_package_id: string }
        Returns: undefined
      }
      reorder_menu_options: {
        Args: { p_course_id: string; p_ids: string[] }
        Returns: undefined
      }
      replace_planner_layout: {
        Args: {
          p_fixtures: Json
          p_halls: Json
          p_tables: Json
          p_wedding_id: string
        }
        Returns: undefined
      }
      save_table: {
        Args: {
          p_capacity: number
          p_geometry: Json
          p_guests: Json
          p_height: number
          p_name: string
          p_rotation: number
          p_seats: Json
          p_shape: string
          p_table_id: string
          p_width: number
        }
        Returns: undefined
      }
      set_venue_access: {
        Args: { p_granted: boolean; p_wedding_id: string }
        Returns: undefined
      }
      shares_wedding_with: { Args: { _user_id: string }; Returns: boolean }
      staff_can_view_profile: { Args: { _user_id: string }; Returns: boolean }
      tenant_public: {
        Args: { _slug: string }
        Returns: {
          accent_color: string
          id: string
          logo_url: string
          name: string
          primary_color: string
          slug: string
          status: string
          tagline: string
        }[]
      }
      tenant_role: { Args: { _tenant_id: string }; Returns: string }
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

