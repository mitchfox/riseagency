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
      analyses: {
        Row: {
          analysis_type: string
          away_score: number | null
          away_team: string | null
          concept: string | null
          created_at: string
          explanation: string | null
          fixture_id: string | null
          home_score: number | null
          home_team: string | null
          id: string
          key_details: string | null
          matchups: Json | null
          opposition_strengths: string | null
          opposition_weaknesses: string | null
          player_image_url: string | null
          points: Json | null
          scheme_image_url: string | null
          scheme_paragraph_1: string | null
          scheme_paragraph_2: string | null
          scheme_title: string | null
          strengths_improvements: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          analysis_type: string
          away_score?: number | null
          away_team?: string | null
          concept?: string | null
          created_at?: string
          explanation?: string | null
          fixture_id?: string | null
          home_score?: number | null
          home_team?: string | null
          id?: string
          key_details?: string | null
          matchups?: Json | null
          opposition_strengths?: string | null
          opposition_weaknesses?: string | null
          player_image_url?: string | null
          points?: Json | null
          scheme_image_url?: string | null
          scheme_paragraph_1?: string | null
          scheme_paragraph_2?: string | null
          scheme_title?: string | null
          strengths_improvements?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          analysis_type?: string
          away_score?: number | null
          away_team?: string | null
          concept?: string | null
          created_at?: string
          explanation?: string | null
          fixture_id?: string | null
          home_score?: number | null
          home_team?: string | null
          id?: string
          key_details?: string | null
          matchups?: Json | null
          opposition_strengths?: string | null
          opposition_weaknesses?: string | null
          player_image_url?: string | null
          points?: Json | null
          scheme_image_url?: string | null
          scheme_paragraph_1?: string | null
          scheme_paragraph_2?: string | null
          scheme_title?: string | null
          strengths_improvements?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          category: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          category?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_analysis: {
        Row: {
          analysis_type: string | null
          attachments: Json | null
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          analysis_type?: string | null
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          analysis_type?: string | null
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaching_aphorisms: {
        Row: {
          body_text: string
          created_at: string
          featured_text: string
          id: string
          updated_at: string
        }
        Insert: {
          body_text?: string
          created_at?: string
          featured_text?: string
          id?: string
          updated_at?: string
        }
        Update: {
          body_text?: string
          created_at?: string
          featured_text?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaching_drills: {
        Row: {
          attachments: Json | null
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          equipment: string | null
          id: string
          players_required: string | null
          setup: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          equipment?: string | null
          id?: string
          players_required?: string | null
          setup?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          equipment?: string | null
          id?: string
          players_required?: string | null
          setup?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaching_exercises: {
        Row: {
          attachments: Json | null
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          is_own_video: boolean | null
          load: string | null
          reps: string | null
          rest_time: number | null
          sets: number | null
          tags: string[] | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_own_video?: boolean | null
          load?: string | null
          reps?: string | null
          rest_time?: number | null
          sets?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_own_video?: boolean | null
          load?: string | null
          reps?: string | null
          rest_time?: number | null
          sets?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      coaching_programmes: {
        Row: {
          attachments: Json | null
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
          weeks: number | null
        }
        Insert: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          weeks?: number | null
        }
        Update: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          weeks?: number | null
        }
        Relationships: []
      }
      coaching_sessions: {
        Row: {
          attachments: Json | null
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          duration: number | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          away_score: number | null
          away_team: string
          competition: string | null
          created_at: string
          home_score: number | null
          home_team: string
          id: string
          match_date: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          away_team: string
          competition?: string | null
          created_at?: string
          home_score?: number | null
          home_team: string
          id?: string
          match_date: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          away_team?: string
          competition?: string | null
          created_at?: string
          home_score?: number | null
          home_team?: string
          id?: string
          match_date?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_type: string
          id: string
        }
        Insert: {
          created_at?: string
          data: Json
          form_type: string
          id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          form_type?: string
          id?: string
        }
        Relationships: []
      }
      performance_report_actions: {
        Row: {
          action_description: string
          action_number: number
          action_score: number
          action_type: string
          analysis_id: string
          created_at: string | null
          id: string
          minute: number
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          action_description: string
          action_number: number
          action_score: number
          action_type: string
          analysis_id: string
          created_at?: string | null
          id?: string
          minute: number
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          action_description?: string
          action_number?: number
          action_score?: number
          action_type?: string
          analysis_id?: string
          created_at?: string | null
          id?: string
          minute?: number
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_report_actions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "player_analysis"
            referencedColumns: ["id"]
          },
        ]
      }
      player_analysis: {
        Row: {
          analysis_date: string
          analysis_writer_id: string | null
          created_at: string
          fixture_id: string | null
          id: string
          minutes_played: number | null
          notes: string | null
          opponent: string | null
          pdf_url: string | null
          player_id: string
          r90_score: number | null
          result: string | null
          striker_stats: Json | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          analysis_date: string
          analysis_writer_id?: string | null
          created_at?: string
          fixture_id?: string | null
          id?: string
          minutes_played?: number | null
          notes?: string | null
          opponent?: string | null
          pdf_url?: string | null
          player_id: string
          r90_score?: number | null
          result?: string | null
          striker_stats?: Json | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          analysis_date?: string
          analysis_writer_id?: string | null
          created_at?: string
          fixture_id?: string | null
          id?: string
          minutes_played?: number | null
          notes?: string | null
          opponent?: string | null
          pdf_url?: string | null
          player_id?: string
          r90_score?: number | null
          result?: string | null
          striker_stats?: Json | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_analysis_analysis_writer_id_fkey"
            columns: ["analysis_writer_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_analysis_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_analysis_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_analysis_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      player_fixtures: {
        Row: {
          created_at: string
          fixture_id: string
          id: string
          minutes_played: number | null
          player_id: string
        }
        Insert: {
          created_at?: string
          fixture_id: string
          id?: string
          minutes_played?: number | null
          player_id: string
        }
        Update: {
          created_at?: string
          fixture_id?: string
          id?: string
          minutes_played?: number | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_fixtures_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_fixtures_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_fixtures_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      player_programs: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_current: boolean
          overview_text: string | null
          phase_dates: string | null
          phase_image_url: string | null
          phase_name: string | null
          player_id: string
          player_image_url: string | null
          program_name: string
          schedule_notes: string | null
          sessions: Json | null
          updated_at: string
          weekly_schedules: Json | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_current?: boolean
          overview_text?: string | null
          phase_dates?: string | null
          phase_image_url?: string | null
          phase_name?: string | null
          player_id: string
          player_image_url?: string | null
          program_name: string
          schedule_notes?: string | null
          sessions?: Json | null
          updated_at?: string
          weekly_schedules?: Json | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_current?: boolean
          overview_text?: string | null
          phase_dates?: string | null
          phase_image_url?: string | null
          phase_name?: string | null
          player_id?: string
          player_image_url?: string | null
          program_name?: string
          schedule_notes?: string | null
          sessions?: Json | null
          updated_at?: string
          weekly_schedules?: Json | null
        }
        Relationships: []
      }
      player_stats: {
        Row: {
          assists: number | null
          clean_sheets: number | null
          created_at: string | null
          goals: number | null
          id: string
          matches: number | null
          minutes: number | null
          player_id: string
          saves: number | null
          updated_at: string | null
        }
        Insert: {
          assists?: number | null
          clean_sheets?: number | null
          created_at?: string | null
          goals?: number | null
          id?: string
          matches?: number | null
          minutes?: number | null
          player_id: string
          saves?: number | null
          updated_at?: string | null
        }
        Update: {
          assists?: number | null
          clean_sheets?: number | null
          created_at?: string | null
          goals?: number | null
          id?: string
          matches?: number | null
          minutes?: number | null
          player_id?: string
          saves?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          age: number
          bio: string | null
          category: string | null
          created_at: string | null
          email: string | null
          highlights: Json | null
          id: string
          image_url: string | null
          name: string
          nationality: string
          position: string
          representation_status: string | null
          updated_at: string | null
          visible_on_stars_page: boolean | null
        }
        Insert: {
          age: number
          bio?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          highlights?: Json | null
          id?: string
          image_url?: string | null
          name: string
          nationality: string
          position: string
          representation_status?: string | null
          updated_at?: string | null
          visible_on_stars_page?: boolean | null
        }
        Update: {
          age?: number
          bio?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          highlights?: Json | null
          id?: string
          image_url?: string | null
          name?: string
          nationality?: string
          position?: string
          representation_status?: string | null
          updated_at?: string | null
          visible_on_stars_page?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      psychological_sessions: {
        Row: {
          attachments: Json | null
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          duration: number | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          created_at: string
          duration: number | null
          hidden: boolean | null
          id: string
          location: Json | null
          page_path: string
          referrer: string | null
          user_agent: string | null
          visited_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          hidden?: boolean | null
          id?: string
          location?: Json | null
          page_path: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          hidden?: boolean | null
          id?: string
          location?: Json | null
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      players_public: {
        Row: {
          age: number | null
          bio: string | null
          category: string | null
          created_at: string | null
          highlights: Json | null
          id: string | null
          image_url: string | null
          name: string | null
          nationality: string | null
          position: string | null
          representation_status: string | null
          updated_at: string | null
          visible_on_stars_page: boolean | null
        }
        Insert: {
          age?: number | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          highlights?: Json | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          nationality?: string | null
          position?: string | null
          representation_status?: string | null
          updated_at?: string | null
          visible_on_stars_page?: boolean | null
        }
        Update: {
          age?: number | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          highlights?: Json | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          nationality?: string | null
          position?: string | null
          representation_status?: string | null
          updated_at?: string | null
          visible_on_stars_page?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
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
      app_role: ["admin", "staff", "user"],
    },
  },
} as const
