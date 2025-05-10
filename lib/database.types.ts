export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      raffles: {
        Row: {
          id: string
          title: string | null
          total_numbers: number
          admin_password: string
          created_at: string
        }
        Insert: {
          id?: string
          title?: string | null
          total_numbers: number
          admin_password: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string | null
          total_numbers?: number
          admin_password?: string
          created_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          raffle_id: string
          name: string
          cpf: string
          numbers: number[]
          created_at: string
          payment_id: string | null
        }
        Insert: {
          id?: string
          raffle_id: string
          name: string
          cpf: string
          numbers: number[]
          created_at?: string
          payment_id?: string | null
        }
        Update: {
          id?: string
          raffle_id?: string
          name?: string
          cpf?: string
          numbers?: number[]
          created_at?: string
          payment_id?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          raffle_id: string
          purchase_id: string | null
          payment_intent_id: string
          amount: number
          currency: string
          status: string
          customer_email: string | null
          customer_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          raffle_id: string
          purchase_id?: string | null
          payment_intent_id: string
          amount: number
          currency?: string
          status: string
          customer_email?: string | null
          customer_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          raffle_id?: string
          purchase_id?: string | null
          payment_intent_id?: string
          amount?: number
          currency?: string
          status?: string
          customer_email?: string | null
          customer_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      winners: {
        Row: {
          id: string
          raffle_id: string
          purchase_id: string | null
          winner_name: string
          winner_cpf: string
          winning_number: number
          drawn_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          raffle_id: string
          purchase_id?: string | null
          winner_name: string
          winner_cpf: string
          winning_number: number
          drawn_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          raffle_id?: string
          purchase_id?: string | null
          winner_name?: string
          winner_cpf?: string
          winning_number?: number
          drawn_at?: string
          notes?: string | null
        }
      }
      auth_attempts: {
        Row: {
          id: string
          ip_address: string
          raffle_id: string
          attempt_count: number
          last_attempt: string
          created_at: string
        }
        Insert: {
          id?: string
          ip_address: string
          raffle_id: string
          attempt_count?: number
          last_attempt?: string
          created_at?: string
        }
        Update: {
          id?: string
          ip_address?: string
          raffle_id?: string
          attempt_count?: number
          last_attempt?: string
          created_at?: string
        }
      }
    }
  }
}
