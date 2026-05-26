export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      barbers: {
        Row: {
          id: string;
          name_en: string;
          name_ar: string;
          bio_en: string | null;
          bio_ar: string | null;
          phone: string | null;
          photo_url: string | null;
          is_active: boolean | null;
          created_at: string | null;
          business_id: string;
          shift_id: string | null;
        };
        Insert: {
          id?: string;
          name_en: string;
          name_ar: string;
          bio_en?: string | null;
          bio_ar?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          business_id?: string;
          shift_id?: string | null;
        };
        Update: {
          id?: string;
          name_en?: string;
          name_ar?: string;
          bio_en?: string | null;
          bio_ar?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          business_id?: string;
          shift_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "barbers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barbers_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_items: {
        Row: {
          id: string;
          business_id: string;
          booking_id: string | null;
          service_id: string | null;
          barber_id: string | null;
          resource_id: string | null;
          starts_at: string;
          ends_at: string;
          status: string;
          price: number;
          duration_minutes: number | null;
          commission_amount: number | null;
          tip_amount: number | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id?: string;
          booking_id?: string | null;
          service_id?: string | null;
          barber_id?: string | null;
          resource_id?: string | null;
          starts_at: string;
          ends_at: string;
          status?: string;
          price?: number;
          duration_minutes?: number | null;
          commission_amount?: number | null;
          tip_amount?: number | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          booking_id?: string | null;
          service_id?: string | null;
          barber_id?: string | null;
          resource_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          status?: string;
          price?: number;
          duration_minutes?: number | null;
          commission_amount?: number | null;
          tip_amount?: number | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "booking_items_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_items_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_items_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          service_id: string | null;
          barber_id: string | null;
          customer_name: string;
          customer_phone: string;
          booking_date: string;
          booking_time: string;
          notes: string | null;
          language: string | null;
          status: string | null;
          created_at: string | null;
          customer_id: string | null;
          business_id: string;
          checked_out_at: string | null;
          checked_out_by: string | null;
          checkout_status: string;
          checkout_transaction_id: string | null;
        };
        Insert: {
          id?: string;
          service_id?: string | null;
          barber_id?: string | null;
          customer_name: string;
          customer_phone: string;
          booking_date: string;
          booking_time: string;
          notes?: string | null;
          language?: string | null;
          status?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          business_id?: string;
          checked_out_at?: string | null;
          checked_out_by?: string | null;
          checkout_status?: string;
          checkout_transaction_id?: string | null;
        };
        Update: {
          id?: string;
          service_id?: string | null;
          barber_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          booking_date?: string;
          booking_time?: string;
          notes?: string | null;
          language?: string | null;
          status?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          business_id?: string;
          checked_out_at?: string | null;
          checked_out_by?: string | null;
          checkout_status?: string;
          checkout_transaction_id?: string | null;
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
            foreignKeyName: "bookings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_checked_out_by_fkey";
            columns: ["checked_out_by"];
            isOneToOne: false;
            referencedRelation: "users";
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
      business_memberships: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: string;
          barber_id: string | null;
          status: string;
          must_change_password: boolean;
          password_changed_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role: string;
          barber_id?: string | null;
          status?: string;
          must_change_password?: boolean;
          password_changed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: string;
          barber_id?: string | null;
          status?: string;
          must_change_password?: boolean;
          password_changed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_memberships_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_memberships_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      business_modules: {
        Row: {
          business_id: string;
          module_key: string;
          enabled: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          business_id: string;
          module_key: string;
          enabled: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          business_id?: string;
          module_key?: string;
          enabled?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_modules_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_working_days: {
        Row: {
          id: string;
          business_id: string;
          day_of_week: number;
          is_active: boolean;
          open_time: string;
          close_time: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          day_of_week: number;
          is_active?: boolean;
          open_time?: string;
          close_time?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          day_of_week?: number;
          is_active?: boolean;
          open_time?: string;
          close_time?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_working_days_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          id: string;
          slug: string;
          name_en: string;
          name_ar: string;
          business_type: string;
          business_model: string;
          status: string;
          default_locale: string;
          timezone: string;
          currency: string;
          description_en: string | null;
          description_ar: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          accent_color: string | null;
          phone: string | null;
          email: string | null;
          whatsapp_number: string | null;
          address_en: string | null;
          address_ar: string | null;
          city: string | null;
          area: string | null;
          country: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name_en: string;
          name_ar: string;
          business_type?: string;
          business_model?: string;
          status?: string;
          default_locale?: string;
          timezone?: string;
          currency?: string;
          description_en?: string | null;
          description_ar?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          accent_color?: string | null;
          phone?: string | null;
          email?: string | null;
          whatsapp_number?: string | null;
          address_en?: string | null;
          address_ar?: string | null;
          city?: string | null;
          area?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          name_en?: string;
          name_ar?: string;
          business_type?: string;
          business_model?: string;
          status?: string;
          default_locale?: string;
          timezone?: string;
          currency?: string;
          description_en?: string | null;
          description_ar?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          accent_color?: string | null;
          phone?: string | null;
          email?: string | null;
          whatsapp_number?: string | null;
          address_en?: string | null;
          address_ar?: string | null;
          city?: string | null;
          area?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      cashier_sessions: {
        Row: {
          id: string;
          business_id: string;
          opened_by: string;
          opened_at: string;
          closed_by: string | null;
          closed_at: string | null;
          opening_cash: number;
          expected_cash: number;
          actual_cash: number;
          variance: number;
          status: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string;
          opened_by: string;
          opened_at?: string;
          closed_by?: string | null;
          closed_at?: string | null;
          opening_cash?: number;
          expected_cash?: number;
          actual_cash?: number;
          variance?: number;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          opened_by?: string;
          opened_at?: string;
          closed_by?: string | null;
          closed_at?: string | null;
          opening_cash?: number;
          expected_cash?: number;
          actual_cash?: number;
          variance?: number;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cashier_sessions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cashier_sessions_closed_by_fkey";
            columns: ["closed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cashier_sessions_opened_by_fkey";
            columns: ["opened_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_receipt_counters: {
        Row: {
          business_id: string;
          receipt_date: string;
          last_sequence: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          receipt_date: string;
          last_sequence?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          receipt_date?: string;
          last_sequence?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_receipt_counters_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_transaction_items: {
        Row: {
          id: string;
          transaction_id: string;
          business_id: string;
          type: string;
          resource_id: string | null;
          staff_id: string | null;
          name: string;
          qty: number;
          unit_price: number;
          discount: number;
          total: number;
          service_snapshot: Json | null;
          product_snapshot: Json | null;
          created_at: string;
          staff_snapshot: Json;
          commission_amount: number;
          tip_amount: number;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          business_id?: string;
          type: string;
          resource_id?: string | null;
          staff_id?: string | null;
          name: string;
          qty?: number;
          unit_price?: number;
          discount?: number;
          total?: number;
          service_snapshot?: Json | null;
          product_snapshot?: Json | null;
          created_at?: string;
          staff_snapshot?: Json;
          commission_amount?: number;
          tip_amount?: number;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          business_id?: string;
          type?: string;
          resource_id?: string | null;
          staff_id?: string | null;
          name?: string;
          qty?: number;
          unit_price?: number;
          discount?: number;
          total?: number;
          service_snapshot?: Json | null;
          product_snapshot?: Json | null;
          created_at?: string;
          staff_snapshot?: Json;
          commission_amount?: number;
          tip_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_transaction_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_transaction_items_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_transaction_items_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "checkout_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_transactions: {
        Row: {
          id: string;
          business_id: string;
          booking_id: string | null;
          queue_ticket_id: string | null;
          customer_id: string | null;
          subtotal: number;
          discount_amount: number;
          wallet_amount: number;
          package_amount: number;
          membership_amount: number;
          tips_amount: number;
          tax_amount: number;
          total_amount: number;
          refunded_amount: number;
          refund_status: string;
          service_status: string;
          payment_status: string;
          payments: Json;
          receipt_number: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          cashier_session_id: string | null;
          original_transaction_id: string | null;
          transaction_type: string;
          customer_snapshot: Json;
          payment_snapshot: Json;
          discount_snapshot: Json;
          source_snapshot: Json;
          refund_reason: string | null;
          wallet_restoration_status: string;
          package_restoration_status: string;
        };
        Insert: {
          id?: string;
          business_id?: string;
          booking_id?: string | null;
          queue_ticket_id?: string | null;
          customer_id?: string | null;
          subtotal?: number;
          discount_amount?: number;
          wallet_amount?: number;
          package_amount?: number;
          membership_amount?: number;
          tips_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          refunded_amount?: number;
          refund_status?: string;
          service_status?: string;
          payment_status?: string;
          payments?: Json;
          receipt_number: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          cashier_session_id?: string | null;
          original_transaction_id?: string | null;
          transaction_type?: string;
          customer_snapshot?: Json;
          payment_snapshot?: Json;
          discount_snapshot?: Json;
          source_snapshot?: Json;
          refund_reason?: string | null;
          wallet_restoration_status?: string;
          package_restoration_status?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          booking_id?: string | null;
          queue_ticket_id?: string | null;
          customer_id?: string | null;
          subtotal?: number;
          discount_amount?: number;
          wallet_amount?: number;
          package_amount?: number;
          membership_amount?: number;
          tips_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          refunded_amount?: number;
          refund_status?: string;
          service_status?: string;
          payment_status?: string;
          payments?: Json;
          receipt_number?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          cashier_session_id?: string | null;
          original_transaction_id?: string | null;
          transaction_type?: string;
          customer_snapshot?: Json;
          payment_snapshot?: Json;
          discount_snapshot?: Json;
          source_snapshot?: Json;
          refund_reason?: string | null;
          wallet_restoration_status?: string;
          package_restoration_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_transactions_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_transactions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_transactions_cashier_session_id_fkey";
            columns: ["cashier_session_id"];
            isOneToOne: false;
            referencedRelation: "cashier_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_transactions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_transactions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_transactions_original_transaction_id_fkey";
            columns: ["original_transaction_id"];
            isOneToOne: false;
            referencedRelation: "checkout_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_transactions_queue_ticket_id_fkey";
            columns: ["queue_ticket_id"];
            isOneToOne: false;
            referencedRelation: "queue_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_package_benefits: {
        Row: {
          id: string;
          customer_package_id: string;
          service_id: string;
          total_quantity: number;
          remaining_quantity: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          customer_package_id: string;
          service_id: string;
          total_quantity: number;
          remaining_quantity: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          customer_package_id?: string;
          service_id?: string;
          total_quantity?: number;
          remaining_quantity?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_package_benefits_customer_package_id_fkey";
            columns: ["customer_package_id"];
            isOneToOne: false;
            referencedRelation: "customer_packages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_package_benefits_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_packages: {
        Row: {
          id: string;
          business_id: string;
          customer_name: string;
          customer_phone: string;
          package_id: string;
          price_paid: number;
          status: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_name: string;
          customer_phone: string;
          package_id: string;
          price_paid?: number;
          status?: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_name?: string;
          customer_phone?: string;
          package_id?: string;
          price_paid?: number;
          status?: string;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_packages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_packages_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "packages";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          email: string | null;
          preferred_language: string | null;
          created_at: string | null;
          updated_at: string | null;
          whatsapp_phone: string | null;
          whatsapp_verified_at: string | null;
          whatsapp_opt_in_at: string | null;
          whatsapp_last_inbound_at: string | null;
          whatsapp_wa_id: string | null;
          auth_user_id: string | null;
          business_id: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          email?: string | null;
          preferred_language?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          whatsapp_phone?: string | null;
          whatsapp_verified_at?: string | null;
          whatsapp_opt_in_at?: string | null;
          whatsapp_last_inbound_at?: string | null;
          whatsapp_wa_id?: string | null;
          auth_user_id?: string | null;
          business_id?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          email?: string | null;
          preferred_language?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          whatsapp_phone?: string | null;
          whatsapp_verified_at?: string | null;
          whatsapp_opt_in_at?: string | null;
          whatsapp_last_inbound_at?: string | null;
          whatsapp_wa_id?: string | null;
          auth_user_id?: string | null;
          business_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_auth_user_id_fkey";
            columns: ["auth_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      discounts: {
        Row: {
          id: string;
          business_id: string;
          code: string;
          type: string;
          amount: number;
          starts_at: string;
          ends_at: string;
          status: string;
          using_type: string;
          benefit_numbers: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          code: string;
          type?: string;
          amount: number;
          starts_at?: string;
          ends_at: string;
          status?: string;
          using_type?: string;
          benefit_numbers?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          code?: string;
          type?: string;
          amount?: number;
          starts_at?: string;
          ends_at?: string;
          status?: string;
          using_type?: string;
          benefit_numbers?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "discounts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          business_id: string;
          supplier_id: string | null;
          expense_name: string;
          payee: string;
          amount: number;
          payment_type: string;
          date: string;
          notes: string | null;
          receipt_image_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          supplier_id?: string | null;
          expense_name: string;
          payee: string;
          amount: number;
          payment_type: string;
          date?: string;
          notes?: string | null;
          receipt_image_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          supplier_id?: string | null;
          expense_name?: string;
          payee?: string;
          amount?: number;
          payment_type?: string;
          date?: string;
          notes?: string | null;
          receipt_image_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_ledger_entries: {
        Row: {
          id: string;
          business_id: string;
          checkout_transaction_id: string | null;
          entry_type: string;
          amount: number;
          direction: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          checkout_transaction_id?: string | null;
          entry_type: string;
          amount: number;
          direction: string;
          category: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          checkout_transaction_id?: string | null;
          entry_type?: string;
          amount?: number;
          direction?: string;
          category?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_ledger_entries_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_ledger_entries_checkout_transaction_id_fkey";
            columns: ["checkout_transaction_id"];
            isOneToOne: false;
            referencedRelation: "checkout_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          membership_no: string;
          discount_percent: number;
          starts_at: string;
          ends_at: string;
          status: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          membership_no: string;
          discount_percent: number;
          starts_at?: string;
          ends_at: string;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string | null;
          membership_no?: string;
          discount_percent?: number;
          starts_at?: string;
          ends_at?: string;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      package_services: {
        Row: {
          id: string;
          package_id: string;
          service_id: string;
          quantity: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          package_id: string;
          service_id: string;
          quantity?: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          package_id?: string;
          service_id?: string;
          quantity?: number;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "package_services_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "packages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "package_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      packages: {
        Row: {
          id: string;
          business_id: string;
          name_en: string;
          name_ar: string;
          description_en: string | null;
          description_ar: string | null;
          price: number;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name_en: string;
          name_ar: string;
          description_en?: string | null;
          description_ar?: string | null;
          price?: number;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name_en?: string;
          name_ar?: string;
          description_en?: string | null;
          description_ar?: string | null;
          price?: number;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "packages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      product_inventory_movements: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          checkout_transaction_id: string | null;
          qty_delta: number;
          movement_type: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          product_id: string;
          checkout_transaction_id?: string | null;
          qty_delta: number;
          movement_type: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          product_id?: string;
          checkout_transaction_id?: string | null;
          qty_delta?: number;
          movement_type?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_inventory_movements_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_inventory_movements_checkout_transaction_id_fkey";
            columns: ["checkout_transaction_id"];
            isOneToOne: false;
            referencedRelation: "checkout_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_inventory_movements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_sale_items: {
        Row: {
          id: string;
          sale_id: string;
          business_id: string;
          product_id: string | null;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          sale_id: string;
          business_id?: string;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          sale_id?: string;
          business_id?: string;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_sale_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "product_sales";
            referencedColumns: ["id"];
          },
        ];
      };
      product_sales: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          staff_id: string | null;
          payment_type: string;
          subtotal: number;
          discount_amount: number;
          total: number;
          status: string;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
          booking_id: string | null;
          queue_ticket_id: string | null;
        };
        Insert: {
          id?: string;
          business_id?: string;
          customer_id?: string | null;
          staff_id?: string | null;
          payment_type?: string;
          subtotal?: number;
          discount_amount?: number;
          total?: number;
          status?: string;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          booking_id?: string | null;
          queue_ticket_id?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string | null;
          staff_id?: string | null;
          payment_type?: string;
          subtotal?: number;
          discount_amount?: number;
          total?: number;
          status?: string;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          booking_id?: string | null;
          queue_ticket_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_sales_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_sales_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_sales_queue_ticket_id_fkey";
            columns: ["queue_ticket_id"];
            isOneToOne: false;
            referencedRelation: "queue_tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_sales_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          name_en: string;
          name_ar: string;
          slug_en: string;
          slug_ar: string;
          description_en: string | null;
          description_ar: string | null;
          price: number;
          image_url: string | null;
          whatsapp_order_text_en: string | null;
          whatsapp_order_text_ar: string | null;
          is_active: boolean | null;
          created_at: string | null;
          business_id: string;
          stock_quantity: number;
        };
        Insert: {
          id?: string;
          name_en: string;
          name_ar: string;
          slug_en: string;
          slug_ar: string;
          description_en?: string | null;
          description_ar?: string | null;
          price?: number;
          image_url?: string | null;
          whatsapp_order_text_en?: string | null;
          whatsapp_order_text_ar?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          business_id?: string;
          stock_quantity?: number;
        };
        Update: {
          id?: string;
          name_en?: string;
          name_ar?: string;
          slug_en?: string;
          slug_ar?: string;
          description_en?: string | null;
          description_ar?: string | null;
          price?: number;
          image_url?: string | null;
          whatsapp_order_text_en?: string | null;
          whatsapp_order_text_ar?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          business_id?: string;
          stock_quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      queue_tickets: {
        Row: {
          id: string;
          public_token: string;
          customer_id: string | null;
          service_id: string | null;
          barber_id: string | null;
          customer_name: string;
          customer_phone: string;
          queue_date: string;
          queue_number: number;
          mode: string;
          status: string;
          estimated_wait_min: number | null;
          estimated_wait_max: number | null;
          estimated_start_time: string | null;
          actual_service_minutes: number | null;
          prediction_confidence: string | null;
          called_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          language: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
          business_id: string;
          booking_id: string | null;
          service_completed_at: string | null;
          checkout_completed_at: string | null;
          checkout_required: boolean;
          checkout_transaction_id: string | null;
        };
        Insert: {
          id?: string;
          public_token?: string;
          customer_id?: string | null;
          service_id?: string | null;
          barber_id?: string | null;
          customer_name: string;
          customer_phone: string;
          queue_date?: string;
          queue_number: number;
          mode?: string;
          status?: string;
          estimated_wait_min?: number | null;
          estimated_wait_max?: number | null;
          estimated_start_time?: string | null;
          actual_service_minutes?: number | null;
          prediction_confidence?: string | null;
          called_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          language?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          business_id?: string;
          booking_id?: string | null;
          service_completed_at?: string | null;
          checkout_completed_at?: string | null;
          checkout_required?: boolean;
          checkout_transaction_id?: string | null;
        };
        Update: {
          id?: string;
          public_token?: string;
          customer_id?: string | null;
          service_id?: string | null;
          barber_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          queue_date?: string;
          queue_number?: number;
          mode?: string;
          status?: string;
          estimated_wait_min?: number | null;
          estimated_wait_max?: number | null;
          estimated_start_time?: string | null;
          actual_service_minutes?: number | null;
          prediction_confidence?: string | null;
          called_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          language?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          business_id?: string;
          booking_id?: string | null;
          service_completed_at?: string | null;
          checkout_completed_at?: string | null;
          checkout_required?: boolean;
          checkout_transaction_id?: string | null;
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
            foreignKeyName: "queue_tickets_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "queue_tickets_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
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
      resources: {
        Row: {
          id: string;
          business_id: string;
          name_en: string;
          name_ar: string;
          resource_type: string;
          status: string;
          capacity: number;
          sort_order: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id?: string;
          name_en: string;
          name_ar: string;
          resource_type?: string;
          status?: string;
          capacity?: number;
          sort_order?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name_en?: string;
          name_ar?: string;
          resource_type?: string;
          status?: string;
          capacity?: number;
          sort_order?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "resources_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          title_en: string;
          title_ar: string;
          slug_en: string;
          slug_ar: string;
          short_description_en: string | null;
          short_description_ar: string | null;
          description_en: string | null;
          description_ar: string | null;
          price: number;
          duration_minutes: number;
          image_url: string | null;
          is_active: boolean | null;
          created_at: string | null;
          default_duration_min: number | null;
          default_duration_max: number | null;
          buffer_minutes: number | null;
          business_id: string;
        };
        Insert: {
          id?: string;
          title_en: string;
          title_ar: string;
          slug_en: string;
          slug_ar: string;
          short_description_en?: string | null;
          short_description_ar?: string | null;
          description_en?: string | null;
          description_ar?: string | null;
          price?: number;
          duration_minutes?: number;
          image_url?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          default_duration_min?: number | null;
          default_duration_max?: number | null;
          buffer_minutes?: number | null;
          business_id?: string;
        };
        Update: {
          id?: string;
          title_en?: string;
          title_ar?: string;
          slug_en?: string;
          slug_ar?: string;
          short_description_en?: string | null;
          short_description_ar?: string | null;
          description_en?: string | null;
          description_ar?: string | null;
          price?: number;
          duration_minutes?: number;
          image_url?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          default_duration_min?: number | null;
          default_duration_max?: number | null;
          buffer_minutes?: number | null;
          business_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          start_time: string;
          end_time: string;
          break_start: string | null;
          break_end: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          start_time: string;
          end_time: string;
          break_start?: string | null;
          break_end?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          start_time?: string;
          end_time?: string;
          break_start?: string | null;
          break_end?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shifts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          logo_url: string | null;
          description: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          description?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          description?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: Json;
          created_at: string | null;
          barber_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: Json;
          created_at?: string | null;
          barber_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: Json;
          created_at?: string | null;
          barber_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_wallets: {
        Row: {
          id: string;
          business_id: string;
          wallet_id: string;
          user_id: string | null;
          staff_id: string | null;
          amount: number;
          invoiced_amount: number;
          commission_percent: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          wallet_id: string;
          user_id?: string | null;
          staff_id?: string | null;
          amount: number;
          invoiced_amount: number;
          commission_percent?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          wallet_id?: string;
          user_id?: string | null;
          staff_id?: string | null;
          amount?: number;
          invoiced_amount?: number;
          commission_percent?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_wallets_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_wallets_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_wallets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_wallets_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      vacations: {
        Row: {
          id: string;
          business_id: string;
          barber_id: string;
          day: string;
          description: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          barber_id: string;
          day: string;
          description?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          barber_id?: string;
          day?: string;
          description?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vacations_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vacations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      wallets: {
        Row: {
          id: string;
          business_id: string;
          code: string;
          amount: number;
          invoiced_amount: number;
          status: string;
          starts_at: string;
          ends_at: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          code: string;
          amount: number;
          invoiced_amount: number;
          status?: string;
          starts_at?: string;
          ends_at: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          code?: string;
          amount?: number;
          invoiced_amount?: number;
          status?: string;
          starts_at?: string;
          ends_at?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_inbound_messages: {
        Row: {
          id: string;
          wa_id: string | null;
          phone: string | null;
          normalized_phone: string | null;
          message_text: string | null;
          matched_public_token: string | null;
          matched_customer_id: string | null;
          matched_queue_ticket_id: string | null;
          match_status: string;
          raw_payload: Json | null;
          created_at: string | null;
          business_id: string;
        };
        Insert: {
          id?: string;
          wa_id?: string | null;
          phone?: string | null;
          normalized_phone?: string | null;
          message_text?: string | null;
          matched_public_token?: string | null;
          matched_customer_id?: string | null;
          matched_queue_ticket_id?: string | null;
          match_status?: string;
          raw_payload?: Json | null;
          created_at?: string | null;
          business_id?: string;
        };
        Update: {
          id?: string;
          wa_id?: string | null;
          phone?: string | null;
          normalized_phone?: string | null;
          message_text?: string | null;
          matched_public_token?: string | null;
          matched_customer_id?: string | null;
          matched_queue_ticket_id?: string | null;
          match_status?: string;
          raw_payload?: Json | null;
          created_at?: string | null;
          business_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_inbound_messages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_inbound_messages_matched_customer_id_fkey";
            columns: ["matched_customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_inbound_messages_matched_queue_ticket_id_fkey";
            columns: ["matched_queue_ticket_id"];
            isOneToOne: false;
            referencedRelation: "queue_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      barber_service_duration_stats: {
        Row: {
          barber_id: string | null;
          service_id: string | null;
          sample_size: number | null;
          avg_minutes: number | null;
          p50_minutes: number | null;
          p80_minutes: number | null;
          p90_minutes: number | null;
        };
        Insert: {
          barber_id?: string | null;
          service_id?: string | null;
          sample_size?: number | null;
          avg_minutes?: number | null;
          p50_minutes?: number | null;
          p80_minutes?: number | null;
          p90_minutes?: number | null;
        };
        Update: {
          barber_id?: string | null;
          service_id?: string | null;
          sample_size?: number | null;
          avg_minutes?: number | null;
          p50_minutes?: number | null;
          p80_minutes?: number | null;
          p90_minutes?: number | null;
        };
        Relationships: [];
      };
      service_duration_history: {
        Row: {
          barber_id: string | null;
          service_id: string | null;
          day_of_week: number | null;
          hour_of_day: number | null;
          duration_minutes: number | null;
        };
        Insert: {
          barber_id?: string | null;
          service_id?: string | null;
          day_of_week?: number | null;
          hour_of_day?: number | null;
          duration_minutes?: number | null;
        };
        Update: {
          barber_id?: string | null;
          service_id?: string | null;
          day_of_week?: number | null;
          hour_of_day?: number | null;
          duration_minutes?: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_process_whatsapp_inbound_test: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      admin_queue_action: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      admin_update_business_modules: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      create_business_onboarding: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      cash_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      check_in_booking: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      check_user_is_business_staff: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      clear_must_change_password: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      checkout_transaction: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      close_cashier_session: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      create_duration_booking: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      create_product_sale: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      date_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      default_business_id: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      float4_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      float8_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bit_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bit_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bit_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bit_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bit_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bit_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bool_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bool_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bool_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bool_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bool_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bool_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bool_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bpchar_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bpchar_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bytea_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bytea_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bytea_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bytea_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bytea_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_bytea_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_cash_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_cash_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_cash_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_cash_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_cash_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_cash_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_cash_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_cash_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_date_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_date_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_date_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_date_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_date_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_date_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_date_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_date_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_decompress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_enum_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_enum_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_enum_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_enum_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_enum_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_enum_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_enum_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float4_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float4_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float4_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float4_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float4_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float4_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float4_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float4_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float8_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float8_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float8_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float8_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float8_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float8_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float8_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_float8_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_inet_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_inet_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_inet_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_inet_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_inet_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_inet_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int2_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int2_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int2_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int2_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int2_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int2_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int2_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int2_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int4_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int4_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int4_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int4_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int4_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int4_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int4_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int4_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int8_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int8_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int8_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int8_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int8_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int8_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int8_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_int8_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_intv_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_intv_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_intv_decompress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_intv_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_intv_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_intv_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_intv_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_intv_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_intv_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad8_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad8_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad8_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad8_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad8_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad8_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad8_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_macad_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_numeric_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_numeric_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_numeric_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_numeric_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_numeric_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_numeric_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_oid_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_oid_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_oid_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_oid_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_oid_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_oid_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_oid_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_oid_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_text_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_text_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_text_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_text_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_text_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_text_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_time_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_time_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_time_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_time_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_time_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_time_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_time_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_time_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_timetz_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_timetz_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_ts_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_ts_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_ts_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_ts_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_ts_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_ts_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_ts_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_ts_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_tstz_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_tstz_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_tstz_distance: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_uuid_compress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_uuid_consistent: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_uuid_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_uuid_penalty: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_uuid_picksplit: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_uuid_same: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_uuid_union: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_var_decompress: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbt_var_fetch: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey16_in: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey16_out: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey2_in: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey2_out: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey32_in: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey32_out: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey4_in: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey4_out: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey8_in: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey8_out: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey_var_in: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      gbtreekey_var_out: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      get_active_cashier_session: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      get_business_context: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      get_must_change_password: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      get_enabled_modules: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      get_queue_ticket_status: {
        Args: { p_public_token: string };
        Returns: {
          queue_number: number;
          status: string;
          position: number;
          service_name_en: string | null;
          service_name_ar: string | null;
          service_display_name: string | null;
          barber_name_en: string | null;
          barber_name_ar: string | null;
          barber_display_name: string | null;
          estimated_wait_min: number | null;
          estimated_wait_max: number | null;
          estimated_start_time: string | null;
          prediction_confidence: string | null;
        }[];
      };
      get_unavailable_booking_ranges: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      get_unavailable_booking_slots: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      get_user_role: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      handle_updated_at: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      has_role: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      int2_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      int4_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      int8_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      interval_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      join_queue: {
        Args: {
          p_service_id: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_mode?: string;
          p_barber_id?: string;
          p_language?: string;
          p_notes?: string;
        };
        Returns: {
          public_token: string;
          queue_number: number;
          status: string;
          barber_name_en: string | null;
          barber_name_ar: string | null;
          barber_display_name: string | null;
          service_name_en: string | null;
          service_name_ar: string | null;
          service_display_name: string | null;
          estimated_wait_min: number | null;
          estimated_wait_max: number | null;
          estimated_start_time: string | null;
          prediction_confidence: string | null;
        }[];
      };
      oid_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      open_cashier_session: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      preview_whatsapp_confirm_message: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      recalculate_queue_estimates: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      refund_checkout_transaction: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      staff_queue_action: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      time_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      ts_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      tstz_dist: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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

export type TablesInsert<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I } ? I : never;

export type TablesUpdate<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U } ? U : never;

export type Enums<EnumName extends string> = never;
