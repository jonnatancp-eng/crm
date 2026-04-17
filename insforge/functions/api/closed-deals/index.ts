// =====================================================
// Closed Deals API - Won/Lost deals history
// =====================================================

import { createClient } from '@insforge/sdk'

const INSFORGE_URL = process.env.INSFORGE_URL || 'https://gedn635p.us-east.insforge.app'
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || ''

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const dealId = url.searchParams.get('id')

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const insforge = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    isServerMode: true,
    edgeFunctionToken: token,
  })

  const session = await insforge.auth.getCurrentSession()
  if (!session.data?.session) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(insforge, dealId)
      case 'POST':
        return handlePost(insforge, req)
      case 'DELETE':
        return handleDelete(insforge, dealId)
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Closed Deals API error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// =====================================================
// GET - List or Get Closed Deal
// =====================================================

async function handleGet(insforge: ReturnType<typeof createClient>, dealId: string | null) {
  if (dealId) {
    const { data, error } = await insforge.database
      .from('closed_deals')
      .select(`
        *,
        lead:leads!closed_deals_lead_id_fkey(id, name, email, phone, company),
        assigned_to_user:users!closed_deals_assigned_to_fkey(id, name, avatar_url, role)
      `)
      .eq('id', dealId)
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 404 })
    }

    return new Response(JSON.stringify({ data }), { status: 200 })
  }

  // List closed deals (only non-voided)
  const { data, error } = await insforge.database
    .from('closed_deals')
    .select(`
      *,
      lead:leads!closed_deals_lead_id_fkey(id, name, email, phone, company),
      assigned_to_user:users!closed_deals_assigned_to_fkey(id, name, avatar_url, role)
    `)
    .eq('voided', false)
    .order('closed_at', { ascending: false })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }

  return new Response(JSON.stringify({ data }), { status: 200 })
}

// =====================================================
// POST - Create Closed Deal
// =====================================================

async function handlePost(insforge: ReturnType<typeof createClient>, req: Request) {
  const body = await req.json()
  const { lead_id, value, notes } = body

  if (!lead_id) {
    return new Response(JSON.stringify({ error: 'lead_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Check for duplicate (active closed_deal for this lead)
  const { data: existing } = await insforge.database
    .from('closed_deals')
    .select('id')
    .eq('lead_id', lead_id)
    .eq('voided', false)
    .single()

  if (existing) {
    return new Response(JSON.stringify({
      error: 'Closed deal already exists for this lead',
      existing_id: existing.id
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get lead for tenant_id
  const { data: lead } = await insforge.database
    .from('leads')
    .select('tenant_id')
    .eq('id', lead_id)
    .single()

  if (!lead) {
    return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 })
  }

  // Get current user
  const session = await insforge.auth.getCurrentSession()
  const userId = session.data?.session?.user?.id

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { data, error } = await insforge.database
    .from('closed_deals')
    .insert([{
      tenant_id: lead.tenant_id,
      lead_id,
      assigned_to: userId,
      value: value || null,
      notes: notes || null,
      voided: false,
      voided_reason: null,
    }])
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  })
}

// =====================================================
// DELETE - Void (soft-delete) Closed Deal
// =====================================================

async function handleDelete(insforge: ReturnType<typeof createClient>, dealId: string | null) {
  if (!dealId) {
    return new Response(JSON.stringify({ error: 'Deal ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const body = await req.json().catch(() => ({}))
  const reason = body.reason || 'User cancelled'

  const { error } = await insforge.database
    .from('closed_deals')
    .update({ voided: true, voided_reason: reason })
    .eq('id', dealId)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
