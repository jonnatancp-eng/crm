// =====================================================
// Deals API - CRUD Operations
// =====================================================

import { createClient } from '@insforge/sdk'

const INSFORGE_URL = process.env.INSFORGE_URL || 'https://gedn635p.us-east.insforge.app'
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || ''

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const dealId = url.searchParams.get('id')
  const action = url.searchParams.get('action')

  // Get auth token from header
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

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(insforge, dealId)
      case 'POST':
        return handlePost(insforge, req)
      case 'PUT':
        if (action === 'stage') {
          return handleStageUpdate(insforge, req, dealId)
        }
        return handlePut(insforge, req, dealId)
      case 'DELETE':
        return handleDelete(insforge, dealId)
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Deals API error:', error)
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
// GET - List or Get Deal / Pipeline
// =====================================================

async function handleGet(insforge: ReturnType<typeof createClient>, dealId: string | null) {
  if (dealId) {
    // Get single deal with relations
    const { data, error } = await insforge.database
      .from('deals')
      .select(`
        *,
        owner:users!deals_owner_id_fkey(id, name, avatar_url, role),
        lead:leads(id, name, email, company, phone),
        tasks(*, assignee:users!tasks_assigned_to_fkey(id, name, avatar_url)),
        notes(*, author:users!notes_created_by_fkey(id, name, avatar_url))
      `)
      .eq('id', dealId)
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // List deals (pipeline view)
  const { data, error, count } = await insforge.database
    .from('deals')
    .select(`
      *,
      owner:users!deals_owner_id_fkey(id, name, avatar_url, role),
      lead:leads(id, name, email, company)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Group by stage for pipeline view
  const pipeline = {
    lead: data.filter(d => d.stage === 'lead'),
    contacted: data.filter(d => d.stage === 'contacted'),
    qualified: data.filter(d => d.stage === 'qualified'),
    scheduled: data.filter(d => d.stage === 'scheduled'),
    closed_won: data.filter(d => d.stage === 'closed_won'),
    closed_lost: data.filter(d => d.stage === 'closed_lost'),
  }

  // Calculate totals per stage
  const totals = {
    lead: pipeline.lead.reduce((sum, d) => sum + (d.value || 0), 0),
    contacted: pipeline.contacted.reduce((sum, d) => sum + (d.value || 0), 0),
    qualified: pipeline.qualified.reduce((sum, d) => sum + (d.value || 0), 0),
    scheduled: pipeline.scheduled.reduce((sum, d) => sum + (d.value || 0), 0),
    closed_won: pipeline.closed_won.reduce((sum, d) => sum + (d.value || 0), 0),
    closed_lost: pipeline.closed_lost.reduce((sum, d) => sum + (d.value || 0), 0),
  }

  return new Response(JSON.stringify({ data, pipeline, totals, count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

// =====================================================
// POST - Create Deal
// =====================================================

async function handlePost(insforge: ReturnType<typeof createClient>, req: Request) {
  const body = await req.json()

  // Validate required fields
  if (!body.title) {
    return new Response(JSON.stringify({ error: 'Title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get current user as owner
  const session = await insforge.auth.getCurrentSession()
  const userId = session.data?.session?.user?.id

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Create deal
  const { data, error } = await insforge.database
    .from('deals')
    .insert([{
      title: body.title,
      lead_id: body.lead_id || null,
      owner_id: userId,
      stage: body.stage || 'lead',
      value: body.value || null,
      probability: body.probability || 0,
      expected_close_date: body.expected_close_date || null,
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
// PUT - Update Deal
// =====================================================

async function handlePut(insforge: ReturnType<typeof createClient>, req: Request, dealId: string | null) {
  if (!dealId) {
    return new Response(JSON.stringify({ error: 'Deal ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const body = await req.json()

  // Filter allowed fields
  const allowedFields = ['title', 'value', 'probability', 'expected_close_date', 'owner_id']
  const updateData: Record<string, unknown> = {}

  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updateData[key] = body[key]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { data, error } = await insforge.database
    .from('deals')
    .update(updateData)
    .eq('id', dealId)
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

// =====================================================
// PUT - Update Deal Stage (Kanban move)
// =====================================================

async function handleStageUpdate(insforge: ReturnType<typeof createClient>, req: Request, dealId: string | null) {
  if (!dealId) {
    return new Response(JSON.stringify({ error: 'Deal ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const body = await req.json()

  if (!body.stage) {
    return new Response(JSON.stringify({ error: 'Stage is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Validate stage
  const validStages = ['lead', 'contacted', 'qualified', 'scheduled', 'closed_won', 'closed_lost']
  if (!validStages.includes(body.stage)) {
    return new Response(JSON.stringify({ error: 'Invalid stage' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get current deal (with lead_id) before updating
  const { data: currentDeal } = await insforge.database
    .from('deals')
    .select('id, lead_id, stage')
    .eq('id', dealId)
    .single()

  if (!currentDeal) {
    return new Response(JSON.stringify({ error: 'Deal not found' }), { status: 404 })
  }

  // Update deal stage
  const { data, error } = await insforge.database
    .from('deals')
    .update({ stage: body.stage })
    .eq('id', dealId)
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // If moving to closed_won and deal has a lead, update lead status to 'won'
  if (body.stage === 'closed_won' && currentDeal.lead_id) {
    await insforge.database
      .from('leads')
      .update({ status: 'won' })
      .eq('id', currentDeal.lead_id)
      .eq('status', 'qualified') // Only if currently qualified (not already won)
  }

  // Check if lead already has a closed_deal (for the response)
  let alreadyHasDeal = false
  let dealOfferDeclined = false

  if (currentDeal.lead_id) {
    const { data: leadData } = await insforge.database
      .from('leads')
      .select('deal_offer_declined')
      .eq('id', currentDeal.lead_id)
      .single()

    if (leadData) {
      dealOfferDeclined = leadData.deal_offer_declined === true
    }

    const { data: closedDeal } = await insforge.database
      .from('closed_deals')
      .select('id')
      .eq('lead_id', currentDeal.lead_id)
      .eq('voided', false)
      .single()

    alreadyHasDeal = !!closedDeal
  }

  return new Response(JSON.stringify({
    data,
    alreadyHasDeal,
    dealOfferDeclined,
    showDealPrompt: !alreadyHasDeal && !dealOfferDeclined,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

// =====================================================
// DELETE - Delete Deal
// =====================================================

async function handleDelete(insforge: ReturnType<typeof createClient>, dealId: string | null) {
  if (!dealId) {
    return new Response(JSON.stringify({ error: 'Deal ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { error } = await insforge.database
    .from('deals')
    .delete()
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