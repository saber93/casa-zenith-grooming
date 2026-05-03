export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      barbers: {
        Row: {
          bio_ar: string | null;
          bio_en: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name_ar: string;
          name_en: string;
          phone: string | null;
          photo_url: string | null;
        };
        Insert: {
          bio_ar?: string | null;
          bio_en?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name_ar: string;
          name_en: string;
          phone?: string | null;
          photo_url?: string | null;
        };
        Update: {
          bio_ar?: string | null;
          bio_en?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name_ar?: string;
          name_en?: string;
          phone?: string | null;
          photo_url?: string | null;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          barber_id: string | null;
          booking_date: string;
          booking_time: string;
          created_at: string | null;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string;
          id: string;
          language: string | null;
          notes: string | null;
          service_id: string | null;
          status: string | null;
        };
        Insert: {
          barber_id?: string | null;
          booking_date: string;
          booking_time: string;
          created_at?: string | null;
          customer_id?: string | null;
          customer_name: string;
          customer_phone: string;
          id?: string;
          language?: string | null;
          notes?: string | null;
          service_id?: string | null;
          status?: string | null;
        };
        Update: {
          barber_id?: string | null;
          booking_date?: string;
          booking_time?: string;
          created_at?: string | null;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          id?: string;
          language?: string | null;
          notes?: string | null;
          service_id?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string | null;
          email: string | null;
          full_name: string;
          id: string;
          phone: string;
          preferred_language: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          full_name: string;
          id?: string;
          phone: string;
          preferred_language?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          phone?: string;
          preferred_language?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          created_at: string | null;
          description_ar: string | null;
          description_en: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean | null;
          name_ar: string;
          name_en: string;
          price: number;
          slug_ar: string;
          slug_en: string;
          whatsapp_order_text_ar: string | null;
          whatsapp_order_text_en: string | null;
        };
        Insert: {
          created_at?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          name_ar: string;
          name_en: string;
          price?: number;
          slug_ar: string;
          slug_en: string;
          whatsapp_order_text_ar?: string | null;
          whatsapp_order_text_en?: string | null;
        };
        Update: {
          created_at?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          name_ar?: string;
          name_en?: string;
          price?: number;
          slug_ar?: string;
          slug_en?: string;
          whatsapp_order_text_ar?: string | null;
          whatsapp_order_text_en?: string | null;
        };
        Relationships: [];
      };
      queue_tickets: {
        Row: {
          actual_service_minutes: number | null;
          barber_id: string | null;
          called_at: string | null;
          completed_at: string | null;
          created_at: string | null;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string;
          estimated_start_time: string | null;
          estimated_wait_max: number | null;
          estimated_wait_min: number | null;
          id: string;
          language: string | null;
          mode: string;
          notes: string | null;
          prediction_confidence: string | null;
          public_token: string;
          queue_date: string;
          queue_number: number;
          service_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          actual_service_minutes?: number | null;
          barber_id?: string | null;
          called_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          customer_name: string;
          customer_phone: string;
          estimated_start_time?: string | null;
          estimated_wait_max?: number | null;
          estimated_wait_min?: number | null;
          id?: string;
          language?: string | null;
          mode?: string;
          notes?: string | null;
          prediction_confidence?: string | null;
          public_token?: string;
          queue_date?: string;
          queue_number: number;
          service_id?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          actual_service_minutes?: number | null;
          barber_id?: string | null;
          called_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          estimated_start_time?: string | null;
          estimated_wait_max?: number | null;
          estimated_wait_min?: number | null;
          id?: string;
          language?: string | null;
          mode?: string;
          notes?: string | null;
          prediction_confidence?: string | null;
          public_token?: string;
          queue_date?: string;
          queue_number?: number;
          service_id?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "queue_tickets_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "queue_tickets_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "queue_tickets_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          buffer_minutes: number | null;
          created_at: string | null;
          default_duration_max: number | null;
          default_duration_min: number | null;
          description_ar: string | null;
          description_en: string | null;
          duration_minutes: number;
          id: string;
          image_url: string | null;
          is_active: boolean | null;
          price: number;
          short_description_ar: string | null;
          short_description_en: string | null;
          slug_ar: string;
          slug_en: string;
          title_ar: string;
          title_en: string;
        };
        Insert: {
          buffer_minutes?: number | null;
          created_at?: string | null;
          default_duration_max?: number | null;
          default_duration_min?: number | null;
          description_ar?: string | null;
          description_en?: string | null;
          duration_minutes?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          price?: number;
          short_description_ar?: string | null;
          short_description_en?: string | null;
          slug_ar: string;
          slug_en: string;
          title_ar: string;
          title_en: string;
        };
        Update: {
          buffer_minutes?: number | null;
          created_at?: string | null;
          default_duration_max?: number | null;
          default_duration_min?: number | null;
          description_ar?: string | null;
          description_en?: string | null;
          duration_minutes?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          price?: number;
          short_description_ar?: string | null;
          short_description_en?: string | null;
          slug_ar?: string;
          slug_en?: string;
          title_ar?: string;
          title_en?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      barber_service_duration_stats: {
        Row: {
          avg_minutes: number | null;
          barber_id: string | null;
          p50_minutes: number | null;
          p80_minutes: number | null;
          p90_minutes: number | null;
          sample_size: number | null;
          service_id: string | null;
        };
        Relationships: [];
      };
      service_duration_history: {
        Row: {
          barber_id: string | null;
          day_of_week: number | null;
          duration_minutes: number | null;
          hour_of_day: number | null;
          service_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_queue_action: {
        Args: {
          p_action: string;
          p_barber_id?: string | null;
          p_ticket_id: string;
        };
        Returns: Json;
      };
      get_queue_ticket_status: {
        Args: {
          p_public_token: string;
        };
        Returns: {
          barber_display_name: string | null;
          estimated_start_time: string | null;
          estimated_wait_max: number | null;
          estimated_wait_min: number | null;
          position: number;
          prediction_confidence: string;
          queue_number: number;
          service_display_name: string | null;
          status: string;
        }[];
      };
      get_unavailable_booking_slots: {
        Args: {
          p_barber_id: string;
          p_booking_date: string;
        };
        Returns: {
          booking_time: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      join_queue: {
        Args: {
          p_barber_id?: string | null;
          p_customer_name: string;
          p_customer_phone: string;
          p_language?: string;
          p_mode?: string;
          p_notes?: string | null;
          p_service_id: string;
        };
        Returns: {
          barber_display_name: string | null;
          estimated_start_time: string | null;
          estimated_wait_max: number | null;
          estimated_wait_min: number | null;
          position: number;
          prediction_confidence: string;
          public_token: string;
          queue_number: number;
          service_display_name: string | null;
          status: string;
        }[];
      };
      recalculate_queue_estimates: {
        Args: {
          p_barber_id: string;
          p_queue_date: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;
