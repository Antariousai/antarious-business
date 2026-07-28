import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'customers')

    const resource = new URL(req.url).searchParams.get('resource') || 'deals'

    if (resource === 'contacts') {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ contacts: data ?? [] })
    }

    if (resource === 'companies') {
      const { data, error } = await supabase
        .from('crm_companies')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ companies: data ?? [] })
    }

    if (resource === 'activities') {
      const { data, error } = await supabase
        .from('crm_activities')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ activities: data ?? [] })
    }

    if (resource === 'insights') {
      const { data, error } = await supabase
        .from('crm_insights')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ insights: data ?? [] })
    }

    if (resource === 'all') {
      const [deals, contacts, companies, activities, insights] = await Promise.all([
        supabase
          .from('crm_deals')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('crm_contacts')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('crm_companies')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('crm_activities')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('crm_insights')
          .select('*')
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false }),
      ])
      for (const r of [deals, contacts, companies, activities, insights]) {
        if (r.error) throw r.error
      }
      return Response.json({
        deals: deals.data ?? [],
        contacts: contacts.data ?? [],
        companies: companies.data ?? [],
        activities: activities.data ?? [],
        insights: insights.data ?? [],
      })
    }

    const { data, error } = await supabase
      .from('crm_deals')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return Response.json({ deals: data ?? [] })
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'customers')

    const body = await req.json()
    const resource = body.resource || 'deals'

    if (resource === 'contacts') {
      const { data, error } = await supabase
        .from('crm_contacts')
        .insert({
          organization_id: ctx.organizationId,
          name: String(body.name ?? 'Contact'),
          email: body.email ?? null,
          phone: body.phone ?? null,
          role: body.role ?? null,
          company_id: body.companyId ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ contact: data }, { status: 201 })
    }

    if (resource === 'companies') {
      const { data, error } = await supabase
        .from('crm_companies')
        .insert({
          organization_id: ctx.organizationId,
          name: String(body.name ?? 'Company'),
          industry: body.industry ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ company: data }, { status: 201 })
    }

    if (resource === 'activities') {
      const { data, error } = await supabase
        .from('crm_activities')
        .insert({
          organization_id: ctx.organizationId,
          deal_id: body.dealId ?? null,
          contact_id: body.contactId ?? null,
          kind: body.kind ?? 'task',
          title: String(body.title ?? 'Follow up'),
          due_at: body.dueAt ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ activity: data }, { status: 201 })
    }

    const { data, error } = await supabase
      .from('crm_deals')
      .insert({
        organization_id: ctx.organizationId,
        title: String(body.title ?? 'Deal'),
        stage: body.stage ?? 'qualified',
        value_bdt: body.valueBdt ?? 0,
        next_step: body.nextStep ?? null,
        company_id: body.companyId ?? null,
        contact_id: body.contactId ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return Response.json({ deal: data }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'customers')

    const body = await req.json()
    const resource = body.resource || 'deals'
    const id = String(body.id ?? '')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    if (resource === 'activities') {
      const { data, error } = await supabase
        .from('crm_activities')
        .update({
          completed: body.completed ?? undefined,
          title: body.title ?? undefined,
          due_at: body.dueAt ?? undefined,
        })
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ activity: data })
    }

    if (resource === 'contacts') {
      const patch: Record<string, unknown> = {}
      if (body.name != null) patch.name = body.name
      if (body.email != null) patch.email = body.email
      if (body.phone != null) patch.phone = body.phone
      if (body.role != null) patch.role = body.role
      if (body.companyId != null) patch.company_id = body.companyId
      const { data, error } = await supabase
        .from('crm_contacts')
        .update(patch)
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ contact: data })
    }

    if (resource === 'companies') {
      const patch: Record<string, unknown> = {}
      if (body.name != null) patch.name = body.name
      if (body.industry != null) patch.industry = body.industry
      const { data, error } = await supabase
        .from('crm_companies')
        .update(patch)
        .eq('id', id)
        .eq('organization_id', ctx.organizationId)
        .select('*')
        .single()
      if (error) throw error
      return Response.json({ company: data })
    }

    const patch: Record<string, unknown> = {}
    if (body.title != null) patch.title = body.title
    if (body.stage != null) patch.stage = body.stage
    if (body.valueBdt != null) patch.value_bdt = body.valueBdt
    if (body.nextStep != null) patch.next_step = body.nextStep

    const { data, error } = await supabase
      .from('crm_deals')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return Response.json({ deal: data })
  } catch (err) {
    return jsonError(err)
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    await assertModuleAccess(supabase, ctx.organizationId, 'customers')

    const url = new URL(req.url)
    const body = await req.json().catch(() => ({}))
    const resource = body.resource || url.searchParams.get('resource') || 'deals'
    const id = String(body.id ?? url.searchParams.get('id') ?? '')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const table =
      resource === 'contacts'
        ? 'crm_contacts'
        : resource === 'companies'
          ? 'crm_companies'
          : resource === 'activities'
            ? 'crm_activities'
            : 'crm_deals'

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
    if (error) throw error
    return Response.json({ ok: true, deleted: id, resource })
  } catch (err) {
    return jsonError(err)
  }
}
