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
      achievements: {
        Row: {
          created_at: string | null
          description: string
          icon: string | null
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          created_at?: string | null
          description: string
          icon?: string | null
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      coach_profiles: {
        Row: {
          availability: Json | null
          bio: string | null
          created_at: string | null
          hourly_rate: number | null
          id: string
          rating: number | null
          specialties: string[] | null
          total_students: number | null
          user_id: string
        }
        Insert: {
          availability?: Json | null
          bio?: string | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          rating?: number | null
          specialties?: string[] | null
          total_students?: number | null
          user_id: string
        }
        Update: {
          availability?: Json | null
          bio?: string | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          rating?: number | null
          specialties?: string[] | null
          total_students?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
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
      event_participants: {
        Row: {
          event_id: string
          id: string
          joined_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          joined_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          joined_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "local_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      game_analysis: {
        Row: {
          created_at: string | null
          game_id: string | null
          id: string
          key_moments: Json | null
          overall_rating: string | null
          strengths: Json | null
          suggestions: string | null
          user_id: string
          weaknesses: Json | null
        }
        Insert: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          key_moments?: Json | null
          overall_rating?: string | null
          strengths?: Json | null
          suggestions?: string | null
          user_id: string
          weaknesses?: Json | null
        }
        Update: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          key_moments?: Json | null
          overall_rating?: string | null
          strengths?: Json | null
          suggestions?: string | null
          user_id?: string
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "game_analysis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_chat_messages: {
        Row: {
          created_at: string
          game_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_chat_messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "game_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_chat_messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_highlights: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          game_id: string
          id: string
          key_moments: Json
          likes_count: number | null
          title: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          game_id: string
          id?: string
          key_moments: Json
          likes_count?: number | null
          title: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          game_id?: string
          id?: string
          key_moments?: Json
          likes_count?: number | null
          title?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_highlights_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "game_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_highlights_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_highlights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_moves: {
        Row: {
          created_at: string
          fen_after: string
          fen_before: string
          game_id: string
          id: string
          is_capture: boolean | null
          is_castling: boolean | null
          is_check: boolean | null
          is_checkmate: boolean | null
          is_en_passant: boolean | null
          move_number: number
          move_san: string
          move_uci: string
          player_id: string
          promotion_piece: string | null
          time_remaining: number | null
          time_spent: number | null
        }
        Insert: {
          created_at?: string
          fen_after: string
          fen_before: string
          game_id: string
          id?: string
          is_capture?: boolean | null
          is_castling?: boolean | null
          is_check?: boolean | null
          is_checkmate?: boolean | null
          is_en_passant?: boolean | null
          move_number: number
          move_san: string
          move_uci: string
          player_id: string
          promotion_piece?: string | null
          time_remaining?: number | null
          time_spent?: number | null
        }
        Update: {
          created_at?: string
          fen_after?: string
          fen_before?: string
          game_id?: string
          id?: string
          is_capture?: boolean | null
          is_castling?: boolean | null
          is_check?: boolean | null
          is_checkmate?: boolean | null
          is_en_passant?: boolean | null
          move_number?: number
          move_san?: string
          move_uci?: string
          player_id?: string
          promotion_piece?: string | null
          time_remaining?: number | null
          time_spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "game_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          black_player_id: string
          black_rating_change: number | null
          black_time_remaining: number
          completed_at: string | null
          created_at: string
          current_fen: string
          current_turn: string
          draw_offered_by: string | null
          fifty_move_counter: number
          id: string
          last_move_at: string | null
          move_count: number
          pgn: string | null
          position_history: Json | null
          result: string | null
          status: string
          time_control: number
          time_increment: number
          undo_requested_by: string | null
          updated_at: string
          white_player_id: string
          white_rating_change: number | null
          white_time_remaining: number
          winner_id: string | null
        }
        Insert: {
          black_player_id: string
          black_rating_change?: number | null
          black_time_remaining: number
          completed_at?: string | null
          created_at?: string
          current_fen?: string
          current_turn?: string
          draw_offered_by?: string | null
          fifty_move_counter?: number
          id?: string
          last_move_at?: string | null
          move_count?: number
          pgn?: string | null
          position_history?: Json | null
          result?: string | null
          status?: string
          time_control?: number
          time_increment?: number
          undo_requested_by?: string | null
          updated_at?: string
          white_player_id: string
          white_rating_change?: number | null
          white_time_remaining: number
          winner_id?: string | null
        }
        Update: {
          black_player_id?: string
          black_rating_change?: number | null
          black_time_remaining?: number
          completed_at?: string | null
          created_at?: string
          current_fen?: string
          current_turn?: string
          draw_offered_by?: string | null
          fifty_move_counter?: number
          id?: string
          last_move_at?: string | null
          move_count?: number
          pgn?: string | null
          position_history?: Json | null
          result?: string | null
          status?: string
          time_control?: number
          time_increment?: number
          undo_requested_by?: string | null
          updated_at?: string
          white_player_id?: string
          white_rating_change?: number | null
          white_time_remaining?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_black_player_id_fkey"
            columns: ["black_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_draw_offered_by_fkey"
            columns: ["draw_offered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_undo_requested_by_fkey"
            columns: ["undo_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_white_player_id_fkey"
            columns: ["white_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_stats: {
        Row: {
          annotations_count: number | null
          helpful_answers_count: number | null
          id: string
          study_sessions: number | null
          tournaments_won: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          annotations_count?: number | null
          helpful_answers_count?: number | null
          id?: string
          study_sessions?: number | null
          tournaments_won?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          annotations_count?: number | null
          helpful_answers_count?: number | null
          id?: string
          study_sessions?: number | null
          tournaments_won?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          lesson_id: string | null
          lesson_title: string
          progress: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          lesson_title: string
          progress?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          lesson_title?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          coach_id: string
          content: string | null
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          file_url: string | null
          id: string
          is_published: boolean | null
          lesson_type: string
          tags: string[] | null
          title: string
          updated_at: string | null
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          coach_id: string
          content?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          lesson_type: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          coach_id?: string
          content?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          lesson_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      local_events: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          current_participants: number | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          latitude: number
          location_name: string | null
          longitude: number
          max_participants: number | null
          organizer_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          event_date: string
          event_type: string
          id?: string
          latitude: number
          location_name?: string | null
          longitude: number
          max_participants?: number | null
          organizer_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          latitude?: number
          location_name?: string | null
          longitude?: number
          max_participants?: number | null
          organizer_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_queue: {
        Row: {
          created_at: string
          id: string
          time_control: number
          time_increment: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          time_control: number
          time_increment: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          time_control?: number
          time_increment?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          room_id: string | null
          sender_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          room_id?: string | null
          sender_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          room_id?: string | null
          sender_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      player_stats: {
        Row: {
          avg_game_duration: number | null
          draws: number | null
          favorite_opening: string | null
          id: string
          losses: number | null
          total_games: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
          wins: number | null
        }
        Insert: {
          avg_game_duration?: number | null
          draws?: number | null
          favorite_opening?: string | null
          id?: string
          losses?: number | null
          total_games?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
          wins?: number | null
        }
        Update: {
          avg_game_duration?: number | null
          draws?: number | null
          favorite_opening?: string | null
          id?: string
          losses?: number | null
          total_games?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
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
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category: string | null
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          likes_count: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
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
          city: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          id: string
          latitude: number | null
          location_enabled: boolean | null
          longitude: number | null
          rating: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          latitude?: number | null
          location_enabled?: boolean | null
          longitude?: number | null
          rating?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          latitude?: number | null
          location_enabled?: boolean | null
          longitude?: number | null
          rating?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      study_room_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_room_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_room_participants: {
        Row: {
          id: string
          joined_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_room_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_rooms: {
        Row: {
          annotations: Json | null
          created_at: string
          creator_id: string
          current_fen: string
          description: string | null
          id: string
          is_public: boolean | null
          max_participants: number | null
          name: string
          updated_at: string
        }
        Insert: {
          annotations?: Json | null
          created_at?: string
          creator_id: string
          current_fen?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_participants?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          annotations?: Json | null
          created_at?: string
          creator_id?: string
          current_fen?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_participants?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_rooms_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          id: string
          joined_at: string | null
          score: number | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          score?: number | null
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          score?: number | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string | null
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          max_participants: number | null
          name: string
          organizer_id: string
          prize_pool: string | null
          rules: Json | null
          start_time: string | null
          status: Database["public"]["Enums"]["tournament_status"]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_participants?: number | null
          name: string
          organizer_id: string
          prize_pool?: string | null
          rules?: Json | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_participants?: number | null
          name?: string
          organizer_id?: string
          prize_pool?: string | null
          rules?: Json | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          verified_at: string | null
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          verified_at?: string | null
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          verified_at?: string | null
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
      game_history: {
        Row: {
          black_player_id: string | null
          black_player_rating: number | null
          black_player_username: string | null
          completed_at: string | null
          created_at: string | null
          id: string | null
          move_count: number | null
          pgn: string | null
          result: string | null
          status: string | null
          time_control: number | null
          time_increment: number | null
          white_player_id: string | null
          white_player_rating: number | null
          white_player_username: string | null
          winner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_black_player_id_fkey"
            columns: ["black_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_white_player_id_fkey"
            columns: ["white_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_player_stats: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "coach" | "player"
      room_type: "discussion" | "study"
      tournament_format:
        | "standard"
        | "chess960"
        | "hand_and_brain"
        | "puzzle_battle"
      tournament_status: "upcoming" | "active" | "completed" | "cancelled"
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
      app_role: ["admin", "coach", "player"],
      room_type: ["discussion", "study"],
      tournament_format: [
        "standard",
        "chess960",
        "hand_and_brain",
        "puzzle_battle",
      ],
      tournament_status: ["upcoming", "active", "completed", "cancelled"],
    },
  },
} as const
