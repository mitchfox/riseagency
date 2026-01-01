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
      action_r90_category_mappings: {
        Row: {
          action_type: string
          created_at: string
          id: string
          r90_category: string
          r90_subcategory: string | null
          selected_rating_ids: string[] | null
          updated_at: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          r90_category: string
          r90_subcategory?: string | null
          selected_rating_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          r90_category?: string
          r90_subcategory?: string | null
          selected_rating_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_training_materials: {
        Row: {
          category: string
          content: string | null
          created_at: string
          description: string | null
          display_order: number | null
          external_link: string | null
          file_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          external_link?: string | null
          file_url?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          external_link?: string | null
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      analyses: {
        Row: {
          analysis_type: string
          away_score: number | null
          away_team: string | null
          away_team_bg_color: string | null
          away_team_logo: string | null
          concept: string | null
          created_at: string
          explanation: string | null
          fixture_id: string | null
          home_score: number | null
          home_team: string | null
          home_team_bg_color: string | null
          home_team_logo: string | null
          id: string
          key_details: string | null
          kit_primary_color: string | null
          kit_secondary_color: string | null
          match_date: string | null
          match_image_url: string | null
          matchups: Json | null
          opposition_strengths: string | null
          opposition_weaknesses: string | null
          player_image_url: string | null
          points: Json | null
          scheme_image_url: string | null
          scheme_paragraph_1: string | null
          scheme_paragraph_2: string | null
          scheme_title: string | null
          selected_scheme: string | null
          starting_xi: Json | null
          strengths_improvements: string | null
          title: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          analysis_type: string
          away_score?: number | null
          away_team?: string | null
          away_team_bg_color?: string | null
          away_team_logo?: string | null
          concept?: string | null
          created_at?: string
          explanation?: string | null
          fixture_id?: string | null
          home_score?: number | null
          home_team?: string | null
          home_team_bg_color?: string | null
          home_team_logo?: string | null
          id?: string
          key_details?: string | null
          kit_primary_color?: string | null
          kit_secondary_color?: string | null
          match_date?: string | null
          match_image_url?: string | null
          matchups?: Json | null
          opposition_strengths?: string | null
          opposition_weaknesses?: string | null
          player_image_url?: string | null
          points?: Json | null
          scheme_image_url?: string | null
          scheme_paragraph_1?: string | null
          scheme_paragraph_2?: string | null
          scheme_title?: string | null
          selected_scheme?: string | null
          starting_xi?: Json | null
          strengths_improvements?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          analysis_type?: string
          away_score?: number | null
          away_team?: string | null
          away_team_bg_color?: string | null
          away_team_logo?: string | null
          concept?: string | null
          created_at?: string
          explanation?: string | null
          fixture_id?: string | null
          home_score?: number | null
          home_team?: string | null
          home_team_bg_color?: string | null
          home_team_logo?: string | null
          id?: string
          key_details?: string | null
          kit_primary_color?: string | null
          kit_secondary_color?: string | null
          match_date?: string | null
          match_image_url?: string | null
          matchups?: Json | null
          opposition_strengths?: string | null
          opposition_weaknesses?: string | null
          player_image_url?: string | null
          points?: Json | null
          scheme_image_url?: string | null
          scheme_paragraph_1?: string | null
          scheme_paragraph_2?: string | null
          scheme_title?: string | null
          selected_scheme?: string | null
          starting_xi?: Json | null
          strengths_improvements?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
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
      analysis_point_examples: {
        Row: {
          category: string
          content: string | null
          created_at: string
          example_type: string
          id: string
          notes: string | null
          paragraph_1: string | null
          paragraph_2: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          category: string
          content?: string | null
          created_at?: string
          example_type?: string
          id?: string
          notes?: string | null
          paragraph_1?: string | null
          paragraph_2?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          example_type?: string
          id?: string
          notes?: string | null
          paragraph_1?: string | null
          paragraph_2?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bank_details: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          iban: string | null
          id: string
          is_default: boolean | null
          notes: string | null
          payment_type: string
          paypal_email: string | null
          sort_code: string | null
          swift_bic: string | null
          title: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          is_default?: boolean | null
          notes?: string | null
          payment_type: string
          paypal_email?: string | null
          sort_code?: string | null
          swift_bic?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          is_default?: boolean | null
          notes?: string | null
          payment_type?: string
          paypal_email?: string | null
          sort_code?: string | null
          swift_bic?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          assigned_to: string | null
          author_id: string
          canva_link: string | null
          category: string | null
          completed_by: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          id: string
          image_due_date: string | null
          image_url: string | null
          image_url_internal: string | null
          posted_at: string | null
          published: boolean | null
          scheduled_date: string | null
          title: string
          updated_at: string | null
          workflow_status: string
        }
        Insert: {
          assigned_to?: string | null
          author_id: string
          canva_link?: string | null
          category?: string | null
          completed_by?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_due_date?: string | null
          image_url?: string | null
          image_url_internal?: string | null
          posted_at?: string | null
          published?: boolean | null
          scheduled_date?: string | null
          title: string
          updated_at?: string | null
          workflow_status?: string
        }
        Update: {
          assigned_to?: string | null
          author_id?: string
          canva_link?: string | null
          category?: string | null
          completed_by?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_due_date?: string | null
          image_url?: string | null
          image_url_internal?: string | null
          posted_at?: string | null
          published?: boolean | null
          scheduled_date?: string | null
          title?: string
          updated_at?: string | null
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_documents: {
        Row: {
          category: string
          content: string | null
          created_at: string
          description: string | null
          display_order: number | null
          external_link: string | null
          file_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          external_link?: string | null
          file_url?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          external_link?: string | null
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      club_map_positions: {
        Row: {
          club_name: string
          country: string | null
          created_at: string
          id: string
          image_url: string | null
          is_calibration_point: boolean | null
          latitude: number | null
          longitude: number | null
          updated_at: string
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          club_name: string
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_calibration_point?: boolean | null
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          club_name?: string
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_calibration_point?: boolean | null
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: []
      }
      club_network_contacts: {
        Row: {
          city: string | null
          club_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          updated_at: string
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          city?: string | null
          club_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          city?: string | null
          club_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: []
      }
      club_outreach: {
        Row: {
          club_name: string
          contact_name: string | null
          contact_role: string | null
          created_at: string
          created_by: string | null
          id: string
          latest_update: string | null
          latest_update_date: string | null
          player_id: string
          status: string
          updated_at: string
        }
        Insert: {
          club_name: string
          contact_name?: string | null
          contact_role?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          latest_update?: string | null
          latest_update_date?: string | null
          player_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          club_name?: string
          contact_name?: string | null
          contact_role?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          latest_update?: string | null
          latest_update_date?: string | null
          player_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_outreach_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_outreach_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      club_outreach_updates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          outreach_id: string
          update_text: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          outreach_id: string
          update_text: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          outreach_id?: string
          update_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_outreach_updates_outreach_id_fkey"
            columns: ["outreach_id"]
            isOneToOne: false
            referencedRelation: "club_outreach"
            referencedColumns: ["id"]
          },
        ]
      }
      club_ratings: {
        Row: {
          academy_rating: string
          club_name: string
          country: string
          created_at: string
          first_team_rating: string
          id: string
          updated_at: string
        }
        Insert: {
          academy_rating?: string
          club_name: string
          country: string
          created_at?: string
          first_team_rating?: string
          id?: string
          updated_at?: string
        }
        Update: {
          academy_rating?: string
          club_name?: string
          country?: string
          created_at?: string
          first_team_rating?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
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
          author: string | null
          body_text: string | null
          created_at: string
          featured_text: string
          id: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          body_text?: string | null
          created_at?: string
          featured_text?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          body_text?: string | null
          created_at?: string
          featured_text?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaching_chat_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          messages: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          messages?: Json
          title?: string
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
          created_at: string
          description: string | null
          duration: number | null
          exercises: Json | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          exercises?: Json | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          exercises?: Json | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      component_locks: {
        Row: {
          component_name: string
          component_path: string | null
          created_at: string
          description: string | null
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          updated_at: string
        }
        Insert: {
          component_name: string
          component_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          updated_at?: string
        }
        Update: {
          component_name?: string
          component_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          id: string
          message: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          name?: string
          subject?: string
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
      flashcard_progress: {
        Row: {
          card_key: string
          card_type: string
          created_at: string
          ease_factor: number | null
          id: string
          interval_days: number | null
          last_reviewed: string | null
          next_review: string | null
          player_id: string
          repetitions: number | null
          updated_at: string
        }
        Insert: {
          card_key: string
          card_type: string
          created_at?: string
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed?: string | null
          next_review?: string | null
          player_id: string
          repetitions?: number | null
          updated_at?: string
        }
        Update: {
          card_key?: string
          card_type?: string
          created_at?: string
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed?: string | null
          next_review?: string | null
          player_id?: string
          repetitions?: number | null
          updated_at?: string
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
      formation_positions: {
        Row: {
          created_at: string | null
          formation: string
          id: string
          positions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          formation: string
          id?: string
          positions: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          formation?: string
          id?: string
          positions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      highlight_projects: {
        Row: {
          clips: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          player_id: string | null
          playlist_id: string | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          clips?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          player_id?: string | null
          playlist_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          clips?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          player_id?: string | null
          playlist_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "highlight_projects_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlight_projects_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_videos: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          order_position: number
          playlist_name: string
          updated_at: string | null
          video_title: string
          video_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_position: number
          playlist_name?: string
          updated_at?: string | null
          video_title: string
          video_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_position?: number
          playlist_name?: string
          updated_at?: string | null
          video_title?: string
          video_url?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          amount_paid: number | null
          billing_month: string | null
          converted_amount: number | null
          converted_currency: string | null
          created_at: string
          currency: string
          description: string | null
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          pdf_url: string | null
          player_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          billing_month?: string | null
          converted_amount?: number | null
          converted_currency?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          pdf_url?: string | null
          player_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          billing_month?: string | null
          converted_amount?: number | null
          converted_currency?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          pdf_url?: string | null
          player_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          category: string
          content: string | null
          created_at: string
          description: string | null
          effective_date: string | null
          file_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content?: string | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          file_url?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          budget: number | null
          created_at: string
          description: string | null
          end_date: string | null
          goals: string | null
          id: string
          platform: string[]
          start_date: string
          status: string
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goals?: string | null
          id?: string
          platform?: string[]
          start_date: string
          status?: string
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goals?: string | null
          id?: string
          platform?: string[]
          start_date?: string
          status?: string
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_gallery: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_type: string
          file_url: string
          id: string
          player_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_type: string
          file_url: string
          id?: string
          player_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_type?: string
          file_url?: string
          id?: string
          player_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_gallery_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_gallery_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_ideas: {
        Row: {
          canva_link: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          canva_link?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          canva_link?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_templates: {
        Row: {
          created_at: string
          id: string
          message_content: string
          message_title: string
          recipient_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_content: string
          message_title: string
          recipient_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_content?: string
          message_title?: string
          recipient_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          analyses: boolean
          clips: boolean
          created_at: string
          highlights: boolean
          id: string
          performance_reports: boolean
          player_id: string
          post_idea_canva: boolean
          post_idea_status: boolean
          post_ideas: boolean
          programmes: boolean
          updated_at: string
        }
        Insert: {
          analyses?: boolean
          clips?: boolean
          created_at?: string
          highlights?: boolean
          id?: string
          performance_reports?: boolean
          player_id: string
          post_idea_canva?: boolean
          post_idea_status?: boolean
          post_ideas?: boolean
          programmes?: boolean
          updated_at?: string
        }
        Update: {
          analyses?: boolean
          clips?: boolean
          created_at?: string
          highlights?: boolean
          id?: string
          performance_reports?: boolean
          player_id?: string
          post_idea_canva?: boolean
          post_idea_status?: boolean
          post_ideas?: boolean
          programmes?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notif_prefs_player"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notif_prefs_player"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      open_access_issues: {
        Row: {
          canva_draft_link: string | null
          created_at: string
          id: string
          month: string
          published: boolean
          updated_at: string
        }
        Insert: {
          canva_draft_link?: string | null
          created_at?: string
          id?: string
          month: string
          published?: boolean
          updated_at?: string
        }
        Update: {
          canva_draft_link?: string | null
          created_at?: string
          id?: string
          month?: string
          published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      open_access_pages: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          issue_id: string
          page_number: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          issue_id: string
          page_number: number
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          issue_id?: string
          page_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "open_access_pages_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "open_access_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          invoice_id: string | null
          payment_date: string
          payment_method: string | null
          player_id: string | null
          reference: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          payment_date?: string
          payment_method?: string | null
          player_id?: string | null
          reference?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          payment_date?: string
          payment_method?: string | null
          player_id?: string | null
          reference?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_report_actions: {
        Row: {
          action_description: string | null
          action_number: number
          action_score: number | null
          action_type: string | null
          analysis_id: string
          created_at: string | null
          id: string
          is_successful: boolean | null
          minute: number | null
          notes: string | null
          updated_at: string | null
          video_url: string | null
          zone: number | null
        }
        Insert: {
          action_description?: string | null
          action_number: number
          action_score?: number | null
          action_type?: string | null
          analysis_id: string
          created_at?: string | null
          id?: string
          is_successful?: boolean | null
          minute?: number | null
          notes?: string | null
          updated_at?: string | null
          video_url?: string | null
          zone?: number | null
        }
        Update: {
          action_description?: string | null
          action_number?: number
          action_score?: number | null
          action_type?: string | null
          analysis_id?: string
          created_at?: string | null
          id?: string
          is_successful?: boolean | null
          minute?: number | null
          notes?: string | null
          updated_at?: string | null
          video_url?: string | null
          zone?: number | null
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
      performance_statistics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          positions: string[]
          stat_key: string
          stat_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          positions?: string[]
          stat_key: string
          stat_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          positions?: string[]
          stat_key?: string
          stat_name?: string
          updated_at?: string
        }
        Relationships: []
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
          performance_overview: string | null
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
          performance_overview?: string | null
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
          performance_overview?: string | null
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
      player_club_submissions: {
        Row: {
          club_name: string
          contact_name: string | null
          contact_role: string | null
          created_at: string
          id: string
          notes: string | null
          player_id: string
          status: string
          updated_at: string
        }
        Insert: {
          club_name: string
          contact_name?: string | null
          contact_role?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          player_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          club_name?: string
          contact_name?: string | null
          contact_role?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          player_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_club_submissions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_club_submissions_player_id_fkey"
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
      player_hidden_stats: {
        Row: {
          created_at: string
          id: string
          player_id: string
          stat_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          stat_key: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          stat_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_hidden_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_hidden_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      player_nutrition_programs: {
        Row: {
          calories: string | null
          calories_match_day: string | null
          calories_recovery_day: string | null
          calories_training_day: string | null
          carbohydrates: string | null
          carbs_match_day: string | null
          carbs_recovery_day: string | null
          carbs_training_day: string | null
          created_at: string
          diet_framework: string | null
          fat: string | null
          fat_match_day: string | null
          fat_recovery_day: string | null
          fat_training_day: string | null
          id: string
          in_match_timings: string | null
          is_current: boolean | null
          key_additions: string | null
          match_day_overview: string | null
          micro_1_amount: string | null
          micro_1_name: string | null
          micro_2_amount: string | null
          micro_2_name: string | null
          overview: string | null
          phase_name: string
          player_id: string
          post_match_timings: string | null
          pre_match_timings: string | null
          protein: string | null
          protein_match_day: string | null
          protein_recovery_day: string | null
          protein_training_day: string | null
          recovery_day_overview: string | null
          recovery_day_timings: string | null
          supplement_1_amount: string | null
          supplement_1_name: string | null
          supplement_2_amount: string | null
          supplement_2_name: string | null
          supplement_3_amount: string | null
          supplement_3_name: string | null
          training_day_overview: string | null
          training_day_timings: string | null
          updated_at: string
          weekly_structure: string | null
        }
        Insert: {
          calories?: string | null
          calories_match_day?: string | null
          calories_recovery_day?: string | null
          calories_training_day?: string | null
          carbohydrates?: string | null
          carbs_match_day?: string | null
          carbs_recovery_day?: string | null
          carbs_training_day?: string | null
          created_at?: string
          diet_framework?: string | null
          fat?: string | null
          fat_match_day?: string | null
          fat_recovery_day?: string | null
          fat_training_day?: string | null
          id?: string
          in_match_timings?: string | null
          is_current?: boolean | null
          key_additions?: string | null
          match_day_overview?: string | null
          micro_1_amount?: string | null
          micro_1_name?: string | null
          micro_2_amount?: string | null
          micro_2_name?: string | null
          overview?: string | null
          phase_name: string
          player_id: string
          post_match_timings?: string | null
          pre_match_timings?: string | null
          protein?: string | null
          protein_match_day?: string | null
          protein_recovery_day?: string | null
          protein_training_day?: string | null
          recovery_day_overview?: string | null
          recovery_day_timings?: string | null
          supplement_1_amount?: string | null
          supplement_1_name?: string | null
          supplement_2_amount?: string | null
          supplement_2_name?: string | null
          supplement_3_amount?: string | null
          supplement_3_name?: string | null
          training_day_overview?: string | null
          training_day_timings?: string | null
          updated_at?: string
          weekly_structure?: string | null
        }
        Update: {
          calories?: string | null
          calories_match_day?: string | null
          calories_recovery_day?: string | null
          calories_training_day?: string | null
          carbohydrates?: string | null
          carbs_match_day?: string | null
          carbs_recovery_day?: string | null
          carbs_training_day?: string | null
          created_at?: string
          diet_framework?: string | null
          fat?: string | null
          fat_match_day?: string | null
          fat_recovery_day?: string | null
          fat_training_day?: string | null
          id?: string
          in_match_timings?: string | null
          is_current?: boolean | null
          key_additions?: string | null
          match_day_overview?: string | null
          micro_1_amount?: string | null
          micro_1_name?: string | null
          micro_2_amount?: string | null
          micro_2_name?: string | null
          overview?: string | null
          phase_name?: string
          player_id?: string
          post_match_timings?: string | null
          pre_match_timings?: string | null
          protein?: string | null
          protein_match_day?: string | null
          protein_recovery_day?: string | null
          protein_training_day?: string | null
          recovery_day_overview?: string | null
          recovery_day_timings?: string | null
          supplement_1_amount?: string | null
          supplement_1_name?: string | null
          supplement_2_amount?: string | null
          supplement_2_name?: string | null
          supplement_3_amount?: string | null
          supplement_3_name?: string | null
          training_day_overview?: string | null
          training_day_timings?: string | null
          updated_at?: string
          weekly_structure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_nutrition_programs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_nutrition_programs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      player_other_analysis: {
        Row: {
          analysis_id: string
          assigned_at: string
          id: string
          player_id: string
        }
        Insert: {
          analysis_id: string
          assigned_at?: string
          id?: string
          player_id: string
        }
        Update: {
          analysis_id?: string
          assigned_at?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_other_analysis_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "coaching_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_other_analysis_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_other_analysis_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      player_outreach_pro: {
        Row: {
          age: number | null
          created_at: string | null
          current_club: string | null
          date_of_birth: string | null
          id: string
          ig_handle: string | null
          initial_message: string | null
          messaged: boolean | null
          nationality: string | null
          notes: string | null
          player_name: string
          position: string | null
          response_received: boolean | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          current_club?: string | null
          date_of_birth?: string | null
          id?: string
          ig_handle?: string | null
          initial_message?: string | null
          messaged?: boolean | null
          nationality?: string | null
          notes?: string | null
          player_name: string
          position?: string | null
          response_received?: boolean | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          current_club?: string | null
          date_of_birth?: string | null
          id?: string
          ig_handle?: string | null
          initial_message?: string | null
          messaged?: boolean | null
          nationality?: string | null
          notes?: string | null
          player_name?: string
          position?: string | null
          response_received?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      player_outreach_youth: {
        Row: {
          age: number | null
          created_at: string | null
          current_club: string | null
          date_of_birth: string | null
          id: string
          ig_handle: string | null
          initial_message: string | null
          messaged: boolean | null
          nationality: string | null
          notes: string | null
          parent_approval: boolean | null
          parent_contact: string | null
          parents_name: string | null
          player_name: string
          position: string | null
          response_received: boolean | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          current_club?: string | null
          date_of_birth?: string | null
          id?: string
          ig_handle?: string | null
          initial_message?: string | null
          messaged?: boolean | null
          nationality?: string | null
          notes?: string | null
          parent_approval?: boolean | null
          parent_contact?: string | null
          parents_name?: string | null
          player_name: string
          position?: string | null
          response_received?: boolean | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          current_club?: string | null
          date_of_birth?: string | null
          id?: string
          ig_handle?: string | null
          initial_message?: string | null
          messaged?: boolean | null
          nationality?: string | null
          notes?: string | null
          parent_approval?: boolean | null
          parent_contact?: string | null
          parents_name?: string | null
          player_name?: string
          position?: string | null
          response_received?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      player_programs: {
        Row: {
          created_at: string
          display_order: number | null
          end_date: string | null
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
          end_date?: string | null
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
          end_date?: string | null
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
        Relationships: [
          {
            foreignKeyName: "fk_player_programs_player_id"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_player_programs_player_id"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
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
      player_test_results: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          player_id: string
          score: string
          status: string
          test_category: string
          test_date: string
          test_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          player_id: string
          score: string
          status?: string
          test_category: string
          test_date?: string
          test_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          player_id?: string
          score?: string
          status?: string
          test_category?: string
          test_date?: string
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_test_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_test_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          age: number
          agent_notes: string | null
          bio: string | null
          category: string | null
          club: string | null
          club_logo: string | null
          contracts_password: string | null
          created_at: string | null
          email: string | null
          highlighted_match: Json | null
          highlights: Json | null
          hover_image_url: string | null
          id: string
          image_url: string | null
          league: string | null
          links: Json | null
          name: string
          nationality: string
          next_program_notes: string | null
          position: string
          preferred_currency: string | null
          programming_notes: string | null
          representation_status: string | null
          transfer_priority: string | null
          transfer_status: string | null
          updated_at: string | null
          visible_on_stars_page: boolean | null
        }
        Insert: {
          age: number
          agent_notes?: string | null
          bio?: string | null
          category?: string | null
          club?: string | null
          club_logo?: string | null
          contracts_password?: string | null
          created_at?: string | null
          email?: string | null
          highlighted_match?: Json | null
          highlights?: Json | null
          hover_image_url?: string | null
          id?: string
          image_url?: string | null
          league?: string | null
          links?: Json | null
          name: string
          nationality: string
          next_program_notes?: string | null
          position: string
          preferred_currency?: string | null
          programming_notes?: string | null
          representation_status?: string | null
          transfer_priority?: string | null
          transfer_status?: string | null
          updated_at?: string | null
          visible_on_stars_page?: boolean | null
        }
        Update: {
          age?: number
          agent_notes?: string | null
          bio?: string | null
          category?: string | null
          club?: string | null
          club_logo?: string | null
          contracts_password?: string | null
          created_at?: string | null
          email?: string | null
          highlighted_match?: Json | null
          highlights?: Json | null
          hover_image_url?: string | null
          id?: string
          image_url?: string | null
          league?: string | null
          links?: Json | null
          name?: string
          nationality?: string
          next_program_notes?: string | null
          position?: string
          preferred_currency?: string | null
          programming_notes?: string | null
          representation_status?: string | null
          transfer_priority?: string | null
          transfer_status?: string | null
          updated_at?: string | null
          visible_on_stars_page?: boolean | null
        }
        Relationships: []
      }
      playlists: {
        Row: {
          clips: Json
          created_at: string
          id: string
          name: string
          player_id: string
          updated_at: string
        }
        Insert: {
          clips?: Json
          created_at?: string
          id?: string
          name: string
          player_id: string
          updated_at?: string
        }
        Update: {
          clips?: Json
          created_at?: string
          id?: string
          name?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      positional_guide_media: {
        Row: {
          created_at: string
          display_order: number
          guide_id: string | null
          id: string
          images: Json | null
          layout: string
          phase: string
          position: string
          subcategory: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          guide_id?: string | null
          id?: string
          images?: Json | null
          layout?: string
          phase: string
          position: string
          subcategory: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          guide_id?: string | null
          id?: string
          images?: Json | null
          layout?: string
          phase?: string
          position?: string
          subcategory?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positional_guide_media_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "positional_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      positional_guide_points: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_layout: string | null
          images: Json | null
          paragraphs: string[] | null
          phase: string
          position: string
          subcategory: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_layout?: string | null
          images?: Json | null
          paragraphs?: string[] | null
          phase: string
          position: string
          subcategory: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_layout?: string | null
          images?: Json | null
          paragraphs?: string[] | null
          phase?: string
          position?: string
          subcategory?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      positional_guides: {
        Row: {
          content: string | null
          created_at: string | null
          display_order: number | null
          id: string
          phase: string
          position: string
          subcategory: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          phase: string
          position: string
          subcategory: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          phase?: string
          position?: string
          subcategory?: string
          updated_at?: string | null
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
      prospects: {
        Row: {
          age: number | null
          age_group: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          current_club: string | null
          id: string
          last_contact_date: string | null
          name: string
          nationality: string | null
          notes: string | null
          position: string | null
          priority: string | null
          profile_image_url: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          age_group: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_club?: string | null
          id?: string
          last_contact_date?: string | null
          name: string
          nationality?: string | null
          notes?: string | null
          position?: string | null
          priority?: string | null
          profile_image_url?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          age_group?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_club?: string | null
          id?: string
          last_contact_date?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          position?: string | null
          priority?: string | null
          profile_image_url?: string | null
          stage?: string
          updated_at?: string
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
      push_config: {
        Row: {
          created_at: string | null
          id: string
          private_key: string
          public_key: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          private_key: string
          public_key: string
        }
        Update: {
          created_at?: string | null
          id?: string
          private_key?: string
          public_key?: string
        }
        Relationships: []
      }
      push_notification_tokens: {
        Row: {
          created_at: string
          device_type: string
          id: string
          player_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_type: string
          id?: string
          player_id: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_type?: string
          id?: string
          player_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_push_tokens_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_push_tokens_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      r90_ratings: {
        Row: {
          attachments: Json | null
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          score: string | null
          subcategory: string | null
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
          id?: string
          score?: string | null
          subcategory?: string | null
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
          id?: string
          score?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_signatures: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          signature_data: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          signature_data: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          signature_data?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scout_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          priority: string
          title: string
          updated_at: string
          visible_to_scouts: boolean
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: string
          title: string
          updated_at?: string
          visible_to_scouts?: boolean
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: string
          title?: string
          updated_at?: string
          visible_to_scouts?: boolean
        }
        Relationships: []
      }
      scouting_report_drafts: {
        Row: {
          additional_notes: string | null
          age: number | null
          agent_contract_end: string | null
          birth_day: number | null
          birth_month: number | null
          competition: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_relationship: string | null
          created_at: string | null
          current_club: string | null
          existing_agent: string | null
          id: string
          independent_report_url: string | null
          nationality: string | null
          player_contact_email: string | null
          player_contact_phone: string | null
          player_name: string
          position: string | null
          recommendation: string | null
          report_type: string | null
          scout_id: string | null
          skill_evaluations: Json | null
          strengths: string | null
          summary: string | null
          updated_at: string | null
          video_url: string | null
          video_urls: string[] | null
          weaknesses: string | null
          year_of_birth: number | null
        }
        Insert: {
          additional_notes?: string | null
          age?: number | null
          agent_contract_end?: string | null
          birth_day?: number | null
          birth_month?: number | null
          competition?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_relationship?: string | null
          created_at?: string | null
          current_club?: string | null
          existing_agent?: string | null
          id?: string
          independent_report_url?: string | null
          nationality?: string | null
          player_contact_email?: string | null
          player_contact_phone?: string | null
          player_name: string
          position?: string | null
          recommendation?: string | null
          report_type?: string | null
          scout_id?: string | null
          skill_evaluations?: Json | null
          strengths?: string | null
          summary?: string | null
          updated_at?: string | null
          video_url?: string | null
          video_urls?: string[] | null
          weaknesses?: string | null
          year_of_birth?: number | null
        }
        Update: {
          additional_notes?: string | null
          age?: number | null
          agent_contract_end?: string | null
          birth_day?: number | null
          birth_month?: number | null
          competition?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_relationship?: string | null
          created_at?: string | null
          current_club?: string | null
          existing_agent?: string | null
          id?: string
          independent_report_url?: string | null
          nationality?: string | null
          player_contact_email?: string | null
          player_contact_phone?: string | null
          player_name?: string
          position?: string | null
          recommendation?: string | null
          report_type?: string | null
          scout_id?: string | null
          skill_evaluations?: Json | null
          strengths?: string | null
          summary?: string | null
          updated_at?: string | null
          video_url?: string | null
          video_urls?: string[] | null
          weaknesses?: string | null
          year_of_birth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scouting_report_drafts_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      scouting_reports: {
        Row: {
          added_to_prospects: boolean | null
          age: number | null
          agent_contact: string | null
          agent_name: string | null
          auto_generated_review: string | null
          competition: string | null
          contact_email: string | null
          contact_phone: string | null
          contribution_type: string | null
          created_at: string
          current_club: string | null
          date_of_birth: string | null
          full_match_url: string | null
          height_cm: number | null
          id: string
          linked_player_id: string | null
          location: string | null
          match_context: string | null
          mental_rating: number | null
          nationality: string | null
          notes: string | null
          overall_rating: number | null
          physical_rating: number | null
          player_name: string
          position: string | null
          potential_assessment: string | null
          preferred_foot: string | null
          priority: string | null
          profile_image_url: string | null
          prospect_id: string | null
          recommendation: string | null
          scout_id: string | null
          scout_name: string | null
          scouting_date: string
          skill_evaluations: Json | null
          status: string
          strengths: string | null
          summary: string | null
          tactical_rating: number | null
          technical_rating: number | null
          updated_at: string
          video_url: string | null
          weaknesses: string | null
        }
        Insert: {
          added_to_prospects?: boolean | null
          age?: number | null
          agent_contact?: string | null
          agent_name?: string | null
          auto_generated_review?: string | null
          competition?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contribution_type?: string | null
          created_at?: string
          current_club?: string | null
          date_of_birth?: string | null
          full_match_url?: string | null
          height_cm?: number | null
          id?: string
          linked_player_id?: string | null
          location?: string | null
          match_context?: string | null
          mental_rating?: number | null
          nationality?: string | null
          notes?: string | null
          overall_rating?: number | null
          physical_rating?: number | null
          player_name: string
          position?: string | null
          potential_assessment?: string | null
          preferred_foot?: string | null
          priority?: string | null
          profile_image_url?: string | null
          prospect_id?: string | null
          recommendation?: string | null
          scout_id?: string | null
          scout_name?: string | null
          scouting_date?: string
          skill_evaluations?: Json | null
          status?: string
          strengths?: string | null
          summary?: string | null
          tactical_rating?: number | null
          technical_rating?: number | null
          updated_at?: string
          video_url?: string | null
          weaknesses?: string | null
        }
        Update: {
          added_to_prospects?: boolean | null
          age?: number | null
          agent_contact?: string | null
          agent_name?: string | null
          auto_generated_review?: string | null
          competition?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contribution_type?: string | null
          created_at?: string
          current_club?: string | null
          date_of_birth?: string | null
          full_match_url?: string | null
          height_cm?: number | null
          id?: string
          linked_player_id?: string | null
          location?: string | null
          match_context?: string | null
          mental_rating?: number | null
          nationality?: string | null
          notes?: string | null
          overall_rating?: number | null
          physical_rating?: number | null
          player_name?: string
          position?: string | null
          potential_assessment?: string | null
          preferred_foot?: string | null
          priority?: string | null
          profile_image_url?: string | null
          prospect_id?: string | null
          recommendation?: string | null
          scout_id?: string | null
          scout_name?: string | null
          scouting_date?: string
          skill_evaluations?: Json | null
          status?: string
          strengths?: string | null
          summary?: string | null
          tactical_rating?: number | null
          technical_rating?: number | null
          updated_at?: string
          video_url?: string | null
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouting_reports_linked_player_id_fkey"
            columns: ["linked_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouting_reports_linked_player_id_fkey"
            columns: ["linked_player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouting_reports_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouting_reports_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          commission_rate: number | null
          country: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          profile_image_url: string | null
          regions: string[] | null
          status: string
          successful_signings: number
          total_submissions: number
          updated_at: string
        }
        Insert: {
          commission_rate?: number | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          profile_image_url?: string | null
          regions?: string[] | null
          status?: string
          successful_signings?: number
          total_submissions?: number
          updated_at?: string
        }
        Update: {
          commission_rate?: number | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          profile_image_url?: string | null
          regions?: string[] | null
          status?: string
          successful_signings?: number
          total_submissions?: number
          updated_at?: string
        }
        Relationships: []
      }
      signature_contracts: {
        Row: {
          completed_pdf_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string
          file_url: string
          id: string
          owner_field_values: Json | null
          owner_signed_at: string | null
          share_token: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_pdf_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          owner_field_values?: Json | null
          owner_signed_at?: string | null
          share_token?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_pdf_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          owner_field_values?: Json | null
          owner_signed_at?: string | null
          share_token?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      signature_fields: {
        Row: {
          contract_id: string
          created_at: string
          display_order: number
          field_type: string
          height: number
          id: string
          label: string
          page_number: number
          required: boolean
          signer_party: string
          width: number
          x_position: number
          y_position: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          display_order?: number
          field_type: string
          height?: number
          id?: string
          label: string
          page_number?: number
          required?: boolean
          signer_party?: string
          width?: number
          x_position: number
          y_position: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          display_order?: number
          field_type?: string
          height?: number
          id?: string
          label?: string
          page_number?: number
          required?: boolean
          signer_party?: string
          width?: number
          x_position?: number
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "signature_fields_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "signature_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_submissions: {
        Row: {
          contract_id: string
          created_at: string
          field_values: Json
          id: string
          ip_address: string | null
          signed_at: string
          signer_email: string
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          field_values?: Json
          id?: string
          ip_address?: string | null
          signed_at?: string
          signer_email: string
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          field_values?: Json
          id?: string
          ip_address?: string | null
          signed_at?: string
          signer_email?: string
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_submissions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "signature_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      site_text: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          english_text: string
          id: string
          page_name: string
          section_name: string | null
          text_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          english_text: string
          id?: string
          page_name: string
          section_name?: string | null
          text_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          english_text?: string
          id?: string
          page_name?: string
          section_name?: string | null
          text_key?: string
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
      staff_availability: {
        Row: {
          availability_date: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          staff_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          availability_date?: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          staff_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          availability_date?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          staff_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_calendar_events: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          day_of_week: number | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          event_type: string | null
          id: string
          is_ongoing: boolean | null
          staff_id: string
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          is_ongoing?: boolean | null
          staff_id: string
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          is_ongoing?: boolean | null
          staff_id?: string
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_goals: {
        Row: {
          assigned_to: string[] | null
          color: string
          created_at: string
          current_value: number
          display_order: number
          id: string
          quarter: string
          target_value: number
          title: string
          unit: string
          updated_at: string
          year: number
        }
        Insert: {
          assigned_to?: string[] | null
          color?: string
          created_at?: string
          current_value?: number
          display_order?: number
          id?: string
          quarter: string
          target_value: number
          title: string
          unit: string
          updated_at?: string
          year: number
        }
        Update: {
          assigned_to?: string[] | null
          color?: string
          created_at?: string
          current_value?: number
          display_order?: number
          id?: string
          quarter?: string
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      staff_notification_events: {
        Row: {
          body: string | null
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          read_by: string[] | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          read_by?: string[] | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          read_by?: string[] | null
          title?: string | null
        }
        Relationships: []
      }
      staff_notification_settings: {
        Row: {
          created_at: string
          enabled: boolean
          event_type: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_type: string
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_type?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_tasks: {
        Row: {
          assigned_to: string[] | null
          category: string | null
          completed: boolean
          created_at: string
          display_order: number
          id: string
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string[] | null
          category?: string | null
          completed?: boolean
          created_at?: string
          display_order?: number
          id?: string
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string[] | null
          category?: string | null
          completed?: boolean
          created_at?: string
          display_order?: number
          id?: string
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_web_push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          subscription: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tactical_schemes: {
        Row: {
          created_at: string
          defence: string | null
          defensive_transition: string | null
          id: string
          offence: string | null
          offensive_transition: string | null
          opposition_scheme: string
          position: string
          team_scheme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          defence?: string | null
          defensive_transition?: string | null
          id?: string
          offence?: string | null
          offensive_transition?: string | null
          opposition_scheme: string
          position: string
          team_scheme: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          defence?: string | null
          defensive_transition?: string | null
          id?: string
          offence?: string | null
          offensive_transition?: string | null
          opposition_scheme?: string
          position?: string
          team_scheme?: string
          updated_at?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string
          croatian: string | null
          czech: string | null
          english: string
          french: string | null
          german: string | null
          id: string
          italian: string | null
          norwegian: string | null
          page_name: string
          polish: string | null
          portuguese: string | null
          russian: string | null
          spanish: string | null
          text_key: string
          turkish: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          croatian?: string | null
          czech?: string | null
          english: string
          french?: string | null
          german?: string | null
          id?: string
          italian?: string | null
          norwegian?: string | null
          page_name: string
          polish?: string | null
          portuguese?: string | null
          russian?: string | null
          spanish?: string | null
          text_key: string
          turkish?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          croatian?: string | null
          czech?: string | null
          english?: string
          french?: string | null
          german?: string | null
          id?: string
          italian?: string | null
          norwegian?: string | null
          page_name?: string
          polish?: string | null
          portuguese?: string | null
          russian?: string | null
          spanish?: string | null
          text_key?: string
          turkish?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      updates: {
        Row: {
          content: string
          created_at: string
          date: string
          id: string
          title: string
          updated_at: string
          visible: boolean
          visible_to_player_ids: string[] | null
        }
        Insert: {
          content: string
          created_at?: string
          date?: string
          id?: string
          title: string
          updated_at?: string
          visible?: boolean
          visible_to_player_ids?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          id?: string
          title?: string
          updated_at?: string
          visible?: boolean
          visible_to_player_ids?: string[] | null
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
      web_push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          player_id: string
          subscription: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id: string
          subscription: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string
          subscription?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_push_subscriptions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_push_subscriptions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_quick_messages: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          message_content: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          message_content: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          message_content?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
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
      get_player_name_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setup_app_settings: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "staff" | "user" | "marketeer"
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
      app_role: ["admin", "staff", "user", "marketeer"],
    },
  },
} as const
