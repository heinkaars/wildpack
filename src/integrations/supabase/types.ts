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
      lifelist_entries: {
        Row: {
          created_at: string
          date_spotted: string
          id: string
          location: string | null
          notes: string | null
          species_id: string
          species_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_spotted?: string
          id?: string
          location?: string | null
          notes?: string | null
          species_id: string
          species_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_spotted?: string
          id?: string
          location?: string | null
          notes?: string | null
          species_id?: string
          species_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      species: {
        Row: {
          active_time: string | null
          cache_expires_at: string | null
          category: string | null
          conservation_status: string | null
          created_at: string | null
          description: string | null
          diet: string | null
          habitat: string | null
          id: string
          image_urls: string[] | null
          inaturalist_id: number | null
          lat_max: number | null
          lat_min: number | null
          lon_max: number | null
          lon_min: number | null
          name: string
          observation_count: number | null
          primary_image_url: string | null
          region: string | null
          scientific_name: string
          size_cm: number | null
          source: string | null
          taxon_id: number | null
          updated_at: string | null
          weight_kg: number | null
          wikipedia_url: string | null
        }
        Insert: {
          active_time?: string | null
          cache_expires_at?: string | null
          category?: string | null
          conservation_status?: string | null
          created_at?: string | null
          description?: string | null
          diet?: string | null
          habitat?: string | null
          id: string
          image_urls?: string[] | null
          inaturalist_id?: number | null
          lat_max?: number | null
          lat_min?: number | null
          lon_max?: number | null
          lon_min?: number | null
          name: string
          observation_count?: number | null
          primary_image_url?: string | null
          region?: string | null
          scientific_name: string
          size_cm?: number | null
          source?: string | null
          taxon_id?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          wikipedia_url?: string | null
        }
        Update: {
          active_time?: string | null
          cache_expires_at?: string | null
          category?: string | null
          conservation_status?: string | null
          created_at?: string | null
          description?: string | null
          diet?: string | null
          habitat?: string | null
          id?: string
          image_urls?: string[] | null
          inaturalist_id?: number | null
          lat_max?: number | null
          lat_min?: number | null
          lon_max?: number | null
          lon_min?: number | null
          name?: string
          observation_count?: number | null
          primary_image_url?: string | null
          region?: string | null
          scientific_name?: string
          size_cm?: number | null
          source?: string | null
          taxon_id?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          wikipedia_url?: string | null
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
  public: {
    Enums: {},
  },
} as const
