import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'

export const runtime = 'nodejs'

/** Link a social contact to an existing CRM contact (manual — no auto-merge). */
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = await req.json()
    const socialContactId = String(body.socialContactId ?? '')
    const crmContactId = body.crmContactId == null ? null : String(body.crmContactId)
    if (!socialContactId) {
      return Response.json({ error: 'socialContactId required' }, { status: 400 })
    }

    if (crmContactId) {
      const { data: crm } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('id', crmContactId)
        .eq('organization_id', ctx.organizationId)
        .maybeSingle()
      if (!crm) return Response.json({ error: 'CRM contact not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('social_contacts')
      .update({ crm_contact_id: crmContactId, updated_at: new Date().toISOString() })
      .eq('id', socialContactId)
      .eq('organization_id', ctx.organizationId)
      .select('id, provider, provider_user_id, username, crm_contact_id')
      .single()
    if (error) throw error

    return Response.json({ contact: data })
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = await req.json()
    const socialContactId = String(body.socialContactId ?? '')
    const name = String(body.name ?? '').trim()
    if (!socialContactId || !name) {
      return Response.json({ error: 'socialContactId and name required' }, { status: 400 })
    }

    const { data: social } = await supabase
      .from('social_contacts')
      .select('*')
      .eq('id', socialContactId)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle()
    if (!social) return Response.json({ error: 'Social contact not found' }, { status: 404 })

    const { data: crm, error: cErr } = await supabase
      .from('crm_contacts')
      .insert({
        organization_id: ctx.organizationId,
        name,
        role: social.username ? `@${social.username}` : `${social.provider} contact`,
      })
      .select('id')
      .single()
    if (cErr) throw cErr

    const { data: updated, error } = await supabase
      .from('social_contacts')
      .update({
        crm_contact_id: crm.id,
        metadata: {
          ...((social.metadata as object) || {}),
          crm_source: `${social.provider}:${social.username || social.provider_user_id}`,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', socialContactId)
      .select('*')
      .single()
    if (error) throw error

    return Response.json({ contact: updated, crmContactId: crm.id }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}
