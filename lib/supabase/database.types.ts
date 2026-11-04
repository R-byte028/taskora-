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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assistant_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_owner_fk"
            columns: ["conversation_id", "user_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          job_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_milestones_job_owner_fk"
            columns: ["job_id", "user_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      job_updates: {
        Row: {
          attachment_mime_type: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          content: string
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          attachment_mime_type?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          content: string
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          attachment_mime_type?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          content?: string
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_updates_job_owner_fk"
            columns: ["job_id", "user_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      jobs: {
        Row: {
          amount: number
          client_id: string | null
          completed_at: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_owner_fk"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      milestone_checklist_items: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          milestone_id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          milestone_id: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          milestone_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_checklist_items_milestone_owner_fk"
            columns: ["milestone_id", "user_id"]
            isOneToOne: false
            referencedRelation: "job_milestones"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount_atomic: number
          asset: string
          finality: string
          id: string
          network: string
          payment_request_id: string
          receiver_account_id: string
          signer_account_id: string
          transaction_hash: string
          user_id: string
          verification_evidence: Json
          verified_at: string
        }
        Insert: {
          amount_atomic: number
          asset: string
          finality: string
          id?: string
          network: string
          payment_request_id: string
          receiver_account_id: string
          signer_account_id: string
          transaction_hash: string
          user_id: string
          verification_evidence?: Json
          verified_at?: string
        }
        Update: {
          amount_atomic?: number
          asset?: string
          finality?: string
          id?: string
          network?: string
          payment_request_id?: string
          receiver_account_id?: string
          signer_account_id?: string
          transaction_hash?: string
          user_id?: string
          verification_evidence?: Json
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_request_shares: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          payment_request_id: string
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          payment_request_id: string
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          payment_request_id?: string
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_request_shares_owner_fk"
            columns: ["payment_request_id", "user_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          amount_atomic: number | null
          owner_share_token: string | null
          client_id: string
          created_at: string
          currency: string
          id: string
          job_id: string
          recipient_account_id: string | null
          settlement_asset: string | null
          settlement_network: string | null
          status: string
          updated_at: string
          user_id: string
          work_summary: string
        }
        Insert: {
          amount: number
          amount_atomic?: number | null
          owner_share_token?: string | null
          owner_share_token?: string | null
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          job_id: string
          recipient_account_id?: string | null
          settlement_asset?: string | null
          settlement_network?: string | null
          status?: string
          updated_at?: string
          user_id: string
          work_summary: string
        }
        Update: {
          amount?: number
          amount_atomic?: number | null
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          job_id?: string
          recipient_account_id?: string | null
          settlement_asset?: string | null
          settlement_network?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          work_summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_client_owner_fk"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "payment_requests_job_owner_fk"
            columns: ["job_id", "user_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          full_name: string | null
          id: string
          near_account_id: string | null
          near_network: string | null
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          near_account_id?: string | null
          near_network?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          near_account_id?: string | null
          near_network?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_payment_request_share: {
        Args: { p_request_id: string; p_token: string }
        Returns: string
      }
      finalize_near_payment: {
        Args: {
          p_amount_atomic: string
          p_payment_request_id: string
          p_receiver_account_id: string
          p_signer_account_id: string
          p_token: string
          p_transaction_hash: string
          p_verification_evidence: Json
        }
        Returns: string
      }
      get_near_payment_verification_context: {
        Args: { p_token: string }
        Returns: {
          amount_atomic: string
          payment_request_id: string
          recipient_account_id: string
          request_status: string
          settlement_asset: string
          settlement_network: string
          user_id: string
        }[]
      }
      get_public_near_payment_request: {
        Args: { p_token: string }
        Returns: {
          amount: number
          amount_atomic: string
          client_name: string
          currency: string
          expires_at: string
          job_title: string
          provider_name: string
          recipient_account_id: string
          request_reference: string
          settlement_network: string
          work_summary: string
        }[]
      }
      get_public_payment_request: {
        Args: { p_token: string }
        Returns: {
          amount: number
          client_name: string
          currency: string
          expires_at: string
          job_title: string
          provider_name: string
          request_reference: string
          work_summary: string
        }[]
      }
      update_completed_job_amount: {
        Args: { p_job_id: string; p_amount: number }
        Returns: undefined
      }
      revoke_payment_request_share: {
        Args: { p_request_id: string }
        Returns: boolean
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
