import { createClient } from '@/lib/supabase/server'
import { requireOrgContext, jsonError } from '@/lib/org/context'
import { assertModuleAccess } from '@/lib/entitlements'
import {
  DEFAULT_CRM_STAGES,
  DEFAULT_LEAD_STAGES,
  slugStageKey,
  type FunnelKind,
} from '@/data/funnelStages'

export const runtime = 'nodejs'

type Row = {
  id: string
  funnel: string
  key: string
  label: string
  position: number
  color: string
  probability: number | null
  is_closed: boolean
  is_default: boolean
}

function parseFunnel(raw: unknown): FunnelKind | null {
  return raw === 'leads' || raw === 'crm' ? raw : null
}

function moduleFor(funnel: FunnelKind) {
  return funnel === 'leads' ? 'leads' : 'customers'
}

function mapRow(row: Row) {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    position: row.position,
    color: row.color,
    probability: row.probability ?? undefined,
    isClosed: row.is_closed,
    isDefault: row.is_default,
  }
}

async function ensureDefaults(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  funnel: FunnelKind,
) {
  const defaults = funnel === 'leads' ? DEFAULT_LEAD_STAGES : DEFAULT_CRM_STAGES
  const rows = defaults.map((s) => ({
    organization_id: organizationId,
    funnel,
    key: s.key,
    label: s.label,
    position: s.position,
    color: s.color,
    probability: s.probability ?? null,
    is_closed: Boolean(s.isClosed),
    is_default: Boolean(s.isDefault),
  }))
  await supabase.from('funnel_stages').upsert(rows, {
    onConflict: 'organization_id,funnel,key',
    ignoreDuplicates: true,
  })
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const url = new URL(req.url)
    const funnel = parseFunnel(url.searchParams.get('funnel'))
    if (!funnel) {
      return Response.json({ error: 'funnel=leads|crm required' }, { status: 400 })
    }
    await assertModuleAccess(supabase, ctx.organizationId, moduleFor(funnel))

    let { data, error } = await supabase
      .from('funnel_stages')
      .select('id, funnel, key, label, position, color, probability, is_closed, is_default')
      .eq('organization_id', ctx.organizationId)
      .eq('funnel', funnel)
      .order('position', { ascending: true })

    if (error) throw error

    if (!data?.length) {
      await ensureDefaults(supabase, ctx.organizationId, funnel)
      const retry = await supabase
        .from('funnel_stages')
        .select('id, funnel, key, label, position, color, probability, is_closed, is_default')
        .eq('organization_id', ctx.organizationId)
        .eq('funnel', funnel)
        .order('position', { ascending: true })
      if (retry.error) throw retry.error
      data = retry.data
    }

    return Response.json({ stages: (data ?? []).map((r) => mapRow(r as Row)) })
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = await req.json()
    const funnel = parseFunnel(body.funnel)
    const label = String(body.label ?? '').trim()
    if (!funnel || !label) {
      return Response.json({ error: 'funnel and label required' }, { status: 400 })
    }
    await assertModuleAccess(supabase, ctx.organizationId, moduleFor(funnel))
    await ensureDefaults(supabase, ctx.organizationId, funnel)

    const { data: existing } = await supabase
      .from('funnel_stages')
      .select('key, position, is_closed')
      .eq('organization_id', ctx.organizationId)
      .eq('funnel', funnel)
      .order('position', { ascending: true })

    let key = slugStageKey(String(body.key ?? label))
    const used = new Set((existing ?? []).map((r) => r.key))
    if (used.has(key)) {
      let i = 2
      while (used.has(`${key}_${i}`)) i += 1
      key = `${key}_${i}`
    }

    const closedRows = (existing ?? []).filter((r) => r.is_closed)
    const openRows = (existing ?? []).filter((r) => !r.is_closed)
    let position =
      closedRows.length > 0
        ? Math.min(...closedRows.map((r) => r.position))
        : (openRows[openRows.length - 1]?.position ?? -1) + 1

    if (closedRows.length > 0) {
      for (const row of [...closedRows].sort((a, b) => b.position - a.position)) {
        await supabase
          .from('funnel_stages')
          .update({ position: row.position + 1 })
          .eq('organization_id', ctx.organizationId)
          .eq('funnel', funnel)
          .eq('key', row.key)
      }
    } else {
      position = (existing?.[existing.length - 1]?.position ?? -1) + 1
    }

    const color =
      typeof body.color === 'string' && body.color.trim()
        ? body.color.trim()
        : '#38bdf8'
    const probability =
      funnel === 'crm'
        ? Math.min(100, Math.max(0, Number(body.probability ?? 50)))
        : null

    const { data, error } = await supabase
      .from('funnel_stages')
      .insert({
        organization_id: ctx.organizationId,
        funnel,
        key,
        label,
        position,
        color,
        probability,
        is_closed: Boolean(body.isClosed),
        is_default: false,
      })
      .select('id, funnel, key, label, position, color, probability, is_closed, is_default')
      .single()

    if (error) throw error
    return Response.json({ stage: mapRow(data as Row) })
  } catch (err) {
    return jsonError(err)
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const body = await req.json()
    const id = String(body.id ?? '')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const { data: row, error: findErr } = await supabase
      .from('funnel_stages')
      .select('id, funnel, organization_id')
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle()
    if (findErr) throw findErr
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    const funnel = parseFunnel(row.funnel)
    if (!funnel) return Response.json({ error: 'Invalid funnel' }, { status: 400 })
    await assertModuleAccess(supabase, ctx.organizationId, moduleFor(funnel))

    const patch: Record<string, unknown> = {}
    if (body.label != null) patch.label = String(body.label).trim()
    if (body.color != null) patch.color = String(body.color).trim()
    if (body.position != null) patch.position = Number(body.position)
    if (body.probability != null) patch.probability = Number(body.probability)
    if (body.isClosed != null) patch.is_closed = Boolean(body.isClosed)
    if (body.isDefault === true) {
      await supabase
        .from('funnel_stages')
        .update({ is_default: false })
        .eq('organization_id', ctx.organizationId)
        .eq('funnel', funnel)
      patch.is_default = true
    }

    if (!Object.keys(patch).length) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('funnel_stages')
      .update(patch)
      .eq('id', id)
      .select('id, funnel, key, label, position, color, probability, is_closed, is_default')
      .single()
    if (error) throw error
    return Response.json({ stage: mapRow(data as Row) })
  } catch (err) {
    return jsonError(err)
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const ctx = await requireOrgContext(supabase)
    const url = new URL(req.url)
    const id = url.searchParams.get('id') || ''
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const { data: row, error: findErr } = await supabase
      .from('funnel_stages')
      .select('id, funnel, key, is_default')
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle()
    if (findErr) throw findErr
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    const funnel = parseFunnel(row.funnel)
    if (!funnel) return Response.json({ error: 'Invalid funnel' }, { status: 400 })
    await assertModuleAccess(supabase, ctx.organizationId, moduleFor(funnel))

    const { count } = await supabase
      .from('funnel_stages')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId)
      .eq('funnel', funnel)
    if ((count ?? 0) <= 1) {
      return Response.json({ error: 'Keep at least one step' }, { status: 400 })
    }

    // Remap items on deleted stage → default stage
    const { data: fallback } = await supabase
      .from('funnel_stages')
      .select('key')
      .eq('organization_id', ctx.organizationId)
      .eq('funnel', funnel)
      .neq('id', id)
      .order('is_default', { ascending: false })
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()

    const nextKey = fallback?.key
    if (nextKey) {
      if (funnel === 'leads') {
        await supabase
          .from('leads')
          .update({ stage: nextKey })
          .eq('organization_id', ctx.organizationId)
          .eq('stage', row.key)
      } else {
        await supabase
          .from('crm_deals')
          .update({ stage: nextKey })
          .eq('organization_id', ctx.organizationId)
          .eq('stage', row.key)
      }
    }

    const { error } = await supabase.from('funnel_stages').delete().eq('id', id)
    if (error) throw error
    return Response.json({ ok: true, remappedTo: nextKey ?? null })
  } catch (err) {
    return jsonError(err)
  }
}
