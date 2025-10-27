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
      cache_city_catalog: {
        Row: {
          category: string
          city: string
          country: string
          created_at: string
          expires_at: string
          filters: Json | null
          id: string
          place_ids: string[] | null
          version: number
        }
        Insert: {
          category: string
          city: string
          country: string
          created_at?: string
          expires_at: string
          filters?: Json | null
          id?: string
          place_ids?: string[] | null
          version?: number
        }
        Update: {
          category?: string
          city?: string
          country?: string
          created_at?: string
          expires_at?: string
          filters?: Json | null
          id?: string
          place_ids?: string[] | null
          version?: number
        }
        Relationships: []
      }
      cache_duration_estimates: {
        Row: {
          assumptions: string[] | null
          confidence: number | null
          created_at: string
          duration_min: number[] | null
          expires_at: string
          id: string
          place_id: string
          profile_key: string
          risks: string[] | null
          season: string | null
          version: number
        }
        Insert: {
          assumptions?: string[] | null
          confidence?: number | null
          created_at?: string
          duration_min?: number[] | null
          expires_at: string
          id?: string
          place_id: string
          profile_key: string
          risks?: string[] | null
          season?: string | null
          version?: number
        }
        Update: {
          assumptions?: string[] | null
          confidence?: number | null
          created_at?: string
          duration_min?: number[] | null
          expires_at?: string
          id?: string
          place_id?: string
          profile_key?: string
          risks?: string[] | null
          season?: string | null
          version?: number
        }
        Relationships: []
      }
      cache_place_details: {
        Row: {
          created_at: string
          data: Json
          expires_at: string
          place_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          data: Json
          expires_at: string
          place_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          data?: Json
          expires_at?: string
          place_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      cache_routes: {
        Row: {
          created_at: string
          destination_place_id: string
          eta_min: number | null
          expires_at: string
          id: string
          mode: string
          origin_place_id: string
          polyline: string | null
          time_bucket: string
          version: number
        }
        Insert: {
          created_at?: string
          destination_place_id: string
          eta_min?: number | null
          expires_at: string
          id?: string
          mode: string
          origin_place_id: string
          polyline?: string | null
          time_bucket: string
          version?: number
        }
        Update: {
          created_at?: string
          destination_place_id?: string
          eta_min?: number | null
          expires_at?: string
          id?: string
          mode?: string
          origin_place_id?: string
          polyline?: string | null
          time_bucket?: string
          version?: number
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          post_id: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          post_id: string
          type: string
          url: string
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          post_id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          comment_id: string | null
          created_at: string | null
          from_user_id: string
          id: string
          post_id: string | null
          read: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          from_user_id: string
          id?: string
          post_id?: string | null
          read?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          from_user_id?: string
          id?: string
          post_id?: string | null
          read?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          location: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          location?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          reason: string
          reported_comment_id: string | null
          reported_post_id: string | null
          reported_user_id: string | null
          reporter_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason: string
          reported_comment_id?: string | null
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string
          reported_comment_id?: string | null
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_comment_id_fkey"
            columns: ["reported_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_post_id_fkey"
            columns: ["reported_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_alternatives: {
        Row: {
          created_at: string
          id: string
          order_index: number
          place_data: Json | null
          place_id: string
          place_name: string
          timeline_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index: number
          place_data?: Json | null
          place_id: string
          place_name: string
          timeline_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          place_data?: Json | null
          place_id?: string
          place_name?: string
          timeline_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_alternatives_timeline_item_id_fkey"
            columns: ["timeline_item_id"]
            isOneToOne: false
            referencedRelation: "trip_timeline_items"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_days: {
        Row: {
          city: string
          created_at: string
          date: string
          day_number: number
          id: string
          summary: string | null
          trip_id: string
          tzid: string
        }
        Insert: {
          city: string
          created_at?: string
          date: string
          day_number: number
          id?: string
          summary?: string | null
          trip_id: string
          tzid: string
        }
        Update: {
          city?: string
          created_at?: string
          date?: string
          day_number?: number
          id?: string
          summary?: string | null
          trip_id?: string
          tzid?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_hotels: {
        Row: {
          created_at: string
          distance_to_day_centroid: Json | null
          formatted_address: string | null
          geo: Json | null
          id: string
          is_selected: boolean | null
          name: string
          phone: string | null
          photos: Json | null
          place_id: string
          price_level: number | null
          rating: number | null
          reason: string | null
          score: number | null
          trip_id: string
          user_ratings_total: number | null
          website: string | null
        }
        Insert: {
          created_at?: string
          distance_to_day_centroid?: Json | null
          formatted_address?: string | null
          geo?: Json | null
          id?: string
          is_selected?: boolean | null
          name: string
          phone?: string | null
          photos?: Json | null
          place_id: string
          price_level?: number | null
          rating?: number | null
          reason?: string | null
          score?: number | null
          trip_id: string
          user_ratings_total?: number | null
          website?: string | null
        }
        Update: {
          created_at?: string
          distance_to_day_centroid?: Json | null
          formatted_address?: string | null
          geo?: Json | null
          id?: string
          is_selected?: boolean | null
          name?: string
          phone?: string | null
          photos?: Json | null
          place_id?: string
          price_level?: number | null
          rating?: number | null
          reason?: string | null
          score?: number | null
          trip_id?: string
          user_ratings_total?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_hotels_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_intents: {
        Row: {
          accessibility_needs: string[] | null
          budget_band: string | null
          created_at: string
          destinations: Json
          dietary_restrictions: string[] | null
          end_date: string
          id: string
          interests: string[] | null
          pace: string | null
          start_date: string
          travelers: number
          trip_id: string
          wake_time: string | null
        }
        Insert: {
          accessibility_needs?: string[] | null
          budget_band?: string | null
          created_at?: string
          destinations: Json
          dietary_restrictions?: string[] | null
          end_date: string
          id?: string
          interests?: string[] | null
          pace?: string | null
          start_date: string
          travelers?: number
          trip_id: string
          wake_time?: string | null
        }
        Update: {
          accessibility_needs?: string[] | null
          budget_band?: string | null
          created_at?: string
          destinations?: Json
          dietary_restrictions?: string[] | null
          end_date?: string
          id?: string
          interests?: string[] | null
          pace?: string | null
          start_date?: string
          travelers?: number
          trip_id?: string
          wake_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_intents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_timeline_items: {
        Row: {
          assumptions: string[] | null
          confidence: number | null
          created_at: string
          day_id: string
          duration_source: string | null
          estimated_duration_min: number[] | null
          evidence_snippets: string[] | null
          id: string
          kind: string
          meal_type: string | null
          order_index: number
          place_data: Json | null
          place_id: string | null
          place_name: string | null
          risks: string[] | null
          slot: string
        }
        Insert: {
          assumptions?: string[] | null
          confidence?: number | null
          created_at?: string
          day_id: string
          duration_source?: string | null
          estimated_duration_min?: number[] | null
          evidence_snippets?: string[] | null
          id?: string
          kind: string
          meal_type?: string | null
          order_index: number
          place_data?: Json | null
          place_id?: string | null
          place_name?: string | null
          risks?: string[] | null
          slot: string
        }
        Update: {
          assumptions?: string[] | null
          confidence?: number | null
          created_at?: string
          day_id?: string
          duration_source?: string | null
          estimated_duration_min?: number[] | null
          evidence_snippets?: string[] | null
          id?: string
          kind?: string
          meal_type?: string | null
          order_index?: number
          place_data?: Json | null
          place_id?: string | null
          place_name?: string | null
          risks?: string[] | null
          slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_timeline_items_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "trip_days"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_transfers: {
        Row: {
          created_at: string
          day_id: string
          eta_min: number | null
          from_place_id: string
          id: string
          mode: string
          polyline: string | null
          to_place_id: string
        }
        Insert: {
          created_at?: string
          day_id: string
          eta_min?: number | null
          from_place_id: string
          id?: string
          mode: string
          polyline?: string | null
          to_place_id: string
        }
        Update: {
          created_at?: string
          day_id?: string
          eta_min?: number | null
          from_place_id?: string
          id?: string
          mode?: string
          polyline?: string | null
          to_place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_transfers_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "trip_days"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          locale: string
          run_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          locale?: string
          run_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          locale?: string
          run_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
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
