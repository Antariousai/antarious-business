import { Resend } from 'resend'

const DEFAULT_FROM = 'Freya <invites@freya.antarious.com>'

function appBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

export function teamInviteAcceptUrl(token: string) {
  return `${appBaseUrl()}/api/team/invites/accept?token=${encodeURIComponent(token)}`
}

export function buildTeamInviteHtml(input: {
  businessName: string
  inviterName: string
  role: string
  acceptUrl: string
}) {
  const { businessName, inviterName, role, acceptUrl } = input
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>You’re invited to ${escapeHtml(businessName)}</title>
</head>
<body style="margin:0;padding:0;background:#eef6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 40px -28px rgba(14,165,233,0.45);">
          <tr>
            <td style="background:linear-gradient(135deg,#0b131e 0%,#0e7490 55%,#0ea5e9 100%);padding:28px;">
              <a href="https://freya.antarious.com" style="text-decoration:none;">
                <img
                  src="https://freya.antarious.com/brand/antarious-logo-light.png"
                  alt="Antarious"
                  width="160"
                  style="display:block;height:36px;width:auto;max-width:180px;border:0;outline:none;"
                />
              </a>
              <h1 style="margin:16px 0 0;font-size:24px;line-height:1.25;font-weight:800;color:#ffffff;">You’re invited</h1>
              <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:rgba(255,255,255,0.85);">Join ${escapeHtml(businessName)} on Antarious.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#475569;">
                <strong style="color:#0f1a28;">${escapeHtml(inviterName)}</strong> invited you to collaborate as
                <strong style="color:#0f1a28;">${escapeHtml(roleLabel)}</strong>.
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#64748b;">
                Open this from the inbox this invite was sent to (work or personal). Sign in or create an account with <em>that same email</em> to accept.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                <tr>
                  <td style="border-radius:999px;background:#0ea5e9;">
                    <a href="${escapeAttr(acceptUrl)}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Accept invite
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;line-height:1.55;color:#94a3b8;">
                Or open this link:<br />
                <a href="${escapeAttr(acceptUrl)}" style="color:#0284c7;word-break:break-all;">${escapeHtml(acceptUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
              <p style="margin:0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                Not expecting this? You can ignore the email.<br />
                © Antarious · freya.antarious.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

export type SendTeamInviteResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; skipped?: boolean }

export async function sendTeamInviteEmail(input: {
  to: string
  businessName: string
  inviterName: string
  role: string
  token: string
}): Promise<SendTeamInviteResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      error: 'RESEND_API_KEY is not set — invite saved; copy the link instead.',
    }
  }

  const from = process.env.RESEND_FROM?.trim() || DEFAULT_FROM
  const acceptUrl = teamInviteAcceptUrl(input.token)
  const html = buildTeamInviteHtml({
    businessName: input.businessName,
    inviterName: input.inviterName,
    role: input.role,
    acceptUrl,
  })

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: `${input.inviterName} invited you to ${input.businessName} on Antarious`,
      html,
    })
    if (error) {
      return { ok: false, error: error.message || 'Failed to send invite email' }
    }
    return { ok: true, id: data?.id }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to send invite email',
    }
  }
}
