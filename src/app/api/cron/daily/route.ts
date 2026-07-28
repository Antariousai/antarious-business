import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    // Mark past-due sent invoices as overdue
    await admin
      .from('money_invoices')
      .update({ status: 'overdue' })
      .eq('status', 'sent')
      .lt('due_at', today)

    // Create reminder activities for overdue invoices (best-effort)
    const { data: overdue } = await admin
      .from('money_invoices')
      .select('id, organization_id, number, total_bdt')
      .eq('status', 'overdue')
      .limit(50)

    for (const inv of overdue ?? []) {
      await admin.from('freya_activity_items').insert({
        organization_id: inv.organization_id,
        kind: 'chase_invoice',
        title: `Chase ${inv.number ?? 'invoice'}`,
        summary: `৳${Number(inv.total_bdt).toLocaleString('en-BD')} overdue — Freya can draft a polite reminder.`,
        status: 'waiting',
        payload: { action: 'noop', invoice_id: inv.id },
        href: '/app/money',
      })
    }

    return Response.json({ ok: true, overdueReminders: overdue?.length ?? 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
