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
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      customer_wallet_installments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          paid: boolean
          paid_at: string | null
          paid_by: string | null
          paid_by_email: string | null
          purchase_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          due_date: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          paid_by?: string | null
          paid_by_email?: string | null
          purchase_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          paid_by?: string | null
          paid_by_email?: string | null
          purchase_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_wallet_installments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "customer_wallet_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_wallet_purchases: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_email: string | null
          customer_id: string
          customer_name: string | null
          deduct_stock: boolean
          description: string | null
          id: string
          items: Json
          notes: string | null
          purchase_date: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          customer_id: string
          customer_name?: string | null
          deduct_stock?: boolean
          description?: string | null
          id?: string
          items?: Json
          notes?: string | null
          purchase_date?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          customer_id?: string
          customer_name?: string | null
          deduct_stock?: boolean
          description?: string | null
          id?: string
          items?: Json
          notes?: string | null
          purchase_date?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          bairro: string | null
          city: string | null
          cpf: string
          cpf_formatted: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          email: string | null
          id: string
          is_collaborator: boolean
          name: string
          notes: string | null
          origin: string | null
          phone: string | null
          state: string | null
          status: string
          status_cliente: string
          ultima_visita: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          bairro?: string | null
          city?: string | null
          cpf: string
          cpf_formatted?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          email?: string | null
          id?: string
          is_collaborator?: boolean
          name: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          status_cliente?: string
          ultima_visita?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          bairro?: string | null
          city?: string | null
          cpf?: string
          cpf_formatted?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          email?: string | null
          id?: string
          is_collaborator?: boolean
          name?: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          status_cliente?: string
          ultima_visita?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          address: string | null
          amount: number
          city: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          customer_cpf: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          os_number: number | null
          payment_method: string | null
          product: string | null
          service_order_id: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          amount?: number
          city?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          os_number?: number | null
          payment_method?: string | null
          product?: string | null
          service_order_id?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          amount?: number
          city?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          os_number?: number | null
          payment_method?: string | null
          product?: string | null
          service_order_id?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          module_key: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          module_key: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          module_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["key"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          photo_url: string | null
          role: Database["public"]["Enums"]["employee_role"]
          sector: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          photo_url?: string | null
          role?: Database["public"]["Enums"]["employee_role"]
          sector?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          role?: Database["public"]["Enums"]["employee_role"]
          sector?: string | null
        }
        Relationships: []
      }
      lembretes_whatsapp: {
        Row: {
          agendado_em: string | null
          cliente_id: string
          created_at: string
          data_programada: string
          enviado_em: string | null
          erro_envio: string | null
          id: string
          manutencao_id: string | null
          mensagem: string | null
          respondido_em: string | null
          status: Database["public"]["Enums"]["crm_lembrete_status"]
          tentativa_envio: number
          tipo_lembrete: Database["public"]["Enums"]["crm_lembrete_tipo"]
          updated_at: string
        }
        Insert: {
          agendado_em?: string | null
          cliente_id: string
          created_at?: string
          data_programada: string
          enviado_em?: string | null
          erro_envio?: string | null
          id?: string
          manutencao_id?: string | null
          mensagem?: string | null
          respondido_em?: string | null
          status?: Database["public"]["Enums"]["crm_lembrete_status"]
          tentativa_envio?: number
          tipo_lembrete: Database["public"]["Enums"]["crm_lembrete_tipo"]
          updated_at?: string
        }
        Update: {
          agendado_em?: string | null
          cliente_id?: string
          created_at?: string
          data_programada?: string
          enviado_em?: string | null
          erro_envio?: string | null
          id?: string
          manutencao_id?: string | null
          mensagem?: string | null
          respondido_em?: string | null
          status?: Database["public"]["Enums"]["crm_lembrete_status"]
          tentativa_envio?: number
          tipo_lembrete?: Database["public"]["Enums"]["crm_lembrete_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_whatsapp_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_whatsapp_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          data_atendimento: string
          equipamento: string | null
          id: string
          marca: string | null
          modelo: string | null
          observacoes_internas: string | null
          problema_relatado: string | null
          responsavel_atendimento: string | null
          servico_realizado: string | null
          solucao_aplicada: string | null
          updated_at: string
          valor_cobrado: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          data_atendimento?: string
          equipamento?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          observacoes_internas?: string | null
          problema_relatado?: string | null
          responsavel_atendimento?: string | null
          servico_realizado?: string | null
          solucao_aplicada?: string | null
          updated_at?: string
          valor_cobrado?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          data_atendimento?: string
          equipamento?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          observacoes_internas?: string | null
          problema_relatado?: string | null
          responsavel_atendimento?: string | null
          servico_realizado?: string | null
          solucao_aplicada?: string | null
          updated_at?: string
          valor_cobrado?: number
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_whatsapp: {
        Row: {
          canal: string
          cliente_id: string
          created_at: string
          enviado_em: string
          erro_envio: string | null
          id: string
          lembrete_id: string | null
          mensagem: string
          resposta_cliente: string | null
          status_envio: string
          telefone: string | null
          tipo_mensagem: string
        }
        Insert: {
          canal?: string
          cliente_id: string
          created_at?: string
          enviado_em?: string
          erro_envio?: string | null
          id?: string
          lembrete_id?: string | null
          mensagem: string
          resposta_cliente?: string | null
          status_envio?: string
          telefone?: string | null
          tipo_mensagem?: string
        }
        Update: {
          canal?: string
          cliente_id?: string
          created_at?: string
          enviado_em?: string
          erro_envio?: string | null
          id?: string
          lembrete_id?: string | null
          mensagem?: string
          resposta_cliente?: string | null
          status_envio?: string
          telefone?: string | null
          tipo_mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_whatsapp_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_whatsapp_lembrete_id_fkey"
            columns: ["lembrete_id"]
            isOneToOne: false
            referencedRelation: "lembretes_whatsapp"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_cost_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_email: string | null
          id: string
          new_cost: number
          previous_cost: number
          product_id: string
          purchase_order_id: string | null
          purchase_order_number: number | null
          supplier_id: string | null
          supplier_name: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          id?: string
          new_cost?: number
          previous_cost?: number
          product_id: string
          purchase_order_id?: string | null
          purchase_order_number?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          id?: string
          new_cost?: number
          previous_cost?: number
          product_id?: string
          purchase_order_id?: string | null
          purchase_order_number?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_evaluation_history: {
        Row: {
          action: string
          created_at: string
          evaluation_id: string
          from_status: Database["public"]["Enums"]["evaluation_status"] | null
          id: string
          notes: string | null
          to_status: Database["public"]["Enums"]["evaluation_status"] | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          evaluation_id: string
          from_status?: Database["public"]["Enums"]["evaluation_status"] | null
          id?: string
          notes?: string | null
          to_status?: Database["public"]["Enums"]["evaluation_status"] | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          evaluation_id?: string
          from_status?: Database["public"]["Enums"]["evaluation_status"] | null
          id?: string
          notes?: string | null
          to_status?: Database["public"]["Enums"]["evaluation_status"] | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_evaluations: {
        Row: {
          accessories: string | null
          apparent_defects: string | null
          audio_test: string | null
          battery_status: string | null
          brand: string | null
          camera_test: string | null
          case_status: string | null
          category: string | null
          charging_test: string | null
          checklist: Json
          client_reported_defects: string | null
          client_response: string | null
          color: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          customer_cpf: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          entry_date: string
          estimated_market_value: number
          estimated_repair_cost: number
          evaluation_number: number
          final_value: number
          has_box: boolean
          has_charger: boolean
          id: string
          keyboard_test: string | null
          max_purchase_value: number
          model: string | null
          offered_value: number
          payment_method: string | null
          payment_receipt_url: string | null
          photos: Json
          ports_test: string | null
          proposal_by_id: string | null
          proposal_by_name: string | null
          proposal_sent_at: string | null
          received_by_id: string | null
          received_by_name: string | null
          screen_status: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["evaluation_status"]
          status_changed_at: string
          store_unit: string | null
          technical_notes: string | null
          technician_id: string | null
          technician_name: string | null
          updated_at: string
          visual_condition: string | null
        }
        Insert: {
          accessories?: string | null
          apparent_defects?: string | null
          audio_test?: string | null
          battery_status?: string | null
          brand?: string | null
          camera_test?: string | null
          case_status?: string | null
          category?: string | null
          charging_test?: string | null
          checklist?: Json
          client_reported_defects?: string | null
          client_response?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name: string
          customer_notes?: string | null
          customer_phone?: string | null
          entry_date?: string
          estimated_market_value?: number
          estimated_repair_cost?: number
          evaluation_number?: number
          final_value?: number
          has_box?: boolean
          has_charger?: boolean
          id?: string
          keyboard_test?: string | null
          max_purchase_value?: number
          model?: string | null
          offered_value?: number
          payment_method?: string | null
          payment_receipt_url?: string | null
          photos?: Json
          ports_test?: string | null
          proposal_by_id?: string | null
          proposal_by_name?: string | null
          proposal_sent_at?: string | null
          received_by_id?: string | null
          received_by_name?: string | null
          screen_status?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          status_changed_at?: string
          store_unit?: string | null
          technical_notes?: string | null
          technician_id?: string | null
          technician_name?: string | null
          updated_at?: string
          visual_condition?: string | null
        }
        Update: {
          accessories?: string | null
          apparent_defects?: string | null
          audio_test?: string | null
          battery_status?: string | null
          brand?: string | null
          camera_test?: string | null
          case_status?: string | null
          category?: string | null
          charging_test?: string | null
          checklist?: Json
          client_reported_defects?: string | null
          client_response?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string | null
          entry_date?: string
          estimated_market_value?: number
          estimated_repair_cost?: number
          evaluation_number?: number
          final_value?: number
          has_box?: boolean
          has_charger?: boolean
          id?: string
          keyboard_test?: string | null
          max_purchase_value?: number
          model?: string | null
          offered_value?: number
          payment_method?: string | null
          payment_receipt_url?: string | null
          photos?: Json
          ports_test?: string | null
          proposal_by_id?: string | null
          proposal_by_name?: string | null
          proposal_sent_at?: string | null
          received_by_id?: string | null
          received_by_name?: string | null
          screen_status?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          status_changed_at?: string
          store_unit?: string | null
          technical_notes?: string | null
          technician_id?: string | null
          technician_name?: string | null
          updated_at?: string
          visual_condition?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          cost_price: number
          created_at: string
          created_by: string | null
          created_by_email: string | null
          description: string | null
          id: string
          last_purchase_date: string | null
          location: string | null
          min_stock: number
          model: string | null
          name: string
          notes: string | null
          sale_price: number
          sale_price_table2: number
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock_qty: number
          supplier: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string | null
          id?: string
          last_purchase_date?: string | null
          location?: string | null
          min_stock?: number
          model?: string | null
          name: string
          notes?: string | null
          sale_price?: number
          sale_price_table2?: number
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_qty?: number
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string | null
          id?: string
          last_purchase_date?: string | null
          location?: string | null
          min_stock?: number
          model?: string | null
          name?: string
          notes?: string | null
          sale_price?: number
          sale_price_table2?: number
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_qty?: number
          supplier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          current_cost: number
          id: string
          new_cost: number
          product_id: string | null
          product_name: string | null
          purchase_order_id: string
          quantity: number
          total_cost: number
        }
        Insert: {
          created_at?: string
          current_cost?: number
          id?: string
          new_cost?: number
          product_id?: string | null
          product_name?: string | null
          purchase_order_id: string
          quantity?: number
          total_cost?: number
        }
        Update: {
          created_at?: string
          current_cost?: number
          id?: string
          new_cost?: number
          product_id?: string | null
          product_name?: string | null
          purchase_order_id?: string
          quantity?: number
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_email: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: number
          payment_method: string | null
          settled_at: string | null
          settled_by: string | null
          settled_by_email: string | null
          status: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number
          total_items: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: number
          payment_method?: string | null
          settled_at?: string | null
          settled_by?: string | null
          settled_by_email?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number
          total_items?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: number
          payment_method?: string | null
          settled_at?: string | null
          settled_by?: string | null
          settled_by_email?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          delivery_time: string | null
          id: string
          model: string | null
          notes: string | null
          payment_terms: string | null
          product_link: string | null
          product_name: string
          purchase_authorized: boolean
          purchase_authorized_at: string | null
          purchase_authorized_by: string | null
          purchase_authorized_by_email: string | null
          quantity: number
          quoted_price: number
          status: string
          supplier_contact: string | null
          supplier_name: string | null
          supplier_phone: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          delivery_time?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          payment_terms?: string | null
          product_link?: string | null
          product_name: string
          purchase_authorized?: boolean
          purchase_authorized_at?: string | null
          purchase_authorized_by?: string | null
          purchase_authorized_by_email?: string | null
          quantity?: number
          quoted_price?: number
          status?: string
          supplier_contact?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          updated_at?: string
          urgency?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          delivery_time?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          payment_terms?: string | null
          product_link?: string | null
          product_name?: string
          purchase_authorized?: boolean
          purchase_authorized_at?: string | null
          purchase_authorized_by?: string | null
          purchase_authorized_by_email?: string | null
          quantity?: number
          quoted_price?: number
          status?: string
          supplier_contact?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          commission: number
          created_at: string
          customer_cpf: string | null
          customer_id: string | null
          customer_name: string | null
          employee_id: string | null
          employee_name: string
          id: string
          notes: string | null
          product: string | null
          product_id: string | null
          profit: number
          quantity: number
          sale_date: string
          type: Database["public"]["Enums"]["sale_type"]
        }
        Insert: {
          amount?: number
          commission?: number
          created_at?: string
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string | null
          employee_id?: string | null
          employee_name: string
          id?: string
          notes?: string | null
          product?: string | null
          product_id?: string | null
          profit?: number
          quantity?: number
          sale_date?: string
          type?: Database["public"]["Enums"]["sale_type"]
        }
        Update: {
          amount?: number
          commission?: number
          created_at?: string
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string | null
          employee_id?: string | null
          employee_name?: string
          id?: string
          notes?: string | null
          product?: string | null
          product_id?: string | null
          profit?: number
          quantity?: number
          sale_date?: string
          type?: Database["public"]["Enums"]["sale_type"]
        }
        Relationships: [
          {
            foreignKeyName: "sales_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_history: {
        Row: {
          action: string
          created_at: string
          from_status: Database["public"]["Enums"]["os_status"] | null
          id: string
          notes: string | null
          service_order_id: string
          to_status: Database["public"]["Enums"]["os_status"] | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["os_status"] | null
          id?: string
          notes?: string | null
          service_order_id: string
          to_status?: Database["public"]["Enums"]["os_status"] | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["os_status"] | null
          id?: string
          notes?: string | null
          service_order_id?: string
          to_status?: Database["public"]["Enums"]["os_status"] | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_history_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          amount_paid: number
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          deadline_date: string | null
          defect: string | null
          details: Json
          discount: number
          entry_date: string
          finalized_at: string | null
          finalized_by: string | null
          finalized_by_email: string | null
          id: string
          os_number: number
          parts_cost: number
          payment_method: string | null
          product: string | null
          service_type: string | null
          service_value: number
          status: Database["public"]["Enums"]["os_status"]
          technician_id: string | null
          technician_name: string | null
          technician_notes: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          deadline_date?: string | null
          defect?: string | null
          details?: Json
          discount?: number
          entry_date?: string
          finalized_at?: string | null
          finalized_by?: string | null
          finalized_by_email?: string | null
          id?: string
          os_number?: number
          parts_cost?: number
          payment_method?: string | null
          product?: string | null
          service_type?: string | null
          service_value?: number
          status?: Database["public"]["Enums"]["os_status"]
          technician_id?: string | null
          technician_name?: string | null
          technician_notes?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          deadline_date?: string | null
          defect?: string | null
          details?: Json
          discount?: number
          entry_date?: string
          finalized_at?: string | null
          finalized_by?: string | null
          finalized_by_email?: string | null
          id?: string
          os_number?: number
          parts_cost?: number
          payment_method?: string | null
          product?: string | null
          service_type?: string | null
          service_value?: number
          status?: Database["public"]["Enums"]["os_status"]
          technician_id?: string | null
          technician_name?: string | null
          technician_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_name: string
          crm_auto_send: boolean
          crm_default_hour: string
          crm_official_number: string | null
          crm_signature: string | null
          crm_template_1y: string | null
          crm_template_30: string | null
          crm_template_60: string | null
          crm_template_6m: string | null
          crm_template_90: string | null
          crm_webhook_url: string | null
          id: number
          logo_url: string | null
          monthly_goal: number
          primary_color: string
          tv_sounds: boolean
          updated_at: string
        }
        Insert: {
          company_name?: string
          crm_auto_send?: boolean
          crm_default_hour?: string
          crm_official_number?: string | null
          crm_signature?: string | null
          crm_template_1y?: string | null
          crm_template_30?: string | null
          crm_template_60?: string | null
          crm_template_6m?: string | null
          crm_template_90?: string | null
          crm_webhook_url?: string | null
          id?: number
          logo_url?: string | null
          monthly_goal?: number
          primary_color?: string
          tv_sounds?: boolean
          updated_at?: string
        }
        Update: {
          company_name?: string
          crm_auto_send?: boolean
          crm_default_hour?: string
          crm_official_number?: string | null
          crm_signature?: string | null
          crm_template_1y?: string | null
          crm_template_30?: string | null
          crm_template_60?: string | null
          crm_template_6m?: string | null
          crm_template_90?: string | null
          crm_webhook_url?: string | null
          id?: number
          logo_url?: string | null
          monthly_goal?: number
          primary_color?: string
          tv_sounds?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          movement_date: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_qty: number | null
          notes: string | null
          previous_qty: number | null
          product_id: string
          quantity: number
          reason: string | null
          responsible: string | null
          supplier: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          movement_date?: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_qty?: number | null
          notes?: string | null
          previous_qty?: number | null
          product_id: string
          quantity: number
          reason?: string | null
          responsible?: string | null
          supplier?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          movement_date?: string | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          new_qty?: number | null
          notes?: string | null
          previous_qty?: number | null
          product_id?: string
          quantity?: number
          reason?: string | null
          responsible?: string | null
          supplier?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      system_modules: {
        Row: {
          created_at: string
          icon: string | null
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          description: string | null
          due_date: string | null
          employee_id: string | null
          employee_name: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      apply_stock_movement: {
        Args: {
          _cost?: number
          _movement_date?: string
          _movement_type: string
          _notes?: string
          _product_id: string
          _quantity: number
          _reason?: string
          _responsible?: string
          _supplier?: string
        }
        Returns: string
      }
      crm_render_template: {
        Args: {
          _assinatura: string
          _empresa: string
          _equipamento: string
          _nome: string
          _tpl: string
        }
        Returns: string
      }
      current_employee_id: { Args: never; Returns: string }
      get_crm_integration: {
        Args: never
        Returns: {
          crm_official_number: string
          crm_webhook_url: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      settle_purchase_order: { Args: { _po_id: string }; Returns: undefined }
      update_crm_integration: {
        Args: { _official_number: string; _webhook_url: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "funcionario"
      crm_lembrete_status:
        | "aguardando"
        | "pronto_para_envio"
        | "enviado"
        | "respondeu"
        | "agendou"
        | "nao_respondeu"
        | "erro"
        | "cancelado"
      crm_lembrete_tipo:
        | "30_dias"
        | "60_dias"
        | "90_dias"
        | "6_meses"
        | "1_ano"
        | "manual"
      employee_role: "vendedor" | "tecnico" | "gestor" | "financeiro" | "outro"
      evaluation_status:
        | "recebido"
        | "aguardando_avaliacao"
        | "em_avaliacao"
        | "aguardando_aprovacao_cliente"
        | "aprovado_compra"
        | "recusado_loja"
        | "cliente_recusou"
        | "comprado"
        | "em_manutencao"
        | "pronto_revenda"
        | "vendido"
        | "devolvido"
      os_status:
        | "aberta"
        | "em_analise"
        | "aguardando_peca"
        | "em_manutencao"
        | "finalizada"
        | "entregue"
        | "cancelada"
      product_status: "ativo" | "inativo" | "esgotado"
      purchase_order_status:
        | "em_aberto"
        | "aguardando_pagamento"
        | "pago"
        | "cancelado"
      sale_type: "venda" | "servico" | "lancamento"
      stock_movement_type: "entrada" | "saida" | "ajuste"
      task_priority: "baixa" | "media" | "alta" | "urgente"
      task_status:
        | "a_fazer"
        | "em_andamento"
        | "em_espera"
        | "atrasada"
        | "concluida"
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
      app_role: ["owner", "admin", "funcionario"],
      crm_lembrete_status: [
        "aguardando",
        "pronto_para_envio",
        "enviado",
        "respondeu",
        "agendou",
        "nao_respondeu",
        "erro",
        "cancelado",
      ],
      crm_lembrete_tipo: [
        "30_dias",
        "60_dias",
        "90_dias",
        "6_meses",
        "1_ano",
        "manual",
      ],
      employee_role: ["vendedor", "tecnico", "gestor", "financeiro", "outro"],
      evaluation_status: [
        "recebido",
        "aguardando_avaliacao",
        "em_avaliacao",
        "aguardando_aprovacao_cliente",
        "aprovado_compra",
        "recusado_loja",
        "cliente_recusou",
        "comprado",
        "em_manutencao",
        "pronto_revenda",
        "vendido",
        "devolvido",
      ],
      os_status: [
        "aberta",
        "em_analise",
        "aguardando_peca",
        "em_manutencao",
        "finalizada",
        "entregue",
        "cancelada",
      ],
      product_status: ["ativo", "inativo", "esgotado"],
      purchase_order_status: [
        "em_aberto",
        "aguardando_pagamento",
        "pago",
        "cancelado",
      ],
      sale_type: ["venda", "servico", "lancamento"],
      stock_movement_type: ["entrada", "saida", "ajuste"],
      task_priority: ["baixa", "media", "alta", "urgente"],
      task_status: [
        "a_fazer",
        "em_andamento",
        "em_espera",
        "atrasada",
        "concluida",
      ],
    },
  },
} as const
