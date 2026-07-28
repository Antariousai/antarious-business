/**
 * Minimal Database types so the app typechecks before `supabase gen types`.
 * Replace with generated types once the project is linked.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PlanTier = 'starter' | 'growth' | 'scale'
export type OrgRole = 'owner' | 'editor' | 'viewer'
export type ChannelStatus = 'connected' | 'disconnected'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
        }
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: OrgRole
          created_at: string
        }
        Insert: {
          organization_id: string
          user_id: string
          role?: OrgRole
        }
        Update: Partial<Database['public']['Tables']['organization_members']['Insert']>
      }
      business_profiles: {
        Row: {
          id: string
          organization_id: string
          business_name: string
          industry: string | null
          customers: string | null
          business_type: string | null
          audience_serve: string | null
          team_size: string | null
          onboarded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          organization_id: string
          business_name?: string
          industry?: string | null
          customers?: string | null
          business_type?: string | null
          audience_serve?: string | null
          team_size?: string | null
          onboarded?: boolean
        }
        Update: Partial<Database['public']['Tables']['business_profiles']['Insert']>
      }
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          plan_tier: PlanTier
          status: string
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          organization_id: string
          plan_tier?: PlanTier
          status?: string
        }
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      ai_credit_ledger: {
        Row: {
          id: string
          organization_id: string
          delta: number
          reason: string
          ref_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          organization_id: string
          delta: number
          reason: string
          ref_id?: string | null
          created_by?: string | null
        }
        Update: never
      }
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: Record<string, never>
    Functions: {
      is_org_member: {
        Args: { org: string }
        Returns: boolean
      }
      org_role: {
        Args: { org: string }
        Returns: string
      }
      credit_balance: {
        Args: { org: string }
        Returns: number
      }
    }
    Enums: {
      plan_tier: PlanTier
      org_role: OrgRole
    }
  }
}
