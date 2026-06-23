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
      ai_detection_feedback: {
        Row: {
          action_type: string | null
          created_at: string
          created_by: string | null
          detected_timestamp: number | null
          expected_timestamp: number | null
          feedback_context: Json | null
          feedback_type: string
          id: string
          player_id: string | null
          reason: string | null
          video_analysis_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          created_by?: string | null
          detected_timestamp?: number | null
          expected_timestamp?: number | null
          feedback_context?: Json | null
          feedback_type: string
          id?: string
          player_id?: string | null
          reason?: string | null
          video_analysis_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string
          created_by?: string | null
          detected_timestamp?: number | null
          expected_timestamp?: number | null
          feedback_context?: Json | null
          feedback_type?: string
          id?: string
          player_id?: string | null
          reason?: string | null
          video_analysis_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_detection_feedback_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_detection_feedback_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_detection_feedback_video_analysis_id_fkey"
            columns: ["video_analysis_id"]
            isOneToOne: false
            referencedRelation: "video_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_shell_decisions: {
        Row: {
          created_at: string
          decision: string
          id: string
          player_id: string
          staff_user_id: string
          suggestion_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          player_id: string
          staff_user_id: string
          suggestion_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          player_id?: string
          staff_user_id?: string
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_shell_decisions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_shell_decisions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_shell_decisions_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_shell_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_shell_suggestions: {
        Row: {
          created_at: string
          id: string
          player_id: string
          preview_text: string
          section: string
          shell_content: Json
          shell_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          preview_text: string
          section: string
          shell_content?: Json
          shell_type: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          preview_text?: string
          section?: string
          shell_content?: Json
          shell_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_shell_suggestions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_shell_suggestions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          analysis_type: string
          away_score: number | null
          away_team: string | null
          away_team_bg_color: string | null
          away_team_logo: string | null
          category: string
          concept: string | null
          created_at: string
          estimated_ready_at: string | null
          example_banner: string | null
          example_language: string | null
          explanation: string | null
          fixture_id: string | null
          home_score: number | null
          home_team: string | null
          home_team_bg_color: string | null
          home_team_logo: string | null
          id: string
          is_example: boolean
          key_details: string | null
          kit_collar_color: string | null
          kit_number_color: string | null
          kit_primary_color: string | null
          kit_secondary_color: string | null
          kit_stripe_style: string | null
          linked_video_analysis_ids: string[] | null
          match_date: string | null
          match_image_url: string | null
          matchups: Json | null
          opposition_strengths: string | null
          opposition_weaknesses: string | null
          player_image_url: string | null
          player_name: string | null
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
          visibility_status: string
        }
        Insert: {
          analysis_type: string
          away_score?: number | null
          away_team?: string | null
          away_team_bg_color?: string | null
          away_team_logo?: string | null
          category?: string
          concept?: string | null
          created_at?: string
          estimated_ready_at?: string | null
          example_banner?: string | null
          example_language?: string | null
          explanation?: string | null
          fixture_id?: string | null
          home_score?: number | null
          home_team?: string | null
          home_team_bg_color?: string | null
          home_team_logo?: string | null
          id?: string
          is_example?: boolean
          key_details?: string | null
          kit_collar_color?: string | null
          kit_number_color?: string | null
          kit_primary_color?: string | null
          kit_secondary_color?: string | null
          kit_stripe_style?: string | null
          linked_video_analysis_ids?: string[] | null
          match_date?: string | null
          match_image_url?: string | null
          matchups?: Json | null
          opposition_strengths?: string | null
          opposition_weaknesses?: string | null
          player_image_url?: string | null
          player_name?: string | null
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
          visibility_status?: string
        }
        Update: {
          analysis_type?: string
          away_score?: number | null
          away_team?: string | null
          away_team_bg_color?: string | null
          away_team_logo?: string | null
          category?: string
          concept?: string | null
          created_at?: string
          estimated_ready_at?: string | null
          example_banner?: string | null
          example_language?: string | null
          explanation?: string | null
          fixture_id?: string | null
          home_score?: number | null
          home_team?: string | null
          home_team_bg_color?: string | null
          home_team_logo?: string | null
          id?: string
          is_example?: boolean
          key_details?: string | null
          kit_collar_color?: string | null
          kit_number_color?: string | null
          kit_primary_color?: string | null
          kit_secondary_color?: string | null
          kit_stripe_style?: string | null
          linked_video_analysis_ids?: string[] | null
          match_date?: string | null
          match_image_url?: string | null
          matchups?: Json | null
          opposition_strengths?: string | null
          opposition_weaknesses?: string | null
          player_image_url?: string | null
          player_name?: string | null
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
          visibility_status?: string
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
      analysis_player_tags: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          player_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          player_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_player_tags_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_player_tags_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_player_tags_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
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
      annotation_projects: {
        Row: {
          created_at: string
          id: string
          klips: Json
          name: string
          updated_at: string
          user_id: string
          video_name: string
          video_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          klips?: Json
          name: string
          updated_at?: string
          user_id: string
          video_name: string
          video_url: string
        }
        Update: {
          created_at?: string
          id?: string
          klips?: Json
          name?: string
          updated_at?: string
          user_id?: string
          video_name?: string
          video_url?: string
        }
        Relationships: []
      }
      available_roles: {
        Row: {
          created_at: string
          description: string | null
          role_key: string
          role_label: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          role_key: string
          role_label: string
        }
        Update: {
          created_at?: string
          description?: string | null
          role_key?: string
          role_label?: string
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
          graphic_suggestions: string | null
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
          graphic_suggestions?: string | null
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
          graphic_suggestions?: string | null
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
      business_plan: {
        Row: {
          business_description: string | null
          created_at: string
          executive_summary: string | null
          financial_plan: string | null
          id: string
          management_personnel: string | null
          marketing: string | null
          markets: string | null
          products_services: string | null
          swot_opportunities: string | null
          swot_strengths: string | null
          swot_threats: string | null
          swot_weaknesses: string | null
          updated_at: string
        }
        Insert: {
          business_description?: string | null
          created_at?: string
          executive_summary?: string | null
          financial_plan?: string | null
          id?: string
          management_personnel?: string | null
          marketing?: string | null
          markets?: string | null
          products_services?: string | null
          swot_opportunities?: string | null
          swot_strengths?: string | null
          swot_threats?: string | null
          swot_weaknesses?: string | null
          updated_at?: string
        }
        Update: {
          business_description?: string | null
          created_at?: string
          executive_summary?: string | null
          financial_plan?: string | null
          id?: string
          management_personnel?: string | null
          marketing?: string | null
          markets?: string | null
          products_services?: string | null
          swot_opportunities?: string | null
          swot_strengths?: string | null
          swot_threats?: string | null
          swot_weaknesses?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      case_study_messages: {
        Row: {
          case_study_id: string
          created_at: string
          id: string
          image_url: string | null
          message_order: number
          message_text: string | null
          note: string | null
          sender_name: string | null
          sender_type: string
          updated_at: string
        }
        Insert: {
          case_study_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          message_order?: number
          message_text?: string | null
          note?: string | null
          sender_name?: string | null
          sender_type?: string
          updated_at?: string
        }
        Update: {
          case_study_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message_order?: number
          message_text?: string | null
          note?: string | null
          sender_name?: string | null
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_study_messages_case_study_id_fkey"
            columns: ["case_study_id"]
            isOneToOne: false
            referencedRelation: "messaging_case_studies"
            referencedColumns: ["id"]
          },
        ]
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
          league: string | null
          league_level: string | null
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
          league?: string | null
          league_level?: string | null
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
          league?: string | null
          league_level?: string | null
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
          contact_strength: number | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          image_url: string | null
          is_favourite: boolean
          last_contacted_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          phone: string | null
          pinned_note: string | null
          position: string | null
          referred_by_contact_id: string | null
          tags: string[] | null
          updated_at: string
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          city?: string | null
          club_name?: string | null
          contact_strength?: number | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          is_favourite?: boolean
          last_contacted_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          pinned_note?: string | null
          position?: string | null
          referred_by_contact_id?: string | null
          tags?: string[] | null
          updated_at?: string
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          city?: string | null
          club_name?: string | null
          contact_strength?: number | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          is_favourite?: boolean
          last_contacted_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          pinned_note?: string | null
          position?: string | null
          referred_by_contact_id?: string | null
          tags?: string[] | null
          updated_at?: string
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "club_network_contacts_referred_by_contact_id_fkey"
            columns: ["referred_by_contact_id"]
            isOneToOne: false
            referencedRelation: "club_network_contacts"
            referencedColumns: ["id"]
          },
        ]
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
      club_outreach_club_contacts: {
        Row: {
          club_id: string
          contact_accent: string | null
          contact_club_id: string | null
          contact_image_url: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_role: string | null
          transfermarkt_url: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          contact_accent?: string | null
          contact_club_id?: string | null
          contact_image_url?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          transfermarkt_url?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          contact_accent?: string | null
          contact_club_id?: string | null
          contact_image_url?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          transfermarkt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_outreach_club_contacts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "club_map_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_outreach_club_contacts_contact_club_id_fkey"
            columns: ["contact_club_id"]
            isOneToOne: false
            referencedRelation: "club_map_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      club_outreach_communications: {
        Row: {
          channel: string | null
          contact_name: string | null
          contact_role: string | null
          contacted_at: string
          created_at: string
          created_by: string | null
          id: string
          next_step: string | null
          outreach_id: string
          player_id: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          channel?: string | null
          contact_name?: string | null
          contact_role?: string | null
          contacted_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_step?: string | null
          outreach_id: string
          player_id?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string | null
          contact_name?: string | null
          contact_role?: string | null
          contacted_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_step?: string | null
          outreach_id?: string
          player_id?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_outreach_communications_outreach_id_fkey"
            columns: ["outreach_id"]
            isOneToOne: false
            referencedRelation: "club_outreach_links"
            referencedColumns: ["id"]
          },
        ]
      }
      club_outreach_link_players: {
        Row: {
          created_at: string
          fit_recommendation: string | null
          id: string
          link_id: string
          player_id: string
          position_slot: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fit_recommendation?: string | null
          id?: string
          link_id: string
          player_id: string
          position_slot?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fit_recommendation?: string | null
          id?: string
          link_id?: string
          player_id?: string
          position_slot?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_outreach_link_players_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "club_outreach_links"
            referencedColumns: ["id"]
          },
        ]
      }
      club_outreach_links: {
        Row: {
          agent_logo_url: string | null
          agent_name: string | null
          alternate_profile_link_ids: string[]
          alternate_profiles_blurb: string | null
          archived_at: string | null
          club_contact_accent: string | null
          club_contact_name: string | null
          club_contact_phone: string | null
          club_contact_role: string | null
          club_id: string | null
          created_at: string
          created_by: string | null
          fit_recommendation: string | null
          id: string
          is_mandated: boolean
          is_pending_strategy_draft: boolean
          is_suggested_to_agent: boolean
          key_details: Json | null
          language: string
          mandate_proof_path: string | null
          mandate_proof_url: string | null
          mandated_agent_logo_url: string | null
          mandated_agent_name: string | null
          mandated_agent_phone: string | null
          mandated_agent_role: string | null
          player_id: string | null
          prepared_for_name: string | null
          season_data_mode: string
          season_id: string | null
          section_order: Json | null
          selected_video_ids: string[]
          short_id: string
          show_form: boolean
          show_in_numbers: boolean
          show_season_stats: boolean
          show_strengths: boolean
          status: string
          strategy_id: string | null
          suggested_agent_note: string | null
          target_type: string
          translations: Json | null
          updated_at: string
        }
        Insert: {
          agent_logo_url?: string | null
          agent_name?: string | null
          alternate_profile_link_ids?: string[]
          alternate_profiles_blurb?: string | null
          archived_at?: string | null
          club_contact_accent?: string | null
          club_contact_name?: string | null
          club_contact_phone?: string | null
          club_contact_role?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          fit_recommendation?: string | null
          id?: string
          is_mandated?: boolean
          is_pending_strategy_draft?: boolean
          is_suggested_to_agent?: boolean
          key_details?: Json | null
          language?: string
          mandate_proof_path?: string | null
          mandate_proof_url?: string | null
          mandated_agent_logo_url?: string | null
          mandated_agent_name?: string | null
          mandated_agent_phone?: string | null
          mandated_agent_role?: string | null
          player_id?: string | null
          prepared_for_name?: string | null
          season_data_mode?: string
          season_id?: string | null
          section_order?: Json | null
          selected_video_ids?: string[]
          short_id: string
          show_form?: boolean
          show_in_numbers?: boolean
          show_season_stats?: boolean
          show_strengths?: boolean
          status?: string
          strategy_id?: string | null
          suggested_agent_note?: string | null
          target_type?: string
          translations?: Json | null
          updated_at?: string
        }
        Update: {
          agent_logo_url?: string | null
          agent_name?: string | null
          alternate_profile_link_ids?: string[]
          alternate_profiles_blurb?: string | null
          archived_at?: string | null
          club_contact_accent?: string | null
          club_contact_name?: string | null
          club_contact_phone?: string | null
          club_contact_role?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          fit_recommendation?: string | null
          id?: string
          is_mandated?: boolean
          is_pending_strategy_draft?: boolean
          is_suggested_to_agent?: boolean
          key_details?: Json | null
          language?: string
          mandate_proof_path?: string | null
          mandate_proof_url?: string | null
          mandated_agent_logo_url?: string | null
          mandated_agent_name?: string | null
          mandated_agent_phone?: string | null
          mandated_agent_role?: string | null
          player_id?: string | null
          prepared_for_name?: string | null
          season_data_mode?: string
          season_id?: string | null
          section_order?: Json | null
          selected_video_ids?: string[]
          short_id?: string
          show_form?: boolean
          show_in_numbers?: boolean
          show_season_stats?: boolean
          show_strengths?: boolean
          status?: string
          strategy_id?: string | null
          suggested_agent_note?: string | null
          target_type?: string
          translations?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_outreach_links_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "club_map_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_outreach_links_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_outreach_links_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_outreach_links_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "player_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      club_outreach_player_defaults: {
        Row: {
          default_alternate_profile_link_ids: string[]
          default_alternate_profiles_blurb: string | null
          default_fit_recommendation: string | null
          default_key_details: Json | null
          default_match_by_match_category: string | null
          default_position: string | null
          default_season_data_mode: string | null
          default_season_id: string | null
          default_section_order: Json | null
          default_selected_video_ids: string[]
          default_show_form: boolean | null
          default_show_in_numbers: boolean | null
          default_show_season_stats: boolean | null
          default_show_strengths: boolean | null
          highlights_url: string | null
          match_by_match_game_order: Json
          match_by_match_stat_orders: Json
          player_id: string
          proof_of_representation_path: string | null
          stars_url_override: string | null
          transfermarkt_url: string | null
          updated_at: string
        }
        Insert: {
          default_alternate_profile_link_ids?: string[]
          default_alternate_profiles_blurb?: string | null
          default_fit_recommendation?: string | null
          default_key_details?: Json | null
          default_match_by_match_category?: string | null
          default_position?: string | null
          default_season_data_mode?: string | null
          default_season_id?: string | null
          default_section_order?: Json | null
          default_selected_video_ids?: string[]
          default_show_form?: boolean | null
          default_show_in_numbers?: boolean | null
          default_show_season_stats?: boolean | null
          default_show_strengths?: boolean | null
          highlights_url?: string | null
          match_by_match_game_order?: Json
          match_by_match_stat_orders?: Json
          player_id: string
          proof_of_representation_path?: string | null
          stars_url_override?: string | null
          transfermarkt_url?: string | null
          updated_at?: string
        }
        Update: {
          default_alternate_profile_link_ids?: string[]
          default_alternate_profiles_blurb?: string | null
          default_fit_recommendation?: string | null
          default_key_details?: Json | null
          default_match_by_match_category?: string | null
          default_position?: string | null
          default_season_data_mode?: string | null
          default_season_id?: string | null
          default_section_order?: Json | null
          default_selected_video_ids?: string[]
          default_show_form?: boolean | null
          default_show_in_numbers?: boolean | null
          default_show_season_stats?: boolean | null
          default_show_strengths?: boolean | null
          highlights_url?: string | null
          match_by_match_game_order?: Json
          match_by_match_stat_orders?: Json
          player_id?: string
          proof_of_representation_path?: string | null
          stars_url_override?: string | null
          transfermarkt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_outreach_player_defaults_default_season_id_fkey"
            columns: ["default_season_id"]
            isOneToOne: false
            referencedRelation: "player_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_outreach_player_defaults_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_outreach_player_defaults_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      club_outreach_quick_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      club_outreach_settings: {
        Row: {
          agent_image_url: string | null
          agent_name: string | null
          default_fit_recommendation: string | null
          default_season_data_mode: string
          default_video_selection_mode: string
          id: number
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          agent_image_url?: string | null
          agent_name?: string | null
          default_fit_recommendation?: string | null
          default_season_data_mode?: string
          default_video_selection_mode?: string
          id?: number
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          agent_image_url?: string | null
          agent_name?: string | null
          default_fit_recommendation?: string | null
          default_season_data_mode?: string
          default_video_selection_mode?: string
          id?: number
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      club_outreach_strategies: {
        Row: {
          created_at: string
          created_by: string | null
          defaults: Json
          filters: Json
          id: string
          name: string
          player_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          defaults?: Json
          filters?: Json
          id?: string
          name: string
          player_ids?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          defaults?: Json
          filters?: Json
          id?: string
          name?: string
          player_ids?: string[]
          updated_at?: string
        }
        Relationships: []
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
      club_outreach_visits: {
        Row: {
          id: string
          outreach_id: string
          referrer: string | null
          user_agent: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          outreach_id: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          outreach_id?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_outreach_visits_outreach_id_fkey"
            columns: ["outreach_id"]
            isOneToOne: false
            referencedRelation: "club_outreach_links"
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
      comparison_players: {
        Row: {
          club: string | null
          created_at: string
          id: string
          image_url: string | null
          metrics: Json | null
          name: string
          position: string
          r90_average: number | null
          season: string
          updated_at: string
        }
        Insert: {
          club?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          metrics?: Json | null
          name: string
          position: string
          r90_average?: number | null
          season?: string
          updated_at?: string
        }
        Update: {
          club?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          metrics?: Json | null
          name?: string
          position?: string
          r90_average?: number | null
          season?: string
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
      contact_interactions: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          interaction_type: string
          notes: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          interaction_type?: string
          notes?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          interaction_type?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "club_network_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      corporation_tax_records: {
        Row: {
          accounting_period_end: string
          accounting_period_start: string
          allowable_adjustment: number | null
          benefits_in_kind: number | null
          contractor_fees: number | null
          created_at: string
          director_loan_balance: number | null
          disallowable_portion: number | null
          dividends: number | null
          employer_ni: number | null
          employer_pension: number | null
          gross_salary: number | null
          id: string
          notes: string | null
          role: string
          service_type: string | null
          staff_name: string
          updated_at: string
        }
        Insert: {
          accounting_period_end?: string
          accounting_period_start?: string
          allowable_adjustment?: number | null
          benefits_in_kind?: number | null
          contractor_fees?: number | null
          created_at?: string
          director_loan_balance?: number | null
          disallowable_portion?: number | null
          dividends?: number | null
          employer_ni?: number | null
          employer_pension?: number | null
          gross_salary?: number | null
          id?: string
          notes?: string | null
          role?: string
          service_type?: string | null
          staff_name: string
          updated_at?: string
        }
        Update: {
          accounting_period_end?: string
          accounting_period_start?: string
          allowable_adjustment?: number | null
          benefits_in_kind?: number | null
          contractor_fees?: number | null
          created_at?: string
          director_loan_balance?: number | null
          disallowable_portion?: number | null
          dividends?: number | null
          employer_ni?: number | null
          employer_pension?: number | null
          gross_salary?: number | null
          id?: string
          notes?: string | null
          role?: string
          service_type?: string | null
          staff_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_marketing_resources: {
        Row: {
          color: string | null
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          folder_id: string | null
          icon: string | null
          id: string
          resource_type: string
          table_data: Json | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          color?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          resource_type?: string
          table_data?: Json | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          color?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          resource_type?: string
          table_data?: Json | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      dataset_frames: {
        Row: {
          action_id: string | null
          action_type: string
          annotations: Json | null
          created_at: string | null
          exported: boolean | null
          frame_time: number
          id: string
          image_url: string
          roboflow_uploaded_at: string | null
        }
        Insert: {
          action_id?: string | null
          action_type: string
          annotations?: Json | null
          created_at?: string | null
          exported?: boolean | null
          frame_time?: number
          id?: string
          image_url: string
          roboflow_uploaded_at?: string | null
        }
        Update: {
          action_id?: string | null
          action_type?: string
          annotations?: Json | null
          created_at?: string | null
          exported?: boolean | null
          frame_time?: number
          id?: string
          image_url?: string
          roboflow_uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dataset_frames_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "performance_report_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          id: string
          message: string
          name: string
          position_tags: string[]
          scope: string
          subject: string
          target_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          name: string
          position_tags?: string[]
          scope?: string
          subject: string
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          name?: string
          position_tags?: string[]
          scope?: string
          subject?: string
          target_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "recruitment_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_support_items: {
        Row: {
          author_label: string | null
          body: string | null
          created_at: string
          created_by_admin: boolean
          display_order: number
          id: string
          kind: string
          metadata: Json
          source_id: string | null
          source_type: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          author_label?: string | null
          body?: string | null
          created_at?: string
          created_by_admin?: boolean
          display_order?: number
          id?: string
          kind: string
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_label?: string | null
          body?: string | null
          created_at?: string
          created_by_admin?: boolean
          display_order?: number
          id?: string
          kind?: string
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exec_support_replies: {
        Row: {
          audio_url: string | null
          author_label: string | null
          body_text: string | null
          created_at: string
          id: string
          is_admin: boolean
          item_id: string
          resolved_at: string | null
          resolved_by_label: string | null
          status: string
        }
        Insert: {
          audio_url?: string | null
          author_label?: string | null
          body_text?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          item_id: string
          resolved_at?: string | null
          resolved_by_label?: string | null
          status?: string
        }
        Update: {
          audio_url?: string | null
          author_label?: string | null
          body_text?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          item_id?: string
          resolved_at?: string | null
          resolved_by_label?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "exec_support_replies_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "exec_support_items"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          currency: string
          date: string
          description: string
          id: string
          notes: string | null
          paid_by_name: string
          paid_by_user_id: string | null
          receipt_url: string | null
          reimbursed: boolean
          reimbursed_at: string | null
          tax_deductible: boolean
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          description: string
          id?: string
          notes?: string | null
          paid_by_name: string
          paid_by_user_id?: string | null
          receipt_url?: string | null
          reimbursed?: boolean
          reimbursed_at?: string | null
          tax_deductible?: boolean
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          description?: string
          id?: string
          notes?: string | null
          paid_by_name?: string
          paid_by_user_id?: string | null
          receipt_url?: string | null
          reimbursed?: boolean
          reimbursed_at?: string | null
          tax_deductible?: boolean
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      fff_package_completions: {
        Row: {
          analysis_id: string | null
          completed_at: string
          completed_by: string | null
          created_at: string
          fixture_id: string | null
          id: string
          notes: string | null
          package_id: string
          performance_report_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          completed_at?: string
          completed_by?: string | null
          created_at?: string
          fixture_id?: string | null
          id?: string
          notes?: string | null
          package_id: string
          performance_report_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          completed_at?: string
          completed_by?: string | null
          created_at?: string
          fixture_id?: string | null
          id?: string
          notes?: string | null
          package_id?: string
          performance_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fff_package_completions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "fff_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      fff_packages: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          package_size: number
          player_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          package_size?: number
          player_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          package_size?: number
          player_id?: string
          started_at?: string
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
          match_time: string | null
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
          match_time?: string | null
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
          match_time?: string | null
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
      form_grade_configs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metric_key: string
          metric_name: string
          thresholds: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metric_key: string
          metric_name: string
          thresholds?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metric_key?: string
          metric_name?: string
          thresholds?: Json
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
      highlight_maker_players: {
        Row: {
          created_at: string
          highlight_maker_id: string
          id: string
          player_id: string
        }
        Insert: {
          created_at?: string
          highlight_maker_id: string
          id?: string
          player_id: string
        }
        Update: {
          created_at?: string
          highlight_maker_id?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlight_maker_players_highlight_maker_id_fkey"
            columns: ["highlight_maker_id"]
            isOneToOne: false
            referencedRelation: "highlight_makers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlight_maker_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlight_maker_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      highlight_makers: {
        Row: {
          created_at: string
          display_name: string
          id: string
          last_login_at: string | null
          password: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          last_login_at?: string | null
          password: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          last_login_at?: string | null
          password?: string
          status?: string
          updated_at?: string
          username?: string
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
      interaction_history: {
        Row: {
          contact_id: string
          created_at: string
          follow_up_date: string | null
          id: string
          interaction_date: string
          interaction_type: string
          key_notes: string | null
          staff_user_id: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          follow_up_date?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          key_notes?: string | null
          staff_user_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          follow_up_date?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          key_notes?: string | null
          staff_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "club_network_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_activity_log: {
        Row: {
          category: string
          created_at: string
          description: string
          external_ref: string | null
          id: string
          occurred_at: string
          person: string
          source: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          external_ref?: string | null
          id?: string
          occurred_at?: string
          person: string
          source?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          external_ref?: string | null
          id?: string
          occurred_at?: string
          person?: string
          source?: string
        }
        Relationships: []
      }
      investor_bank_connections: {
        Row: {
          access_token: string | null
          account_label: string | null
          bank_name: string | null
          created_at: string
          id: string
          investor_user_id: string
          last_synced_at: string | null
          provider: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_label?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          investor_user_id: string
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_label?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          investor_user_id?: string
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      investor_bank_transactions: {
        Row: {
          amount_gbp: number
          category: string | null
          connection_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          description: string | null
          id: string
          merchant: string | null
          provider_transaction_id: string | null
          raw: Json | null
          spending_id: string | null
          status: string
          txn_date: string
        }
        Insert: {
          amount_gbp: number
          category?: string | null
          connection_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          merchant?: string | null
          provider_transaction_id?: string | null
          raw?: Json | null
          spending_id?: string | null
          status?: string
          txn_date: string
        }
        Update: {
          amount_gbp?: number
          category?: string | null
          connection_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          merchant?: string | null
          provider_transaction_id?: string | null
          raw?: Json | null
          spending_id?: string | null
          status?: string
          txn_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_bank_transactions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "investor_bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_bank_transactions_spending_id_fkey"
            columns: ["spending_id"]
            isOneToOne: false
            referencedRelation: "investor_spending"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_capacity_allocations: {
        Row: {
          assigned_staff: Json
          created_at: string
          custom_label: string | null
          day_of_week: string | null
          days_of_week: string[]
          display_order: number
          hours_per_week: number
          id: string
          player_type: string
          time_item_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_staff?: Json
          created_at?: string
          custom_label?: string | null
          day_of_week?: string | null
          days_of_week?: string[]
          display_order?: number
          hours_per_week?: number
          id?: string
          player_type: string
          time_item_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_staff?: Json
          created_at?: string
          custom_label?: string | null
          day_of_week?: string | null
          days_of_week?: string[]
          display_order?: number
          hours_per_week?: number
          id?: string
          player_type?: string
          time_item_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_capacity_allocations_time_item_id_fkey"
            columns: ["time_item_id"]
            isOneToOne: false
            referencedRelation: "investor_time_items"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_capacity_settings: {
        Row: {
          created_at: string
          current_pro_players: number
          current_youth_players: number
          daily_hours: Json
          id: string
          mode: string
          monthly_hours_total: number
          singleton: boolean
          staff_weekly_limits: Json
          updated_at: string
          weekly_hours_total: number
        }
        Insert: {
          created_at?: string
          current_pro_players?: number
          current_youth_players?: number
          daily_hours?: Json
          id?: string
          mode?: string
          monthly_hours_total?: number
          singleton?: boolean
          staff_weekly_limits?: Json
          updated_at?: string
          weekly_hours_total?: number
        }
        Update: {
          created_at?: string
          current_pro_players?: number
          current_youth_players?: number
          daily_hours?: Json
          id?: string
          mode?: string
          monthly_hours_total?: number
          singleton?: boolean
          staff_weekly_limits?: Json
          updated_at?: string
          weekly_hours_total?: number
        }
        Relationships: []
      }
      investor_deals: {
        Row: {
          counterparty: string | null
          created_at: string
          id: string
          stage: string
          timeline_notes: Json
          title: string
          updated_at: string
          value_gbp: number | null
        }
        Insert: {
          counterparty?: string | null
          created_at?: string
          id?: string
          stage?: string
          timeline_notes?: Json
          title: string
          updated_at?: string
          value_gbp?: number | null
        }
        Update: {
          counterparty?: string | null
          created_at?: string
          id?: string
          stage?: string
          timeline_notes?: Json
          title?: string
          updated_at?: string
          value_gbp?: number | null
        }
        Relationships: []
      }
      investor_forecast: {
        Row: {
          amount_gbp: number
          created_at: string
          id: string
          kind: string
          label: string | null
          month: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount_gbp?: number
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          month: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount_gbp?: number
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          month?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      investor_forecast_settings: {
        Row: {
          created_at: string
          id: string
          planned_monthly_spend_gbp: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          planned_monthly_spend_gbp?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          planned_monthly_spend_gbp?: number
          updated_at?: string
        }
        Relationships: []
      }
      investor_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      investor_other_income: {
        Row: {
          amount_gbp: number
          created_at: string
          id: string
          income_date: string
          notes: string | null
          source: string
          updated_at: string
        }
        Insert: {
          amount_gbp?: number
          created_at?: string
          id?: string
          income_date?: string
          notes?: string | null
          source: string
          updated_at?: string
        }
        Update: {
          amount_gbp?: number
          created_at?: string
          id?: string
          income_date?: string
          notes?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      investor_overview_cards: {
        Row: {
          content: string | null
          created_at: string
          detail_blocks: Json
          display_order: number
          id: string
          image_alt: string | null
          image_url: string | null
          metrics: Json
          section_id: string | null
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          detail_blocks?: Json
          display_order?: number
          id?: string
          image_alt?: string | null
          image_url?: string | null
          metrics?: Json
          section_id?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          detail_blocks?: Json
          display_order?: number
          id?: string
          image_alt?: string | null
          image_url?: string | null
          metrics?: Json
          section_id?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_overview_cards_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "investor_overview_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_overview_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      investor_pipeline: {
        Row: {
          age_group: string | null
          country: string | null
          created_at: string
          expected_value_gbp: number | null
          id: string
          name: string
          notes: string | null
          player_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          country?: string | null
          created_at?: string
          expected_value_gbp?: number | null
          id?: string
          name: string
          notes?: string | null
          player_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          country?: string | null
          created_at?: string
          expected_value_gbp?: number | null
          id?: string
          name?: string
          notes?: string | null
          player_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      investor_priority_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      investor_priority_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number
          highlights: string[]
          id: string
          rough_time: string | null
          staff_task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          highlights?: string[]
          id?: string
          rough_time?: string | null
          staff_task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          highlights?: string[]
          id?: string
          rough_time?: string | null
          staff_task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_priority_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "investor_priority_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_projections: {
        Row: {
          costs_gbp: number
          created_at: string
          display_order: number
          extra_income_gbp: number
          extra_income_rows: Json
          id: string
          name: string
          notes: string | null
          player_rows: Json
          scenario: string
          updated_at: string
        }
        Insert: {
          costs_gbp?: number
          created_at?: string
          display_order?: number
          extra_income_gbp?: number
          extra_income_rows?: Json
          id?: string
          name?: string
          notes?: string | null
          player_rows?: Json
          scenario?: string
          updated_at?: string
        }
        Update: {
          costs_gbp?: number
          created_at?: string
          display_order?: number
          extra_income_gbp?: number
          extra_income_rows?: Json
          id?: string
          name?: string
          notes?: string | null
          player_rows?: Json
          scenario?: string
          updated_at?: string
        }
        Relationships: []
      }
      investor_sessions: {
        Row: {
          created_at: string
          expires_at: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "investor_users"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_spending: {
        Row: {
          amount_gbp: number
          bank_transaction_id: string | null
          category: string
          created_at: string
          id: string
          is_personal: boolean
          notes: string | null
          source: string
          spend_date: string
          vendor: string | null
        }
        Insert: {
          amount_gbp: number
          bank_transaction_id?: string | null
          category: string
          created_at?: string
          id?: string
          is_personal?: boolean
          notes?: string | null
          source?: string
          spend_date: string
          vendor?: string | null
        }
        Update: {
          amount_gbp?: number
          bank_transaction_id?: string | null
          category?: string
          created_at?: string
          id?: string
          is_personal?: boolean
          notes?: string | null
          source?: string
          spend_date?: string
          vendor?: string | null
        }
        Relationships: []
      }
      investor_time_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      investor_time_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number
          highlights: string[]
          id: string
          rough_time: string | null
          staff_task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          highlights?: string[]
          id?: string
          rough_time?: string | null
          staff_task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          highlights?: string[]
          id?: string
          rough_time?: string | null
          staff_task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_time_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "investor_time_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_timeline: {
        Row: {
          amount_gbp: number | null
          created_at: string
          end_date: string | null
          goal: string | null
          id: string
          kind: string
          notes: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          amount_gbp?: number | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          kind?: string
          notes?: string | null
          start_date: string
          title?: string
          updated_at?: string
        }
        Update: {
          amount_gbp?: number | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          kind?: string
          notes?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      investor_updates: {
        Row: {
          achieved_on: string
          author_label: string | null
          body: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          achieved_on?: string
          author_label?: string | null
          body?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          achieved_on?: string
          author_label?: string | null
          body?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      investor_users: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          password_hash: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_admin?: boolean
          password_hash: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
          password_hash?: string
          status?: string
          updated_at?: string
          username?: string
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
      jobs: {
        Row: {
          created_at: string
          department: string
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          requirements: string | null
          responsibilities: string | null
          salary_range: string | null
          seo_image_url: string | null
          slug: string
          summary: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          requirements?: string | null
          responsibilities?: string | null
          salary_range?: string | null
          seo_image_url?: string | null
          slug: string
          summary?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          requirements?: string | null
          responsibilities?: string | null
          salary_range?: string | null
          seo_image_url?: string | null
          slug?: string
          summary?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
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
      market_table_entries: {
        Row: {
          chief_scout_name: string | null
          club_id: string
          created_at: string
          id: string
          market_table_key: string
          notes: string | null
          technical_director_name: string | null
          updated_at: string
        }
        Insert: {
          chief_scout_name?: string | null
          club_id: string
          created_at?: string
          id?: string
          market_table_key: string
          notes?: string | null
          technical_director_name?: string | null
          updated_at?: string
        }
        Update: {
          chief_scout_name?: string | null
          club_id?: string
          created_at?: string
          id?: string
          market_table_key?: string
          notes?: string | null
          technical_director_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_table_entries_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "club_map_positions"
            referencedColumns: ["id"]
          },
        ]
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
          focal_point: string | null
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
          focal_point?: string | null
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
          focal_point?: string | null
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
      marketing_schedule_items: {
        Row: {
          completion_log: string[] | null
          created_at: string | null
          day_of_week: string
          display_order: number | null
          id: string
          image_url: string | null
          last_completed_at: string | null
          linked_draft_id: string | null
          notes: string | null
          owner_id: string | null
          platform_format: string | null
          post_type: string
          scheduled_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completion_log?: string[] | null
          created_at?: string | null
          day_of_week: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          last_completed_at?: string | null
          linked_draft_id?: string | null
          notes?: string | null
          owner_id?: string | null
          platform_format?: string | null
          post_type: string
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completion_log?: string[] | null
          created_at?: string | null
          day_of_week?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          last_completed_at?: string | null
          linked_draft_id?: string | null
          notes?: string | null
          owner_id?: string | null
          platform_format?: string | null
          post_type?: string
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_strategy_platforms: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketing_strategy_sections: {
        Row: {
          content: string | null
          created_at: string
          id: string
          platform_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          platform_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          platform_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_strategy_sections_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "marketing_strategy_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_templates: {
        Row: {
          created_at: string
          id: string
          message_content: string
          message_title: string
          recipient_type: string
          show_on_investor_portal: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_content: string
          message_title: string
          recipient_type: string
          show_on_investor_portal?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_content?: string
          message_title?: string
          recipient_type?: string
          show_on_investor_portal?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      marketing_tips: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_pathways: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      messaging_case_studies: {
        Row: {
          context_notes: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          context_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          context_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messaging_script_nodes: {
        Row: {
          branch_label: string | null
          content: string | null
          created_at: string
          id: string
          kind: string
          optional: boolean
          parent_node_id: string | null
          script_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          branch_label?: string | null
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          optional?: boolean
          parent_node_id?: string | null
          script_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          branch_label?: string | null
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          optional?: boolean
          parent_node_id?: string | null
          script_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_script_nodes_parent_node_id_fkey"
            columns: ["parent_node_id"]
            isOneToOne: false
            referencedRelation: "messaging_script_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_script_nodes_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "messaging_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_script_objections: {
        Row: {
          created_at: string
          id: string
          objection: string
          response: string | null
          script_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          objection: string
          response?: string | null
          script_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          objection?: string
          response?: string | null
          script_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_script_objections_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "messaging_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_scripts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      network_club_profiles: {
        Row: {
          club_name: string
          country: string | null
          created_at: string
          description: string | null
          id: string
          league: string | null
          notes: string | null
          playing_style: string | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          club_name: string
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          league?: string | null
          notes?: string | null
          playing_style?: string | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          club_name?: string
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          league?: string | null
          notes?: string | null
          playing_style?: string | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      network_country_profiles: {
        Row: {
          common_formations: string | null
          country_name: string
          created_at: string
          id: string
          key_characteristics: string | null
          league_structure: string | null
          notes: string | null
          playing_style: string | null
          updated_at: string
        }
        Insert: {
          common_formations?: string | null
          country_name: string
          created_at?: string
          id?: string
          key_characteristics?: string | null
          league_structure?: string | null
          notes?: string | null
          playing_style?: string | null
          updated_at?: string
        }
        Update: {
          common_formations?: string | null
          country_name?: string
          created_at?: string
          id?: string
          key_characteristics?: string | null
          league_structure?: string | null
          notes?: string | null
          playing_style?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      network_role_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          notes: string | null
          role_name: string
          seniority_level: string | null
          typical_responsibilities: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          role_name: string
          seniority_level?: string | null
          typical_responsibilities?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          role_name?: string
          seniority_level?: string | null
          typical_responsibilities?: string | null
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
      nutrition_recipes: {
        Row: {
          calories: string | null
          carbs: string | null
          category: string
          created_at: string | null
          description: string | null
          fat: string | null
          id: string
          image_url: string | null
          ingredients: string | null
          method: string | null
          protein: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          calories?: string | null
          carbs?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          fat?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          method?: string | null
          protein?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          calories?: string | null
          carbs?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          fat?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          method?: string | null
          protein?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
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
      outreach_interactions: {
        Row: {
          channel: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          occurred_at: string
          outreach_id: string
          outreach_type: string
          summary: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          occurred_at?: string
          outreach_id: string
          outreach_type: string
          summary?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          occurred_at?: string
          outreach_id?: string
          outreach_type?: string
          summary?: string | null
        }
        Relationships: []
      }
      outreach_relationship_notes: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          id: string
          relationship_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          relationship_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_relationship_notes_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "outreach_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_relationships: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean
          last_outreach_at: string | null
          nudge_dates: string[]
          nudge_week_start: string | null
          rapport_level: Database["public"]["Enums"]["outreach_rapport_level"]
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          last_outreach_at?: string | null
          nudge_dates?: string[]
          nudge_week_start?: string | null
          rapport_level?: Database["public"]["Enums"]["outreach_rapport_level"]
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          last_outreach_at?: string | null
          nudge_dates?: string[]
          nudge_week_start?: string | null
          rapport_level?: Database["public"]["Enums"]["outreach_rapport_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_relationships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "club_network_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_strategy_staging: {
        Row: {
          defaults: Json
          filters: Json
          strategy_id: string
        }
        Insert: {
          defaults: Json
          filters: Json
          strategy_id: string
        }
        Update: {
          defaults?: Json
          filters?: Json
          strategy_id?: string
        }
        Relationships: []
      }
      outreach_tools_doc_items: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          doc_id: string
          id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          doc_id: string
          id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          doc_id?: string
          id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_tools_doc_items_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "outreach_tools_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_tools_docs: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          sort_order: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          case_study_content: string | null
          case_study_image_url: string | null
          case_study_title: string | null
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_featured: boolean | null
          logo_url: string | null
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          case_study_content?: string | null
          case_study_image_url?: string | null
          case_study_title?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          case_study_content?: string | null
          case_study_image_url?: string | null
          case_study_title?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
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
          clip_annotations: Json | null
          clip_end: number | null
          clip_id: string | null
          clip_start: number | null
          created_at: string | null
          id: string
          involved_players: Json
          is_first_half: boolean
          is_successful: boolean | null
          minute: number | null
          notes: string | null
          recorded_stat: Json | null
          updated_at: string | null
          video_analysis_id: string | null
          video_url: string | null
          zone: number | null
          zone_details: Json | null
        }
        Insert: {
          action_description?: string | null
          action_number: number
          action_score?: number | null
          action_type?: string | null
          analysis_id: string
          clip_annotations?: Json | null
          clip_end?: number | null
          clip_id?: string | null
          clip_start?: number | null
          created_at?: string | null
          id?: string
          involved_players?: Json
          is_first_half?: boolean
          is_successful?: boolean | null
          minute?: number | null
          notes?: string | null
          recorded_stat?: Json | null
          updated_at?: string | null
          video_analysis_id?: string | null
          video_url?: string | null
          zone?: number | null
          zone_details?: Json | null
        }
        Update: {
          action_description?: string | null
          action_number?: number
          action_score?: number | null
          action_type?: string | null
          analysis_id?: string
          clip_annotations?: Json | null
          clip_end?: number | null
          clip_id?: string | null
          clip_start?: number | null
          created_at?: string | null
          id?: string
          involved_players?: Json
          is_first_half?: boolean
          is_successful?: boolean | null
          minute?: number | null
          notes?: string | null
          recorded_stat?: Json | null
          updated_at?: string | null
          video_analysis_id?: string | null
          video_url?: string | null
          zone?: number | null
          zone_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_report_actions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "player_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_report_actions_video_analysis_id_fkey"
            columns: ["video_analysis_id"]
            isOneToOne: false
            referencedRelation: "video_analyses"
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
      periodisation_plans: {
        Row: {
          created_at: string
          id: string
          phases: Json
          player_id: string
          season: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          phases?: Json
          player_id: string
          season?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          phases?: Json
          player_id?: string
          season?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_analysis: {
        Row: {
          analysis_date: string
          analysis_writer_id: string | null
          category: string
          club_logo_url: string | null
          created_at: string
          data_unavailable: boolean
          estimated_ready_at: string | null
          fixture_id: string | null
          fixture_stats: Json | null
          id: string
          is_scouting_report: boolean
          is_todo: boolean
          linked_video_analysis_ids: string[] | null
          minutes_played: number | null
          notes: string | null
          opponent: string | null
          opponent_logo_url: string | null
          opposition_color: string | null
          pdf_url: string | null
          performance_overview: string | null
          placeholder_minutes: number | null
          placeholder_per: number | null
          placeholder_raw_score: number | null
          placeholder_sr: number | null
          player_id: string | null
          r90_score: number | null
          report_type: string
          result: string | null
          season_final: boolean
          show_descriptions: boolean
          striker_stats: Json | null
          team_color: string | null
          team_logo_url: string | null
          team_name: string | null
          team_roster: Json
          team_scoring_method: string
          todo_note: string | null
          translated_content: Json | null
          updated_at: string
          video_url: string | null
          visibility_status: string
        }
        Insert: {
          analysis_date: string
          analysis_writer_id?: string | null
          category?: string
          club_logo_url?: string | null
          created_at?: string
          data_unavailable?: boolean
          estimated_ready_at?: string | null
          fixture_id?: string | null
          fixture_stats?: Json | null
          id?: string
          is_scouting_report?: boolean
          is_todo?: boolean
          linked_video_analysis_ids?: string[] | null
          minutes_played?: number | null
          notes?: string | null
          opponent?: string | null
          opponent_logo_url?: string | null
          opposition_color?: string | null
          pdf_url?: string | null
          performance_overview?: string | null
          placeholder_minutes?: number | null
          placeholder_per?: number | null
          placeholder_raw_score?: number | null
          placeholder_sr?: number | null
          player_id?: string | null
          r90_score?: number | null
          report_type?: string
          result?: string | null
          season_final?: boolean
          show_descriptions?: boolean
          striker_stats?: Json | null
          team_color?: string | null
          team_logo_url?: string | null
          team_name?: string | null
          team_roster?: Json
          team_scoring_method?: string
          todo_note?: string | null
          translated_content?: Json | null
          updated_at?: string
          video_url?: string | null
          visibility_status?: string
        }
        Update: {
          analysis_date?: string
          analysis_writer_id?: string | null
          category?: string
          club_logo_url?: string | null
          created_at?: string
          data_unavailable?: boolean
          estimated_ready_at?: string | null
          fixture_id?: string | null
          fixture_stats?: Json | null
          id?: string
          is_scouting_report?: boolean
          is_todo?: boolean
          linked_video_analysis_ids?: string[] | null
          minutes_played?: number | null
          notes?: string | null
          opponent?: string | null
          opponent_logo_url?: string | null
          opposition_color?: string | null
          pdf_url?: string | null
          performance_overview?: string | null
          placeholder_minutes?: number | null
          placeholder_per?: number | null
          placeholder_raw_score?: number | null
          placeholder_sr?: number | null
          player_id?: string | null
          r90_score?: number | null
          report_type?: string
          result?: string | null
          season_final?: boolean
          show_descriptions?: boolean
          striker_stats?: Json | null
          team_color?: string | null
          team_logo_url?: string | null
          team_name?: string | null
          team_roster?: Json
          team_scoring_method?: string
          todo_note?: string | null
          translated_content?: Json | null
          updated_at?: string
          video_url?: string | null
          visibility_status?: string
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
      player_categories: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      player_club_contracts: {
        Row: {
          annual_salary: number | null
          bonuses_notes: string | null
          clauses_notes: string | null
          club_name: string
          contract_end: string | null
          contract_start: string | null
          created_at: string
          general_notes: string | null
          id: string
          is_current: boolean
          player_id: string
          sponsor_notes: string | null
          updated_at: string
        }
        Insert: {
          annual_salary?: number | null
          bonuses_notes?: string | null
          clauses_notes?: string | null
          club_name: string
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          general_notes?: string | null
          id?: string
          is_current?: boolean
          player_id: string
          sponsor_notes?: string | null
          updated_at?: string
        }
        Update: {
          annual_salary?: number | null
          bonuses_notes?: string | null
          clauses_notes?: string | null
          club_name?: string
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          general_notes?: string | null
          id?: string
          is_current?: boolean
          player_id?: string
          sponsor_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_club_contracts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_club_contracts_player_id_fkey"
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
      player_database_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          player_key: string
          player_name: string | null
          source: string | null
          source_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          content: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          player_key: string
          player_name?: string | null
          source?: string | null
          source_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          player_key?: string
          player_name?: string | null
          source?: string | null
          source_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      player_form_config: {
        Row: {
          created_at: string
          id: string
          match_by_match_default_category: string | null
          player_id: string
          stats: Json
          updated_at: string
          window_size: number
        }
        Insert: {
          created_at?: string
          id?: string
          match_by_match_default_category?: string | null
          player_id: string
          stats?: Json
          updated_at?: string
          window_size?: number
        }
        Update: {
          created_at?: string
          id?: string
          match_by_match_default_category?: string | null
          player_id?: string
          stats?: Json
          updated_at?: string
          window_size?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_form_config_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_form_config_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      player_goals: {
        Row: {
          created_at: string
          id: string
          metric_key: string
          player_id: string
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_key: string
          player_id: string
          target_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_key?: string
          player_id?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
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
      player_hudl_visibility: {
        Row: {
          clip_id: string | null
          clip_video_url: string | null
          created_at: string
          id: string
          player_id: string
          playlist_id: string | null
          playlist_key: string | null
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          clip_id?: string | null
          clip_video_url?: string | null
          created_at?: string
          id?: string
          player_id: string
          playlist_id?: string | null
          playlist_key?: string | null
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          clip_id?: string | null
          clip_video_url?: string | null
          created_at?: string
          id?: string
          player_id?: string
          playlist_id?: string | null
          playlist_key?: string | null
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "player_hudl_visibility_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_hudl_visibility_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      player_injury_log: {
        Row: {
          body_area: string
          created_at: string
          date: string
          description: string | null
          id: string
          player_id: string
          severity: string
          status: string
        }
        Insert: {
          body_area: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          player_id: string
          severity?: string
          status?: string
        }
        Update: {
          body_area?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          player_id?: string
          severity?: string
          status?: string
        }
        Relationships: []
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
      player_offer_settings: {
        Row: {
          created_at: string
          hidden_sections: string[]
          id: string
          intro_media: Json
          player_id: string
          section_images: Json
          show_database_card: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          hidden_sections?: string[]
          id?: string
          intro_media?: Json
          player_id: string
          section_images?: Json
          show_database_card?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          hidden_sections?: string[]
          id?: string
          intro_media?: Json
          player_id?: string
          section_images?: Json
          show_database_card?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      player_operating_profile: {
        Row: {
          answers: Json
          created_at: string
          id: string
          player_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          player_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          player_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
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
          agent_name: string | null
          agent_status: string | null
          assigned_to: string | null
          created_at: string | null
          current_club: string | null
          date_of_birth: string | null
          first_response_at: string | null
          fit_score: number | null
          fit_score_breakdown: Json | null
          fit_score_target_id: string | null
          fit_score_updated_at: string | null
          id: string
          ig_handle: string | null
          initial_message: string | null
          is_starred: boolean
          last_contact_at: string | null
          messaged: boolean | null
          national_team: boolean
          nationality: string | null
          next_followup_at: string | null
          notes: string | null
          player_name: string
          position: string | null
          previous_serious_injury: string | null
          response_received: boolean | null
          response_status: Database["public"]["Enums"]["outreach_response_status"]
          star_of_team: boolean
          starred_at: string | null
          transfermarkt_url: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          agent_name?: string | null
          agent_status?: string | null
          assigned_to?: string | null
          created_at?: string | null
          current_club?: string | null
          date_of_birth?: string | null
          first_response_at?: string | null
          fit_score?: number | null
          fit_score_breakdown?: Json | null
          fit_score_target_id?: string | null
          fit_score_updated_at?: string | null
          id?: string
          ig_handle?: string | null
          initial_message?: string | null
          is_starred?: boolean
          last_contact_at?: string | null
          messaged?: boolean | null
          national_team?: boolean
          nationality?: string | null
          next_followup_at?: string | null
          notes?: string | null
          player_name: string
          position?: string | null
          previous_serious_injury?: string | null
          response_received?: boolean | null
          response_status?: Database["public"]["Enums"]["outreach_response_status"]
          star_of_team?: boolean
          starred_at?: string | null
          transfermarkt_url?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          agent_name?: string | null
          agent_status?: string | null
          assigned_to?: string | null
          created_at?: string | null
          current_club?: string | null
          date_of_birth?: string | null
          first_response_at?: string | null
          fit_score?: number | null
          fit_score_breakdown?: Json | null
          fit_score_target_id?: string | null
          fit_score_updated_at?: string | null
          id?: string
          ig_handle?: string | null
          initial_message?: string | null
          is_starred?: boolean
          last_contact_at?: string | null
          messaged?: boolean | null
          national_team?: boolean
          nationality?: string | null
          next_followup_at?: string | null
          notes?: string | null
          player_name?: string
          position?: string | null
          previous_serious_injury?: string | null
          response_received?: boolean | null
          response_status?: Database["public"]["Enums"]["outreach_response_status"]
          star_of_team?: boolean
          starred_at?: string | null
          transfermarkt_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_outreach_pro_fit_score_target_id_fkey"
            columns: ["fit_score_target_id"]
            isOneToOne: false
            referencedRelation: "recruitment_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      player_outreach_youth: {
        Row: {
          age: number | null
          agent_name: string | null
          agent_status: string | null
          assigned_to: string | null
          created_at: string | null
          current_club: string | null
          date_of_birth: string | null
          first_response_at: string | null
          fit_score: number | null
          fit_score_breakdown: Json | null
          fit_score_target_id: string | null
          fit_score_updated_at: string | null
          id: string
          ig_handle: string | null
          initial_message: string | null
          is_starred: boolean
          last_contact_at: string | null
          messaged: boolean | null
          national_team: boolean
          nationality: string | null
          next_followup_at: string | null
          notes: string | null
          parent_approval: boolean | null
          parent_contact: string | null
          parents_name: string | null
          player_name: string
          position: string | null
          previous_serious_injury: string | null
          response_received: boolean | null
          response_status: Database["public"]["Enums"]["outreach_response_status"]
          star_of_team: boolean
          starred_at: string | null
          transfermarkt_url: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          agent_name?: string | null
          agent_status?: string | null
          assigned_to?: string | null
          created_at?: string | null
          current_club?: string | null
          date_of_birth?: string | null
          first_response_at?: string | null
          fit_score?: number | null
          fit_score_breakdown?: Json | null
          fit_score_target_id?: string | null
          fit_score_updated_at?: string | null
          id?: string
          ig_handle?: string | null
          initial_message?: string | null
          is_starred?: boolean
          last_contact_at?: string | null
          messaged?: boolean | null
          national_team?: boolean
          nationality?: string | null
          next_followup_at?: string | null
          notes?: string | null
          parent_approval?: boolean | null
          parent_contact?: string | null
          parents_name?: string | null
          player_name: string
          position?: string | null
          previous_serious_injury?: string | null
          response_received?: boolean | null
          response_status?: Database["public"]["Enums"]["outreach_response_status"]
          star_of_team?: boolean
          starred_at?: string | null
          transfermarkt_url?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          agent_name?: string | null
          agent_status?: string | null
          assigned_to?: string | null
          created_at?: string | null
          current_club?: string | null
          date_of_birth?: string | null
          first_response_at?: string | null
          fit_score?: number | null
          fit_score_breakdown?: Json | null
          fit_score_target_id?: string | null
          fit_score_updated_at?: string | null
          id?: string
          ig_handle?: string | null
          initial_message?: string | null
          is_starred?: boolean
          last_contact_at?: string | null
          messaged?: boolean | null
          national_team?: boolean
          nationality?: string | null
          next_followup_at?: string | null
          notes?: string | null
          parent_approval?: boolean | null
          parent_contact?: string | null
          parents_name?: string | null
          player_name?: string
          position?: string | null
          previous_serious_injury?: string | null
          response_received?: boolean | null
          response_status?: Database["public"]["Enums"]["outreach_response_status"]
          star_of_team?: boolean
          starred_at?: string | null
          transfermarkt_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_outreach_youth_fit_score_target_id_fkey"
            columns: ["fit_score_target_id"]
            isOneToOne: false
            referencedRelation: "recruitment_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      player_portal_settings: {
        Row: {
          created_at: string
          has_seen_welcome_modal: boolean
          hero_focal_points: Json | null
          hero_images: Json | null
          id: string
          last_login_at: string | null
          login_count: number
          music_tracks: Json | null
          player_id: string
          representation_subtitle_secondary: string | null
          rise_with_us_closing: string | null
          rise_with_us_intro: string | null
          rise_with_us_show_portal: boolean | null
          rise_with_us_show_services: boolean | null
          rise_with_us_under18: boolean
          show_analysis: boolean
          show_aphorisms: boolean
          show_cognisance: boolean
          show_comparisons: boolean
          show_countdown: boolean
          show_data_tab: boolean
          show_highlights: boolean
          show_hub: boolean
          show_injury_log: boolean
          show_key_documents: boolean
          show_match_clipper: boolean
          show_music_player: boolean
          show_news_feed: boolean
          show_nutrition: boolean
          show_performance_reports: boolean
          show_positional_guides: boolean
          show_programming: boolean
          show_quick_stats: boolean
          show_r90_chart: boolean
          show_scouting: boolean
          show_transfer_hub: boolean
          show_updates: boolean
          show_video_reports: boolean
          show_view_profile: boolean
          updated_at: string
          vision_per90_targets: Json | null
          vision_players_to_watch: Json | null
          vision_roadmap: Json | null
          vision_skillset: string | null
        }
        Insert: {
          created_at?: string
          has_seen_welcome_modal?: boolean
          hero_focal_points?: Json | null
          hero_images?: Json | null
          id?: string
          last_login_at?: string | null
          login_count?: number
          music_tracks?: Json | null
          player_id: string
          representation_subtitle_secondary?: string | null
          rise_with_us_closing?: string | null
          rise_with_us_intro?: string | null
          rise_with_us_show_portal?: boolean | null
          rise_with_us_show_services?: boolean | null
          rise_with_us_under18?: boolean
          show_analysis?: boolean
          show_aphorisms?: boolean
          show_cognisance?: boolean
          show_comparisons?: boolean
          show_countdown?: boolean
          show_data_tab?: boolean
          show_highlights?: boolean
          show_hub?: boolean
          show_injury_log?: boolean
          show_key_documents?: boolean
          show_match_clipper?: boolean
          show_music_player?: boolean
          show_news_feed?: boolean
          show_nutrition?: boolean
          show_performance_reports?: boolean
          show_positional_guides?: boolean
          show_programming?: boolean
          show_quick_stats?: boolean
          show_r90_chart?: boolean
          show_scouting?: boolean
          show_transfer_hub?: boolean
          show_updates?: boolean
          show_video_reports?: boolean
          show_view_profile?: boolean
          updated_at?: string
          vision_per90_targets?: Json | null
          vision_players_to_watch?: Json | null
          vision_roadmap?: Json | null
          vision_skillset?: string | null
        }
        Update: {
          created_at?: string
          has_seen_welcome_modal?: boolean
          hero_focal_points?: Json | null
          hero_images?: Json | null
          id?: string
          last_login_at?: string | null
          login_count?: number
          music_tracks?: Json | null
          player_id?: string
          representation_subtitle_secondary?: string | null
          rise_with_us_closing?: string | null
          rise_with_us_intro?: string | null
          rise_with_us_show_portal?: boolean | null
          rise_with_us_show_services?: boolean | null
          rise_with_us_under18?: boolean
          show_analysis?: boolean
          show_aphorisms?: boolean
          show_cognisance?: boolean
          show_comparisons?: boolean
          show_countdown?: boolean
          show_data_tab?: boolean
          show_highlights?: boolean
          show_hub?: boolean
          show_injury_log?: boolean
          show_key_documents?: boolean
          show_match_clipper?: boolean
          show_music_player?: boolean
          show_news_feed?: boolean
          show_nutrition?: boolean
          show_performance_reports?: boolean
          show_positional_guides?: boolean
          show_programming?: boolean
          show_quick_stats?: boolean
          show_r90_chart?: boolean
          show_scouting?: boolean
          show_transfer_hub?: boolean
          show_updates?: boolean
          show_video_reports?: boolean
          show_view_profile?: boolean
          updated_at?: string
          vision_per90_targets?: Json | null
          vision_players_to_watch?: Json | null
          vision_roadmap?: Json | null
          vision_skillset?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_portal_settings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_portal_settings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      player_programs: {
        Row: {
          created_at: string
          display_order: number | null
          end_date: string | null
          id: string
          is_current: boolean
          linked_week_ids: string[]
          overview_text: string | null
          phase_dates: string | null
          phase_image_url: string | null
          phase_name: string | null
          player_id: string
          player_image_url: string | null
          program_name: string
          schedule_notes: string | null
          sessions: Json | null
          start_date: string | null
          updated_at: string
          weekly_schedules: Json | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          linked_week_ids?: string[]
          overview_text?: string | null
          phase_dates?: string | null
          phase_image_url?: string | null
          phase_name?: string | null
          player_id: string
          player_image_url?: string | null
          program_name: string
          schedule_notes?: string | null
          sessions?: Json | null
          start_date?: string | null
          updated_at?: string
          weekly_schedules?: Json | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          linked_week_ids?: string[]
          overview_text?: string | null
          phase_dates?: string | null
          phase_image_url?: string | null
          phase_name?: string | null
          player_id?: string
          player_image_url?: string | null
          program_name?: string
          schedule_notes?: string | null
          sessions?: Json | null
          start_date?: string | null
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
      player_recipe_assignments: {
        Row: {
          created_at: string | null
          id: string
          is_visible: boolean | null
          phase_name: string | null
          player_id: string
          recipe_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          phase_name?: string | null
          player_id: string
          recipe_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          phase_name?: string | null
          player_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_recipe_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_recipe_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_recipe_assignments_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "nutrition_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      player_requests: {
        Row: {
          age_range: string | null
          created_at: string
          id: string
          is_visible: boolean
          league: string
          playstyle: string | null
          position: string
          status: string
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          league: string
          playstyle?: string | null
          position: string
          status?: string
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          league?: string
          playstyle?: string | null
          position?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_seasons: {
        Row: {
          created_at: string
          end_analysis_id: string | null
          id: string
          name: string
          player_id: string
          sort_order: number
          start_analysis_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_analysis_id?: string | null
          id?: string
          name: string
          player_id: string
          sort_order?: number
          start_analysis_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_analysis_id?: string | null
          id?: string
          name?: string
          player_id?: string
          sort_order?: number
          start_analysis_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_seasons_end_analysis_id_fkey"
            columns: ["end_analysis_id"]
            isOneToOne: false
            referencedRelation: "player_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_seasons_start_analysis_id_fkey"
            columns: ["start_analysis_id"]
            isOneToOne: false
            referencedRelation: "player_analysis"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          assists: number | null
          clean_sheets: number | null
          created_at: string | null
          external_player_id: string | null
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
          external_player_id?: string | null
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
          external_player_id?: string | null
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
      player_uploaded_clips: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          name: string
          player_id: string
          updated_at: string
          uploaded_by_maker_id: string | null
          video_url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          name: string
          player_id: string
          updated_at?: string
          uploaded_by_maker_id?: string | null
          video_url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          name?: string
          player_id?: string
          updated_at?: string
          uploaded_by_maker_id?: string | null
          video_url?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          age: number | null
          agent_notes: string | null
          bio: string | null
          category: string | null
          club: string | null
          club_logo: string | null
          commission_notes: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          contracts_password: string | null
          created_at: string | null
          created_by: string | null
          current_salary_annual: number | null
          date_of_birth: string | null
          email: string | null
          expected_commission_annual: number | null
          fit_score: number | null
          fit_score_breakdown: Json | null
          fit_score_target_id: string | null
          fit_score_updated_at: string | null
          has_representation_offer: boolean
          highlighted_match: Json | null
          highlights: Json | null
          hover_image_url: string | null
          id: string
          identification_description: string | null
          identification_reference_image_url: string | null
          identification_reference_images: string[]
          image_url: string | null
          is_starred: boolean
          league: string | null
          links: Json | null
          name: string
          national_team: boolean
          nationality: string
          next_program_notes: string | null
          not_to_confuse_with: string | null
          nutrition_next_program_notes: string | null
          nutrition_programming_notes: string | null
          player_list_order: number | null
          portal_language: string | null
          position: string
          potential_commission_annual: number | null
          preferred_currency: string | null
          previous_serious_injury: string | null
          programming_notes: string | null
          representation_status: string | null
          salary_cap_overrides: Json
          star_of_team: boolean
          star_order: number | null
          starred_at: string | null
          transfer_priority: string | null
          transfer_status: string | null
          updated_at: string | null
          visible_on_stars_page: boolean | null
        }
        Insert: {
          age?: number | null
          agent_notes?: string | null
          bio?: string | null
          category?: string | null
          club?: string | null
          club_logo?: string | null
          commission_notes?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contracts_password?: string | null
          created_at?: string | null
          created_by?: string | null
          current_salary_annual?: number | null
          date_of_birth?: string | null
          email?: string | null
          expected_commission_annual?: number | null
          fit_score?: number | null
          fit_score_breakdown?: Json | null
          fit_score_target_id?: string | null
          fit_score_updated_at?: string | null
          has_representation_offer?: boolean
          highlighted_match?: Json | null
          highlights?: Json | null
          hover_image_url?: string | null
          id?: string
          identification_description?: string | null
          identification_reference_image_url?: string | null
          identification_reference_images?: string[]
          image_url?: string | null
          is_starred?: boolean
          league?: string | null
          links?: Json | null
          name: string
          national_team?: boolean
          nationality: string
          next_program_notes?: string | null
          not_to_confuse_with?: string | null
          nutrition_next_program_notes?: string | null
          nutrition_programming_notes?: string | null
          player_list_order?: number | null
          portal_language?: string | null
          position: string
          potential_commission_annual?: number | null
          preferred_currency?: string | null
          previous_serious_injury?: string | null
          programming_notes?: string | null
          representation_status?: string | null
          salary_cap_overrides?: Json
          star_of_team?: boolean
          star_order?: number | null
          starred_at?: string | null
          transfer_priority?: string | null
          transfer_status?: string | null
          updated_at?: string | null
          visible_on_stars_page?: boolean | null
        }
        Update: {
          age?: number | null
          agent_notes?: string | null
          bio?: string | null
          category?: string | null
          club?: string | null
          club_logo?: string | null
          commission_notes?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contracts_password?: string | null
          created_at?: string | null
          created_by?: string | null
          current_salary_annual?: number | null
          date_of_birth?: string | null
          email?: string | null
          expected_commission_annual?: number | null
          fit_score?: number | null
          fit_score_breakdown?: Json | null
          fit_score_target_id?: string | null
          fit_score_updated_at?: string | null
          has_representation_offer?: boolean
          highlighted_match?: Json | null
          highlights?: Json | null
          hover_image_url?: string | null
          id?: string
          identification_description?: string | null
          identification_reference_image_url?: string | null
          identification_reference_images?: string[]
          image_url?: string | null
          is_starred?: boolean
          league?: string | null
          links?: Json | null
          name?: string
          national_team?: boolean
          nationality?: string
          next_program_notes?: string | null
          not_to_confuse_with?: string | null
          nutrition_next_program_notes?: string | null
          nutrition_programming_notes?: string | null
          player_list_order?: number | null
          portal_language?: string | null
          position?: string
          potential_commission_annual?: number | null
          preferred_currency?: string | null
          previous_serious_injury?: string | null
          programming_notes?: string | null
          representation_status?: string | null
          salary_cap_overrides?: Json
          star_of_team?: boolean
          star_order?: number | null
          starred_at?: string | null
          transfer_priority?: string | null
          transfer_status?: string | null
          updated_at?: string | null
          visible_on_stars_page?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "players_fit_score_target_id_fkey"
            columns: ["fit_score_target_id"]
            isOneToOne: false
            referencedRelation: "recruitment_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          clips: Json
          created_at: string
          id: string
          is_favourite: boolean
          name: string
          player_id: string
          updated_at: string
        }
        Insert: {
          clips?: Json
          created_at?: string
          id?: string
          is_favourite?: boolean
          name: string
          player_id: string
          updated_at?: string
        }
        Update: {
          clips?: Json
          created_at?: string
          id?: string
          is_favourite?: boolean
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
      press_releases: {
        Row: {
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone_number: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone_number?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
        }
        Relationships: []
      }
      programming_weeks: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string | null
          player_id: string
          slots: Json
          updated_at: string
          week_start_date: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string | null
          player_id: string
          slots?: Json
          updated_at?: string
          week_start_date?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string | null
          player_id?: string
          slots?: Json
          updated_at?: string
          week_start_date?: string | null
        }
        Relationships: []
      }
      proposal_meeting_requests: {
        Row: {
          created_at: string
          id: string
          language: string | null
          message: string | null
          player_id: string | null
          player_name: string
          player_slug: string | null
          preferred_dates: string | null
          preferred_time_of_day: string | null
          status: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          message?: string | null
          player_id?: string | null
          player_name: string
          player_slug?: string | null
          preferred_dates?: string | null
          preferred_time_of_day?: string | null
          status?: string
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          message?: string | null
          player_id?: string | null
          player_name?: string
          player_slug?: string | null
          preferred_dates?: string | null
          preferred_time_of_day?: string | null
          status?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_meeting_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_meeting_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          age: number | null
          age_group: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          current_club: string | null
          date_of_birth: string | null
          id: string
          last_contact_date: string | null
          linked_player_id: string | null
          name: string
          nationality: string | null
          notes: string | null
          position: string | null
          priority: string | null
          probability_weight: number | null
          profile_image_url: string | null
          projected_revenue: number | null
          revenue_currency: string | null
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
          date_of_birth?: string | null
          id?: string
          last_contact_date?: string | null
          linked_player_id?: string | null
          name: string
          nationality?: string | null
          notes?: string | null
          position?: string | null
          priority?: string | null
          probability_weight?: number | null
          profile_image_url?: string | null
          projected_revenue?: number | null
          revenue_currency?: string | null
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
          date_of_birth?: string | null
          id?: string
          last_contact_date?: string | null
          linked_player_id?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          position?: string | null
          priority?: string | null
          probability_weight?: number | null
          profile_image_url?: string | null
          projected_revenue?: number | null
          revenue_currency?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_linked_player_id_fkey"
            columns: ["linked_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_linked_player_id_fkey"
            columns: ["linked_player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
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
      psychology_spq_reports: {
        Row: {
          age_band: string | null
          created_at: string
          created_by: string | null
          factor_scores: Json
          gender_norm: string
          id: string
          is_shared: boolean
          parsed_answers: Json
          pasted_answers: string | null
          player_id: string | null
          player_name: string
          recommendations: string | null
          report_summary: string | null
          scale_scores: Json
          share_slug: string
          updated_at: string
          visual_one_url: string | null
          visual_three_url: string | null
          visual_two_url: string | null
        }
        Insert: {
          age_band?: string | null
          created_at?: string
          created_by?: string | null
          factor_scores?: Json
          gender_norm?: string
          id?: string
          is_shared?: boolean
          parsed_answers?: Json
          pasted_answers?: string | null
          player_id?: string | null
          player_name: string
          recommendations?: string | null
          report_summary?: string | null
          scale_scores?: Json
          share_slug?: string
          updated_at?: string
          visual_one_url?: string | null
          visual_three_url?: string | null
          visual_two_url?: string | null
        }
        Update: {
          age_band?: string | null
          created_at?: string
          created_by?: string | null
          factor_scores?: Json
          gender_norm?: string
          id?: string
          is_shared?: boolean
          parsed_answers?: Json
          pasted_answers?: string | null
          player_id?: string | null
          player_name?: string
          recommendations?: string | null
          report_summary?: string | null
          scale_scores?: Json
          share_slug?: string
          updated_at?: string
          visual_one_url?: string | null
          visual_three_url?: string | null
          visual_two_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "psychology_spq_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psychology_spq_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
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
      recruitment_age_rules: {
        Row: {
          country: string
          country_code: string
          created_at: string
          id: string
          min_contact_age: number | null
          min_sign_age: number | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          country: string
          country_code: string
          created_at?: string
          id?: string
          min_contact_age?: number | null
          min_sign_age?: number | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          country?: string
          country_code?: string
          created_at?: string
          id?: string
          min_contact_age?: number | null
          min_sign_age?: number | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recruitment_scoring_settings: {
        Row: {
          age_sweet_spot_band: number
          ai_nudge_enabled: boolean
          bonus_weights: Json
          fit_score_threshold: number
          id: string
          league_strength_weight: number
          position_adjacency_factor: number
          position_weights: Json
          updated_at: string
          updated_by: string | null
          weights: Json
        }
        Insert: {
          age_sweet_spot_band?: number
          ai_nudge_enabled?: boolean
          bonus_weights?: Json
          fit_score_threshold?: number
          id?: string
          league_strength_weight?: number
          position_adjacency_factor?: number
          position_weights?: Json
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Update: {
          age_sweet_spot_band?: number
          ai_nudge_enabled?: boolean
          bonus_weights?: Json
          fit_score_threshold?: number
          id?: string
          league_strength_weight?: number
          position_adjacency_factor?: number
          position_weights?: Json
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Relationships: []
      }
      recruitment_targets: {
        Row: {
          active: boolean
          ai_nudge_enabled: boolean | null
          countries_of_club: string[]
          created_at: string
          default_email_template_id: string | null
          default_whatsapp_template_id: string | null
          id: string
          max_age: number | null
          max_club_rating: string | null
          min_age: number | null
          min_club_rating: string | null
          name: string
          nationalities: string[]
          notes: string | null
          owner_user_id: string | null
          positions: string[]
          priority: number
          scope: string
          updated_at: string
          weights_override: Json | null
        }
        Insert: {
          active?: boolean
          ai_nudge_enabled?: boolean | null
          countries_of_club?: string[]
          created_at?: string
          default_email_template_id?: string | null
          default_whatsapp_template_id?: string | null
          id?: string
          max_age?: number | null
          max_club_rating?: string | null
          min_age?: number | null
          min_club_rating?: string | null
          name: string
          nationalities?: string[]
          notes?: string | null
          owner_user_id?: string | null
          positions?: string[]
          priority?: number
          scope?: string
          updated_at?: string
          weights_override?: Json | null
        }
        Update: {
          active?: boolean
          ai_nudge_enabled?: boolean | null
          countries_of_club?: string[]
          created_at?: string
          default_email_template_id?: string | null
          default_whatsapp_template_id?: string | null
          id?: string
          max_age?: number | null
          max_club_rating?: string | null
          min_age?: number | null
          min_club_rating?: string | null
          name?: string
          nationalities?: string[]
          notes?: string | null
          owner_user_id?: string | null
          positions?: string[]
          priority?: number
          scope?: string
          updated_at?: string
          weights_override?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_targets_default_email_template_id_fkey"
            columns: ["default_email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_targets_default_whatsapp_template_id_fkey"
            columns: ["default_whatsapp_template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_quick_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      representation_visitors: {
        Row: {
          age_group: string | null
          country_code: string | null
          created_at: string
          dob: string | null
          id: string
          language: string | null
          position: string | null
          referrer: string | null
          updated_at: string
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          age_group?: string | null
          country_code?: string | null
          created_at?: string
          dob?: string | null
          id?: string
          language?: string | null
          position?: string | null
          referrer?: string | null
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          age_group?: string | null
          country_code?: string | null
          created_at?: string
          dob?: string | null
          id?: string
          language?: string | null
          position?: string | null
          referrer?: string | null
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          category_id: string
          category_title: string
          created_at: string
          id: string
          role: string
          section_id: string
          section_title: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          category_id: string
          category_title: string
          created_at?: string
          id?: string
          role: string
          section_id: string
          section_title: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          category_id?: string
          category_title?: string
          created_at?: string
          id?: string
          role?: string
          section_id?: string
          section_title?: string
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
      scheduled_posts: {
        Row: {
          canva_link: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          notes: string | null
          platforms: string[] | null
          post_type: string
          recurring_days: string[] | null
          recurring_pattern: string | null
          scheduled_date: string
          scheduled_time: string | null
          series_count: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          canva_link?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          platforms?: string[] | null
          post_type?: string
          recurring_days?: string[] | null
          recurring_pattern?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          series_count?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          canva_link?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          platforms?: string[] | null
          post_type?: string
          recurring_days?: string[] | null
          recurring_pattern?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          series_count?: number | null
          status?: string
          title?: string
          updated_at?: string
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
      scout_report_feedback: {
        Row: {
          commission_percentage: number | null
          created_at: string
          created_by: string | null
          future_reference_notes: string | null
          id: string
          is_exclusive: boolean | null
          next_steps: string | null
          player_feedback: string | null
          read_by_scout: boolean | null
          report_id: string
          scout_id: string
          staff_notes: string | null
          updated_at: string
        }
        Insert: {
          commission_percentage?: number | null
          created_at?: string
          created_by?: string | null
          future_reference_notes?: string | null
          id?: string
          is_exclusive?: boolean | null
          next_steps?: string | null
          player_feedback?: string | null
          read_by_scout?: boolean | null
          report_id: string
          scout_id: string
          staff_notes?: string | null
          updated_at?: string
        }
        Update: {
          commission_percentage?: number | null
          created_at?: string
          created_by?: string | null
          future_reference_notes?: string | null
          id?: string
          is_exclusive?: boolean | null
          next_steps?: string | null
          player_feedback?: string | null
          read_by_scout?: boolean | null
          report_id?: string
          scout_id?: string
          staff_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_report_feedback_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "scouting_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_report_feedback_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
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
          additional_documents: Json | null
          additional_info: string | null
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
          rise_report_url: string | null
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
          additional_documents?: Json | null
          additional_info?: string | null
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
          rise_report_url?: string | null
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
          additional_documents?: Json | null
          additional_info?: string | null
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
          rise_report_url?: string | null
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
      seo_overrides: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          path?: string
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
          document_hash: string | null
          file_name: string
          file_url: string
          id: string
          is_mandate: boolean
          locked_at: string | null
          locked_fields_snapshot: Json | null
          locked_file_url: string | null
          owner_field_values: Json | null
          owner_signed_at: string | null
          share_token: string
          status: string
          title: string
          updated_at: string
          view_password: string | null
        }
        Insert: {
          completed_pdf_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_hash?: string | null
          file_name: string
          file_url: string
          id?: string
          is_mandate?: boolean
          locked_at?: string | null
          locked_fields_snapshot?: Json | null
          locked_file_url?: string | null
          owner_field_values?: Json | null
          owner_signed_at?: string | null
          share_token?: string
          status?: string
          title: string
          updated_at?: string
          view_password?: string | null
        }
        Update: {
          completed_pdf_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_hash?: string | null
          file_name?: string
          file_url?: string
          id?: string
          is_mandate?: boolean
          locked_at?: string | null
          locked_fields_snapshot?: Json | null
          locked_file_url?: string | null
          owner_field_values?: Json | null
          owner_signed_at?: string | null
          share_token?: string
          status?: string
          title?: string
          updated_at?: string
          view_password?: string | null
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
          document_hash: string | null
          field_values: Json
          id: string
          intent_consent_at: string | null
          ip_address: string | null
          signed_at: string
          signed_pdf_hash: string | null
          signed_pdf_url: string | null
          signer_email: string
          signer_name: string
          submission_type: string
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          document_hash?: string | null
          field_values?: Json
          id?: string
          intent_consent_at?: string | null
          ip_address?: string | null
          signed_at?: string
          signed_pdf_hash?: string | null
          signed_pdf_url?: string | null
          signer_email: string
          signer_name: string
          submission_type?: string
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          document_hash?: string | null
          field_values?: Json
          id?: string
          intent_consent_at?: string | null
          ip_address?: string | null
          signed_at?: string
          signed_pdf_hash?: string | null
          signed_pdf_url?: string | null
          signer_email?: string
          signer_name?: string
          submission_type?: string
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
      sportscode_action_types: {
        Row: {
          action_name: string
          category: string | null
          created_at: string
          default_after_seconds: number | null
          default_before_seconds: number | null
          description: string | null
          display_order: number | null
          id: string
          typical_duration_seconds: number | null
          updated_at: string
          visual_cues: string | null
        }
        Insert: {
          action_name: string
          category?: string | null
          created_at?: string
          default_after_seconds?: number | null
          default_before_seconds?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          typical_duration_seconds?: number | null
          updated_at?: string
          visual_cues?: string | null
        }
        Update: {
          action_name?: string
          category?: string | null
          created_at?: string
          default_after_seconds?: number | null
          default_before_seconds?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          typical_duration_seconds?: number | null
          updated_at?: string
          visual_cues?: string | null
        }
        Relationships: []
      }
      spq_test_submissions: {
        Row: {
          age_band: string
          created_at: string
          factor_scores: Json
          gender_norm: string
          id: string
          matched_player_id: string | null
          responses: Json
          saved_report_id: string | null
          scale_scores: Json
          submitter_email: string | null
          submitter_name: string | null
          visitor_city: string | null
          visitor_country: string | null
          visitor_ip: string | null
          visitor_user_agent: string | null
        }
        Insert: {
          age_band: string
          created_at?: string
          factor_scores: Json
          gender_norm: string
          id?: string
          matched_player_id?: string | null
          responses: Json
          saved_report_id?: string | null
          scale_scores: Json
          submitter_email?: string | null
          submitter_name?: string | null
          visitor_city?: string | null
          visitor_country?: string | null
          visitor_ip?: string | null
          visitor_user_agent?: string | null
        }
        Update: {
          age_band?: string
          created_at?: string
          factor_scores?: Json
          gender_norm?: string
          id?: string
          matched_player_id?: string | null
          responses?: Json
          saved_report_id?: string | null
          scale_scores?: Json
          submitter_email?: string | null
          submitter_name?: string | null
          visitor_city?: string | null
          visitor_country?: string | null
          visitor_ip?: string | null
          visitor_user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spq_test_submissions_matched_player_id_fkey"
            columns: ["matched_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spq_test_submissions_matched_player_id_fkey"
            columns: ["matched_player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spq_test_submissions_saved_report_id_fkey"
            columns: ["saved_report_id"]
            isOneToOne: false
            referencedRelation: "psychology_spq_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      sps_exercises: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          load: string | null
          name: string
          recovery_time: string | null
          reps: string | null
          session_id: string
          sets: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          load?: string | null
          name?: string
          recovery_time?: string | null
          reps?: string | null
          session_id: string
          sets?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          load?: string | null
          name?: string
          recovery_time?: string | null
          reps?: string | null
          session_id?: string
          sets?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sps_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sps_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sps_programs: {
        Row: {
          created_at: string
          display_order: number
          end_date: string | null
          id: string
          is_current: boolean
          legacy_player_program_id: string | null
          linked_week_ids: string[]
          overview_text: string | null
          phase_name: string | null
          player_id: string
          program_name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          is_current?: boolean
          legacy_player_program_id?: string | null
          linked_week_ids?: string[]
          overview_text?: string | null
          phase_name?: string | null
          player_id: string
          program_name?: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          is_current?: boolean
          legacy_player_program_id?: string | null
          linked_week_ids?: string[]
          overview_text?: string | null
          phase_name?: string | null
          player_id?: string
          program_name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sps_sessions: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          program_id: string
          session_key: string
          session_kind: string
          staff_notes: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          program_id: string
          session_key: string
          session_kind?: string
          staff_notes?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          program_id?: string
          session_key?: string
          session_kind?: string
          staff_notes?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sps_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "sps_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
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
          visible_to_players: boolean
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
          visible_to_players?: boolean
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
          visible_to_players?: boolean
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
      staff_documents: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          doc_type: string
          folder_id: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          doc_type?: string
          folder_id?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          doc_type?: string
          folder_id?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_goals: {
        Row: {
          assigned_to: string[] | null
          category: string | null
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
          category?: string | null
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
          category?: string | null
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
      staff_personal_schedule_items: {
        Row: {
          created_at: string
          done_at: string | null
          end_time: string
          id: string
          image_url: string | null
          lane: number
          notes: string | null
          recurrence_group_id: string | null
          recurring_weekly: boolean
          scheduled_date: string
          start_time: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          end_time?: string
          id?: string
          image_url?: string | null
          lane?: number
          notes?: string | null
          recurrence_group_id?: string | null
          recurring_weekly?: boolean
          scheduled_date: string
          start_time?: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          end_time?: string
          id?: string
          image_url?: string | null
          lane?: number
          notes?: string | null
          recurrence_group_id?: string | null
          recurring_weekly?: boolean
          scheduled_date?: string
          start_time?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_personal_schedule_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "staff_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_player_assignments: {
        Row: {
          created_at: string
          id: string
          player_id: string
          role_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          role_key?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          role_key?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_section_passwords: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          section_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          section_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_sms_notifications: {
        Row: {
          id: string
          message: string
          sent_at: string
          sent_by: string | null
          sent_to: string[]
          status: string | null
        }
        Insert: {
          id?: string
          message: string
          sent_at?: string
          sent_by?: string | null
          sent_to: string[]
          status?: string | null
        }
        Update: {
          id?: string
          message?: string
          sent_at?: string
          sent_by?: string | null
          sent_to?: string[]
          status?: string | null
        }
        Relationships: []
      }
      staff_tasks: {
        Row: {
          assigned_to: string[] | null
          category: string | null
          completed: boolean
          completion_log: string[] | null
          created_at: string
          deadline: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_recurring: boolean
          last_completed_at: string | null
          priority: string
          recurrence_label: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string[] | null
          category?: string | null
          completed?: boolean
          completion_log?: string[] | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_recurring?: boolean
          last_completed_at?: string | null
          priority?: string
          recurrence_label?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string[] | null
          category?: string | null
          completed?: boolean
          completion_log?: string[] | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_recurring?: boolean
          last_completed_at?: string | null
          priority?: string
          recurrence_label?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_view_as_log: {
        Row: {
          admin_email: string | null
          admin_user_id: string
          created_at: string
          id: string
          reason: string
          target_email: string | null
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_user_id: string
          created_at?: string
          id?: string
          reason: string
          target_email?: string | null
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_user_id?: string
          created_at?: string
          id?: string
          reason?: string
          target_email?: string | null
          target_user_id?: string
          user_agent?: string | null
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
      technical_drill_variations: {
        Row: {
          created_at: string
          description: string | null
          diagram: Json | null
          display_order: number
          drill_id: string
          id: string
          label: string
          load: string | null
          notes: string | null
          recovery_time: string | null
          reps: string | null
          reps_per_side: boolean
          sets: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          diagram?: Json | null
          display_order?: number
          drill_id: string
          id?: string
          label: string
          load?: string | null
          notes?: string | null
          recovery_time?: string | null
          reps?: string | null
          reps_per_side?: boolean
          sets?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          diagram?: Json | null
          display_order?: number
          drill_id?: string
          id?: string
          label?: string
          load?: string | null
          notes?: string | null
          recovery_time?: string | null
          reps?: string | null
          reps_per_side?: boolean
          sets?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_drill_variations_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "technical_drills"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_drills: {
        Row: {
          created_at: string
          description: string | null
          diagram: Json | null
          display_order: number
          id: string
          load: string | null
          name: string
          notes: string | null
          recovery_time: string | null
          reps: string | null
          reps_per_side: boolean
          session_id: string
          sets: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          diagram?: Json | null
          display_order?: number
          id?: string
          load?: string | null
          name: string
          notes?: string | null
          recovery_time?: string | null
          reps?: string | null
          reps_per_side?: boolean
          session_id: string
          sets?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          diagram?: Json | null
          display_order?: number
          id?: string
          load?: string | null
          name?: string
          notes?: string | null
          recovery_time?: string | null
          reps?: string | null
          reps_per_side?: boolean
          session_id?: string
          sets?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_drills_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "technical_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_programs: {
        Row: {
          created_at: string
          display_order: number
          end_date: string | null
          id: string
          is_current: boolean
          linked_week_ids: string[]
          overview_text: string | null
          phase_dates: string | null
          phase_name: string | null
          player_id: string
          program_name: string
          schedule_notes: string | null
          start_date: string | null
          updated_at: string
          weekly_schedules: Json
        }
        Insert: {
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          is_current?: boolean
          linked_week_ids?: string[]
          overview_text?: string | null
          phase_dates?: string | null
          phase_name?: string | null
          player_id: string
          program_name: string
          schedule_notes?: string | null
          start_date?: string | null
          updated_at?: string
          weekly_schedules?: Json
        }
        Update: {
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          is_current?: boolean
          linked_week_ids?: string[]
          overview_text?: string | null
          phase_dates?: string | null
          phase_name?: string | null
          player_id?: string
          program_name?: string
          schedule_notes?: string | null
          start_date?: string | null
          updated_at?: string
          weekly_schedules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "technical_programs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_programs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sessions: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          program_id: string
          session_key: string
          session_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          program_id: string
          session_key: string
          session_type?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          program_id?: string
          session_key?: string
          session_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "technical_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_reports: {
        Row: {
          content_config: Json
          created_at: string
          created_by: string | null
          custom_notes: string | null
          id: string
          included_sections: string[]
          player_id: string
          section_order: string[] | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content_config?: Json
          created_at?: string
          created_by?: string | null
          custom_notes?: string | null
          id?: string
          included_sections?: string[]
          player_id: string
          section_order?: string[] | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content_config?: Json
          created_at?: string
          created_by?: string | null
          custom_notes?: string | null
          id?: string
          included_sections?: string[]
          player_id?: string
          section_order?: string[] | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      transfermarkt_shortlist: {
        Row: {
          added_to_outreach: boolean
          age: number | null
          agent_status: string | null
          club: string | null
          contacted: boolean
          contacted_at: string | null
          contacted_by: string | null
          created_at: string
          id: string
          market_value: string | null
          nationality: string | null
          notes: string | null
          player_name: string
          position: string | null
          shortlisted_by: string | null
          transfermarkt_url: string | null
          updated_at: string
        }
        Insert: {
          added_to_outreach?: boolean
          age?: number | null
          agent_status?: string | null
          club?: string | null
          contacted?: boolean
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string
          id?: string
          market_value?: string | null
          nationality?: string | null
          notes?: string | null
          player_name: string
          position?: string | null
          shortlisted_by?: string | null
          transfermarkt_url?: string | null
          updated_at?: string
        }
        Update: {
          added_to_outreach?: boolean
          age?: number | null
          agent_status?: string | null
          club?: string | null
          contacted?: boolean
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string
          id?: string
          market_value?: string | null
          nationality?: string | null
          notes?: string | null
          player_name?: string
          position?: string | null
          shortlisted_by?: string | null
          transfermarkt_url?: string | null
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
      video_analyses: {
        Row: {
          annotations: Json
          auto_delete_at: string | null
          clips: Json
          created_at: string
          created_by: string | null
          group_id: string | null
          id: string
          match_date: string | null
          match_minute_offset: number | null
          opponent: string | null
          part_number: number | null
          player_id: string | null
          second_half_offset: number | null
          second_half_video_time: number | null
          source: string
          title: string
          total_parts: number | null
          updated_at: string
          video_url: string
        }
        Insert: {
          annotations?: Json
          auto_delete_at?: string | null
          clips?: Json
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          match_date?: string | null
          match_minute_offset?: number | null
          opponent?: string | null
          part_number?: number | null
          player_id?: string | null
          second_half_offset?: number | null
          second_half_video_time?: number | null
          source?: string
          title: string
          total_parts?: number | null
          updated_at?: string
          video_url: string
        }
        Update: {
          annotations?: Json
          auto_delete_at?: string | null
          clips?: Json
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          match_date?: string | null
          match_minute_offset?: number | null
          opponent?: string | null
          part_number?: number | null
          player_id?: string | null
          second_half_offset?: number | null
          second_half_video_time?: number | null
          source?: string
          title?: string
          total_parts?: number | null
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      video_analysis_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          payload: Json | null
          progress: number
          result: Json | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json | null
          progress?: number
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json | null
          progress?: number
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      video_player_tags: {
        Row: {
          created_at: string
          id: string
          player_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_player_tags_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_player_tags_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_player_tags_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "marketing_gallery"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_board: {
        Row: {
          actionable_plans: string[] | null
          category: string
          created_at: string
          display_order: number | null
          id: string
          updated_at: string
          vision_statement: string | null
        }
        Insert: {
          actionable_plans?: string[] | null
          category: string
          created_at?: string
          display_order?: number | null
          id?: string
          updated_at?: string
          vision_statement?: string | null
        }
        Update: {
          actionable_plans?: string[] | null
          category?: string
          created_at?: string
          display_order?: number | null
          id?: string
          updated_at?: string
          vision_statement?: string | null
        }
        Relationships: []
      }
      visitor_diagnostics: {
        Row: {
          cache_names: string[] | null
          connection_type: string | null
          cookies_enabled: boolean | null
          created_at: string
          device_pixel_ratio: number | null
          display_mode: string | null
          errors: string[] | null
          id: string
          is_android: boolean | null
          is_ios: boolean | null
          is_pwa: boolean | null
          is_standalone: boolean | null
          local_storage_available: boolean | null
          online: boolean | null
          platform: string | null
          pwa_last_route: string | null
          pwa_last_scope: string | null
          raw_data: Json | null
          screen_height: number | null
          screen_width: number | null
          service_worker_status: string | null
          sw_version: string | null
          user_agent: string | null
          viewport_height: number | null
          viewport_width: number | null
          visitor_name: string | null
        }
        Insert: {
          cache_names?: string[] | null
          connection_type?: string | null
          cookies_enabled?: boolean | null
          created_at?: string
          device_pixel_ratio?: number | null
          display_mode?: string | null
          errors?: string[] | null
          id?: string
          is_android?: boolean | null
          is_ios?: boolean | null
          is_pwa?: boolean | null
          is_standalone?: boolean | null
          local_storage_available?: boolean | null
          online?: boolean | null
          platform?: string | null
          pwa_last_route?: string | null
          pwa_last_scope?: string | null
          raw_data?: Json | null
          screen_height?: number | null
          screen_width?: number | null
          service_worker_status?: string | null
          sw_version?: string | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_name?: string | null
        }
        Update: {
          cache_names?: string[] | null
          connection_type?: string | null
          cookies_enabled?: boolean | null
          created_at?: string
          device_pixel_ratio?: number | null
          display_mode?: string | null
          errors?: string[] | null
          id?: string
          is_android?: boolean | null
          is_ios?: boolean | null
          is_pwa?: boolean | null
          is_standalone?: boolean | null
          local_storage_available?: boolean | null
          online?: boolean | null
          platform?: string | null
          pwa_last_route?: string | null
          pwa_last_scope?: string | null
          raw_data?: Json | null
          screen_height?: number | null
          screen_width?: number | null
          service_worker_status?: string | null
          sw_version?: string | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_name?: string | null
        }
        Relationships: []
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
          position_tags: string[]
          scope: string
          show_on_investor_portal: boolean
          target_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          message_content: string
          position_tags?: string[]
          scope?: string
          show_on_investor_portal?: boolean
          target_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          message_content?: string
          position_tags?: string[]
          scope?: string
          show_on_investor_portal?: boolean
          target_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_quick_messages_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "recruitment_targets"
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
      add_app_role_enum_value: {
        Args: { new_value: string }
        Returns: undefined
      }
      apply_outreach_strategy_staging: { Args: never; Returns: number }
      bump_player_portal_login: {
        Args: { _player_id: string }
        Returns: undefined
      }
      can_manage_player_profile_settings: { Args: never; Returns: boolean }
      check_enum_value_exists: {
        Args: { enum_name: string; value_name: string }
        Returns: boolean
      }
      cleanup_expired_video_analyses: { Args: never; Returns: undefined }
      get_operating_profile_status: {
        Args: { _player_id: string }
        Returns: {
          has_any: boolean
          submitted_at: string
        }[]
      }
      get_player_name_by_email: { Args: { _email: string }; Returns: string }
      get_player_visible_availability: {
        Args: { _player_id: string }
        Returns: {
          availability_date: string
          end_time: string
          source: string
          staff_id: string
          staff_name: string
          start_time: string
        }[]
      }
      get_shared_spq_report: {
        Args: { _share_slug: string }
        Returns: {
          age_band: string
          created_at: string
          factor_scores: Json
          gender_norm: string
          id: string
          player_name: string
          recommendations: string
          report_summary: string
          scale_scores: Json
          visual_one_url: string
          visual_three_url: string
          visual_two_url: string
        }[]
      }
      guard_jsonb_no_silent_wipe: {
        Args: { _column: string; _new: Json; _old: Json; _table: string }
        Returns: undefined
      }
      guard_text_no_silent_wipe: {
        Args: { _column: string; _new: string; _old: string; _table: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_players_by_portal_logins: {
        Args: never
        Returns: {
          email: string
          id: string
          image_url: string
          last_login_at: string
          login_count: number
          name: string
        }[]
      }
      mark_welcome_seen: { Args: { _player_id: string }; Returns: undefined }
      replace_player_hudl_visibility: {
        Args: { _player_id: string; _rows: Json }
        Returns: number
      }
      save_player_form_config:
        | {
            Args: { _player_id: string; _stats: Json; _window_size: number }
            Returns: undefined
          }
        | {
            Args: {
              _match_by_match_default_category?: string
              _player_id: string
              _stats: Json
              _window_size: number
            }
            Returns: undefined
          }
      setup_app_settings: { Args: never; Returns: undefined }
      sync_sps_program_to_legacy: {
        Args: { _sps_program_id: string }
        Returns: undefined
      }
      update_role_label: {
        Args: { _description: string; _label: string; _role_key: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "user"
        | "marketeer"
        | "analyst"
        | "network_collaborator"
        | "member"
        | "stats_updater"
        | "marketing_gallery"
        | "table_editor"
      outreach_rapport_level:
        | "cold"
        | "warming"
        | "friendly"
        | "trusted"
        | "champion"
      outreach_response_status:
        | "none"
        | "replied"
        | "interested"
        | "not_interested"
        | "signed"
        | "lost"
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
      app_role: [
        "admin",
        "staff",
        "user",
        "marketeer",
        "analyst",
        "network_collaborator",
        "member",
        "stats_updater",
        "marketing_gallery",
        "table_editor",
      ],
      outreach_rapport_level: [
        "cold",
        "warming",
        "friendly",
        "trusted",
        "champion",
      ],
      outreach_response_status: [
        "none",
        "replied",
        "interested",
        "not_interested",
        "signed",
        "lost",
      ],
    },
  },
} as const
