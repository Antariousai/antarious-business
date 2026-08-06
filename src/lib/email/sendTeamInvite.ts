import { createAdminClient } from '@/lib/supabase/admin'

function appBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

export function teamInviteAcceptUrl(token: string) {
  return `${appBaseUrl()}/api/team/invites/accept?token=${encodeURIComponent(token)}`
}

export type SendTeamInviteResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; skipped?: boolean }

/**
 * Sends the Auth “Invite user” email via Supabase SMTP (e.g. Resend).
 * Still creates/uses the app `team_invitations` token for org + role binding.
 *
 * If the email already has an Auth account, Supabase won’t send an invite —
 * the invite row is still saved so owners can copy the accept link.
 */
export async function sendTeamInviteEmail(input: {
  to: string
  businessName: string
  inviterName: string
  role: string
  token: string
}): Promise<SendTeamInviteResult> {
  const acceptUrl = teamInviteAcceptUrl(input.token)
  const roleLabel = input.role.charAt(0).toUpperCase() + input.role.slice(1)

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.inviteUserByEmail(input.to, {
      redirectTo: acceptUrl,
      data: {
        team_invite_token: input.token,
        invited_business_name: input.businessName,
        invited_by_name: input.inviterName,
        invited_role: roleLabel,
      },
    })

    if (error) {
      const msg = error.message || 'Failed to send invite email'
      const alreadyRegistered =
        /already\s+(been\s+)?registered|already\s+exists|user\s+already/i.test(msg)

      if (alreadyRegistered) {
        return {
          ok: false,
          skipped: true,
          error:
            'That email already has an Antarious account — copy the invite link and share it with them.',
        }
      }

      return { ok: false, error: msg }
    }

    return { ok: true, id: data.user?.id }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to send invite email',
    }
  }
}
