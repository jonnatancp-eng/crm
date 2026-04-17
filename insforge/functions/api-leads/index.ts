// =====================================================
// Leads API - CRUD Operations
// =====================================================

import { createClient } from 'npm:@insforge/sdk'

const INSFORGE_URL = process.env.INSFORGE_URL || 'https://gedn635p.us-east.insforge.app'
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || ''

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const leadId = url.searchParams.get('id')

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

  // Get user info for tenant context
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
        return handleGet(insforge, leadId)
      case 'POST':
        return handlePost(insforge, req)
      case 'PUT':
        return handlePut(insforge, req, leadId)
      case 'DELETE':
        return handleDelete(insforge, leadId)
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Leads API error:', error)
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
// GET - List or Get Lead
// =====================================================

async function handleGet(insforge: ReturnType<typeof createClient>, leadId: string | null) {
  if (leadId) {
    // Get single lead with relations
    const { data, error } = await insforge.database
      .from('leads')
      .select(`
        *,
        owner:users!leads_owner_id_fkey(id, name, avatar_url, role),
        tasks(*, assignee:users!tasks_assigned_to_fkey(id, name, avatar_url)),
        notes(*, author:users!notes_created_by_fkey(id, name, avatar_url)),
        deals(id, title, stage, value)
      `)
      .eq('id', leadId)
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

  // List leads
  const { data, error, count } = await insforge.database
    .from('leads')
    .select(`
      *,
      owner:users!leads_owner_id_fkey(id, name, avatar_url, role)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data, count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

// =====================================================
// POST - Create Lead
// =====================================================

async function handlePost(insforge: ReturnType<typeof createClient>, req: Request) {
  const body = await req.json()

  // Validate required fields
  if (!body.name) {
    return new Response(JSON.stringify({ error: 'Name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Create lead
  const { data, error } = await insforge.database
    .from('leads')
    .insert([{
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      company: body.company || null,
      source: body.source || 'other',
      value: body.value || null,
      notes: body.notes || null,
      status: 'new',
    }])
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Trigger automation (lead-created function)
  // This can be done via a database trigger or by calling the function directly
  try {
    await fetch(`${INSFORGE_URL}/functions/lead-created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INSFORGE_ANON_KEY}`,
      },
      body: JSON.stringify({
        leadId: data.id,
        tenantId: data.tenant_id,
      }),
    })
  } catch (e) {
    // Don't fail the request if automation fails
    console.error('Failed to trigger automation:', e)
  }

  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  })
}

// =====================================================
// PUT - Update Lead
// =====================================================

async function handlePut(insforge: ReturnType<typeof createClient>, req: Request, leadId: string | null) {
  if (!leadId) {
    return new Response(JSON.stringify({ error: 'Lead ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const body = await req.json()

  // Filter allowed fields
  const allowedFields = ['name', 'email', 'phone', 'company', 'status', 'source', 'value', 'notes', 'owner_id']
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
    .from('leads')
    .update(updateData)
    .eq('id', leadId)
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
// DELETE - Delete Lead
// =====================================================

async function handleDelete(insforge: ReturnType<typeof createClient>, leadId: string | null) {
  if (!leadId) {
    return new Response(JSON.stringify({ error: 'Lead ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { error } = await insforge.database
    .from('leads')
    .delete()
    .eq('id', leadId)

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