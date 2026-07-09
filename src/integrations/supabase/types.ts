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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: number
          time_taken_ms: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_answer: number
          time_taken_ms?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: number
          time_taken_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      doubt_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          question_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          question_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          question_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubt_messages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_attempts: {
        Row: {
          answers: Json
          id: string
          mock_test_id: string
          score: number
          section_breakdown: Json
          started_at: string
          submitted_at: string | null
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json
          id?: string
          mock_test_id: string
          score?: number
          section_breakdown?: Json
          started_at?: string
          submitted_at?: string | null
          total?: number
          user_id: string
        }
        Update: {
          answers?: Json
          id?: string
          mock_test_id?: string
          score?: number
          section_breakdown?: Json
          started_at?: string
          submitted_at?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_attempts_mock_test_id_fkey"
            columns: ["mock_test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_section_questions: {
        Row: {
          id: string
          question_id: string
          question_order: number
          section_id: string
        }
        Insert: {
          id?: string
          question_id: string
          question_order?: number
          section_id: string
        }
        Update: {
          id?: string
          question_id?: string
          question_order?: number
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_section_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_section_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "mock_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_sections: {
        Row: {
          duration_minutes: number
          id: string
          mock_test_id: string
          name: string
          section_order: number
        }
        Insert: {
          duration_minutes?: number
          id?: string
          mock_test_id: string
          name: string
          section_order?: number
        }
        Update: {
          duration_minutes?: number
          id?: string
          mock_test_id?: string
          name?: string
          section_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_sections_mock_test_id_fkey"
            columns: ["mock_test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          ends_at: string | null
          id: string
          is_active: boolean
          mock_type: Database["public"]["Enums"]["mock_type"]
          slug: string
          starts_at: string | null
          title: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          mock_type?: Database["public"]["Enums"]["mock_type"]
          slug: string
          starts_at?: string | null
          title: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          mock_type?: Database["public"]["Enums"]["mock_type"]
          slug?: string
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          college: string | null
          created_at: string
          id: string
          name: string | null
          streak: number
          target_companies: string[]
          updated_at: string
        }
        Insert: {
          college?: string | null
          created_at?: string
          id: string
          name?: string | null
          streak?: number
          target_companies?: string[]
          updated_at?: string
        }
        Update: {
          college?: string | null
          created_at?: string
          id?: string
          name?: string | null
          streak?: number
          target_companies?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          company_tag: string | null
          correct_answer: number
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          explanation: string | null
          id: string
          options: Json
          question: string
          topic_id: string
        }
        Insert: {
          company_tag?: string | null
          correct_answer: number
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          explanation?: string | null
          id?: string
          options: Json
          question: string
          topic_id: string
        }
        Update: {
          company_tag?: string | null
          correct_answer?: number
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          category: Database["public"]["Enums"]["topic_category"]
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          category: Database["public"]["Enums"]["topic_category"]
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          category?: Database["public"]["Enums"]["topic_category"]
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_names: {
        Args: { _ids: string[] }
        Returns: {
          id: string
          name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
      difficulty: "easy" | "medium" | "hard"
      mock_type: "company" | "weekly"
      topic_category: "quantitative" | "logical" | "verbal" | "technical"
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
      app_role: ["admin", "student"],
      difficulty: ["easy", "medium", "hard"],
      mock_type: ["company", "weekly"],
      topic_category: ["quantitative", "logical", "verbal", "technical"],
    },
  },
} as const
