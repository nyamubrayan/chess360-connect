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
      blocked_users: {
        Row: {
          blocked_user_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blocked_user_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blocked_user_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_user_id_fkey"
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
          joined_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string
          event_date: string
          id: string
          image_url: string | null
          location: string | null
          max_participants: number | null
          organizer_id: string
          registration_deadline: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          event_date: string
          id?: string
          image_url?: string | null
          location?: string | null
          max_participants?: number | null
          organizer_id: string
          registration_deadline?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          event_date?: string
          id?: string
          image_url?: string | null
          location?: string | null
          max_participants?: number | null
          organizer_id?: string
          registration_deadline?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      matchmaking_queue: {
        Row: {
          created_at: string
          id: string
          mode: string | null
          time_control: number
          time_increment: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string | null
          time_control: number
          time_increment: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string | null
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
      news_articles: {
        Row: {
          author_id: string
          category: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          published_at: string | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          author_id: string
          category?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
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
      private_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_messages_sender_id_fkey"
            columns: ["sender_id"]
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
          show_training_stats: boolean | null
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
          show_training_stats?: boolean | null
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
          show_training_stats?: boolean | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      puzzles: {
        Row: {
          created_at: string
          description: string | null
          difficulty: string
          fen: string
          id: string
          rating: number | null
          solution_moves: Json
          theme: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty: string
          fen: string
          id?: string
          rating?: number | null
          solution_moves: Json
          theme: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: string
          fen?: string
          id?: string
          rating?: number | null
          solution_moves?: Json
          theme?: string
        }
        Relationships: []
      }
      tournament_matches: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          match_number: number
          player1_id: string | null
          player2_id: string | null
          round: number
          status: string
          tournament_id: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          match_number: number
          player1_id?: string | null
          player2_id?: string | null
          round: number
          status?: string
          tournament_id: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          match_number?: number
          player1_id?: string | null
          player2_id?: string | null
          round?: number
          status?: string
          tournament_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "game_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          id: string
          joined_at: string
          placement: number | null
          seed: number | null
          status: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          placement?: number | null
          seed?: number | null
          status?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          placement?: number | null
          seed?: number | null
          status?: string
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
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          creator_id: string
          current_round: number
          description: string | null
          format: string
          id: string
          max_participants: number
          name: string
          start_date: string | null
          status: string
          time_control: number
          time_increment: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          current_round?: number
          description?: string | null
          format?: string
          id?: string
          max_participants?: number
          name: string
          start_date?: string | null
          status?: string
          time_control?: number
          time_increment?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          current_round?: number
          description?: string | null
          format?: string
          id?: string
          max_participants?: number
          name?: string
          start_date?: string | null
          status?: string
          time_control?: number
          time_increment?: number
          updated_at?: string
        }
        Relationships: []
      }
      training_achievements: {
        Row: {
          badge_icon: string
          created_at: string | null
          description: string
          id: string
          name: string
          points: number | null
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          badge_icon: string
          created_at?: string | null
          description: string
          id?: string
          name: string
          points?: number | null
          requirement_type: string
          requirement_value: number
        }
        Update: {
          badge_icon?: string
          created_at?: string | null
          description?: string
          id?: string
          name?: string
          points?: number | null
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          analysis_summary: Json | null
          completed_at: string | null
          created_at: string
          current_fen: string
          duration: number | null
          guest_blunders: number | null
          guest_good_moves: number | null
          guest_mistakes: number | null
          guest_move_accuracy: number | null
          guest_player_id: string | null
          guest_questionable_moves: number | null
          host_blunders: number | null
          host_good_moves: number | null
          host_mistakes: number | null
          host_move_accuracy: number | null
          host_player_id: string
          host_questionable_moves: number | null
          id: string
          last_move: string | null
          move_count: number
          status: string
          updated_at: string
        }
        Insert: {
          analysis_summary?: Json | null
          completed_at?: string | null
          created_at?: string
          current_fen?: string
          duration?: number | null
          guest_blunders?: number | null
          guest_good_moves?: number | null
          guest_mistakes?: number | null
          guest_move_accuracy?: number | null
          guest_player_id?: string | null
          guest_questionable_moves?: number | null
          host_blunders?: number | null
          host_good_moves?: number | null
          host_mistakes?: number | null
          host_move_accuracy?: number | null
          host_player_id: string
          host_questionable_moves?: number | null
          id?: string
          last_move?: string | null
          move_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_summary?: Json | null
          completed_at?: string | null
          created_at?: string
          current_fen?: string
          duration?: number | null
          guest_blunders?: number | null
          guest_good_moves?: number | null
          guest_mistakes?: number | null
          guest_move_accuracy?: number | null
          guest_player_id?: string | null
          guest_questionable_moves?: number | null
          host_blunders?: number | null
          host_good_moves?: number | null
          host_mistakes?: number | null
          host_move_accuracy?: number | null
          host_player_id?: string
          host_questionable_moves?: number | null
          id?: string
          last_move?: string | null
          move_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      user_puzzle_attempts: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          puzzle_id: string
          solved: boolean
          time_spent: number | null
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          puzzle_id: string
          solved?: boolean
          time_spent?: number | null
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          puzzle_id?: string
          solved?: boolean
          time_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_puzzle_attempts_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "puzzles"
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
      user_streaks: {
        Row: {
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          total_training_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          total_training_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          total_training_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_training_achievements: {
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
            foreignKeyName: "user_training_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "training_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_training_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          score: number | null
          time_spent: number | null
          training_id: string
          training_type: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          score?: number | null
          time_spent?: number | null
          training_id: string
          training_type: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          score?: number | null
          time_spent?: number | null
          training_id?: string
          training_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_training_stats: {
        Row: {
          id: string
          total_lessons_completed: number | null
          total_perfect_scores: number | null
          total_points: number | null
          total_puzzles_solved: number | null
          training_level: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          total_lessons_completed?: number | null
          total_perfect_scores?: number | null
          total_points?: number | null
          total_puzzles_solved?: number | null
          training_level?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          total_lessons_completed?: number | null
          total_perfect_scores?: number | null
          total_points?: number | null
          total_puzzles_solved?: number | null
          training_level?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      check_and_award_achievements: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_player_stats: { Args: { p_user_id: string }; Returns: undefined }
      update_user_streak: { Args: { p_user_id: string }; Returns: undefined }
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
