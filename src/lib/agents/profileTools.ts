import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyBusinessProfilePatch } from '@/lib/org/updateBusinessProfile'

const GOAL_IDS = ['customers', 'engagement', 'leads', 'replies', 'money'] as const
const PLATFORM_IDS = [
  'Facebook',
  'Messenger',
  'WhatsApp',
  'Instagram',
  'LinkedIn',
] as const

/**
 * Freya tools to correct onboarding / Settings answers from chat.
 * Writes go through the same DB helpers as PATCH /api/me.
 */
export function profileEditorTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  return {
    get_business_profile: tool({
      description:
        'Read the saved business profile (name, industry, who they serve, goals, channels, team size). Use before correcting a detail so you know what is stored.',
      inputSchema: z.object({}),
      execute: async () => {
        const [
          { data: bp },
          { data: profile },
          { data: goals },
          { data: channels },
          { data: sub },
        ] = await Promise.all([
          supabase
            .from('business_profiles')
            .select(
              'business_name, industry, customers, business_type, audience_serve, team_size, onboarded',
            )
            .eq('organization_id', organizationId)
            .maybeSingle(),
          supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
          supabase.from('business_goals').select('goal_id').eq('organization_id', organizationId),
          supabase
            .from('channel_preferences')
            .select('platform')
            .eq('organization_id', organizationId),
          supabase
            .from('subscriptions')
            .select('plan_tier')
            .eq('organization_id', organizationId)
            .maybeSingle(),
        ])
        return {
          ok: true as const,
          profile: {
            ownerName: profile?.full_name ?? null,
            businessName: bp?.business_name ?? null,
            industry: bp?.industry ?? null,
            customers: bp?.customers ?? null,
            businessType: bp?.business_type ?? null,
            audienceServe: bp?.audience_serve ?? null,
            teamSize: bp?.team_size ?? null,
            goals: (goals ?? []).map((g) => g.goal_id),
            platforms: (channels ?? []).map((c) => c.platform),
            planTier: sub?.plan_tier ?? null,
            onboarded: Boolean(bp?.onboarded),
          },
        }
      },
    }),

    update_business_profile: tool({
      description:
        'Update business profile fields the owner set during onboarding or Settings. Use when they mistyped the business name, industry, who they serve, their own name, team size, goals, or preferred channels. Only send fields they asked to change. Saves immediately to the database (no approval needed).',
      inputSchema: z.object({
        ownerName: z.string().optional().describe('Owner’s display name'),
        businessName: z.string().optional().describe('Business / shop name'),
        industry: z.string().optional().describe('Profession or industry in plain words'),
        customers: z.string().optional().describe('Who they serve, in plain words'),
        businessType: z.string().optional().describe('Optional chip-style business type label'),
        audienceServe: z
          .enum(['customers', 'clients', 'both'])
          .optional()
          .describe('customers / clients / both'),
        teamSize: z.enum(['solo', 'few', 'bigger']).optional(),
        goals: z
          .array(z.enum(GOAL_IDS))
          .optional()
          .describe('Replace goals with this full list when they change goals'),
        platforms: z
          .array(z.enum(PLATFORM_IDS))
          .optional()
          .describe('Replace preferred channels with this full list'),
      }),
      execute: async (input) => {
        const hasAny =
          input.ownerName != null ||
          input.businessName != null ||
          input.industry != null ||
          input.customers != null ||
          input.businessType != null ||
          input.audienceServe != null ||
          input.teamSize != null ||
          input.goals != null ||
          input.platforms != null
        if (!hasAny) {
          return { ok: false as const, error: 'No fields to update' }
        }

        try {
          const result = await applyBusinessProfilePatch(supabase, {
            organizationId,
            userId,
            patch: {
              ownerName: input.ownerName,
              businessName: input.businessName,
              industry: input.industry,
              customers: input.customers,
              businessType: input.businessType,
              audienceServe: input.audienceServe,
              teamSize: input.teamSize,
              goals: input.goals,
              platforms: input.platforms,
            },
          })
          return {
            ...result,
            message: `Updated ${result.updated.join(', ')}. Changes are saved.`,
            path: '/app/settings',
          }
        } catch (err) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : 'Could not update profile',
          }
        }
      },
    }),
  }
}
