// =====================================================
// Tasks API - CRUD Operations
// =====================================================

import { createClient } from '@insforge/sdk'

const INSFORGE_URL = process.env.INSFORGE_URL || 'https://gedn635p.us-east.insforge.app'
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || ''

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const taskId = url.searchParams.get('id')
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
        return handleGet(insforge, taskId)
      case 'POST':
        return handlePost(insforge, req)
      case 'PUT':
        if (action === 'complete') {
          return handleComplete(insforge, taskId)
        }
        return handlePut(insforge, req, taskId)
      case 'DELETE':
        return handleDelete(insforge, taskId)
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Tasks API error:', error)
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
// GET - List or Get Task
// =====================================================

async function handleGet(insforge: ReturnType<typeof createClient>, taskId: string | null) {
  if (taskId) {
    // Get single task with relations
    const { data, error } = await insforge.database
      .from('tasks')
      .select(`
        *,
        assignee:users!tasks_assigned_to_fkey(id, name, avatar_url, role),
        creator:users!tasks_created_by_fkey(id, name),
        lead:leads(id, name, email, company),
        deal:deals(id, title, stage)
      `)
      .eq('id', taskId)
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

  // List tasks with optional filters
  const { data, error, count } = await insforge.database
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assigned_to_fkey(id, name, avatar_url, role),
      creator:users!tasks_created_by_fkey(id, name),
      lead:leads(id, name, email, company),
      deal:deals(id, title, stage)
    `, { count: 'exact' })
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Calculate statistics
  const stats = {
    total: data.length,
    pending: data.filter(t => t.status === 'pending').length,
    in_progress: data.filter(t => t.status === 'in_progress').length,
    completed: data.filter(t => t.status === 'completed').length,
    overdue: data.filter(t =>
      t.status !== 'completed' &&
      t.due_at &&
      new Date(t.due_at) < new Date()
    ).length,
    due_today: data.filter(t =>
      t.status !== 'completed' &&
      t.due_at &&
      new Date(t.due_at).toDateString() === new Date().toDateString()
    ).length,
  }

  return new Response(JSON.stringify({ data, stats, count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

// =====================================================
// POST - Create Task
// =====================================================

async function handlePost(insforge: ReturnType<typeof createClient>, req: Request) {
  const body = await req.json()

  // Validate required fields
  if (!body.title || !body.assigned_to) {
    return new Response(JSON.stringify({ error: 'Title and assigned_to are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get current user as creator
  const session = await insforge.auth.getCurrentSession()
  const userId = session.data?.session?.user?.id

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Create task
  const { data, error } = await insforge.database
    .from('tasks')
    .insert([{
      title: body.title,
      description: body.description || null,
      lead_id: body.lead_id || null,
      deal_id: body.deal_id || null,
      assigned_to: body.assigned_to,
      created_by: userId,
      type: body.type || 'follow_up',
      status: 'pending',
      priority: body.priority || 'medium',
      due_at: body.due_at || null,
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
// PUT - Update Task
// =====================================================

async function handlePut(insforge: ReturnType<typeof createClient>, req: Request, taskId: string | null) {
  if (!taskId) {
    return new Response(JSON.stringify({ error: 'Task ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const body = await req.json()

  // Filter allowed fields
  const allowedFields = ['title', 'description', 'type', 'status', 'priority', 'due_at']
  const updateData: Record<string, unknown> = {}

  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updateData[key] = body[key]
    }
  }

  // If status is being set to completed, set completed_at
  if (body.status === 'completed') {
    updateData['completed_at'] = new Date().toISOString()
  }

  if (Object.keys(updateData).length === 0) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { data, error } = await insforge.database
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
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
// PUT - Complete Task
// =====================================================

async function handleComplete(insforge: ReturnType<typeof createClient>, taskId: string | null) {
  if (!taskId) {
    return new Response(JSON.stringify({ error: 'Task ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { data, error } = await insforge.database
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', taskId)
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
// DELETE - Delete Task
// =====================================================

async function handleDelete(insforge: ReturnType<typeof createClient>, taskId: string | null) {
  if (!taskId) {
    return new Response(JSON.stringify({ error: 'Task ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { error } = await insforge.database
    .from('tasks')
    .delete()
    .eq('id', taskId)

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