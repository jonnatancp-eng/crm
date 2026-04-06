// =====================================================
// Lead Created - Automation Function
// =====================================================
// This function is triggered when a new lead is created.
// It handles:
// 1. Auto-assignment (round robin)
// 2. Creating follow-up task
// 3. Sending notifications
// =====================================================

import { createClient } from '@insforge/sdk'

interface LeadCreatedPayload {
  leadId: string
  tenantId: string
}

interface Lead {
  id: string
  tenant_id: string
  owner_id: string | null
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string
  source: string | null
}

interface AssignmentRule {
  id: string
  tenant_id: string
  rule_type: string
  user_ids: string[]
  last_assigned_index: number
  weights: Record<string, number>
}

interface User {
  id: string
  name: string | null
  email: string
}

export default async function handler(req: Request): Promise<Response> {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json() as LeadCreatedPayload
    const { leadId, tenantId } = body

    if (!leadId || !tenantId) {
      return new Response(JSON.stringify({ error: 'Missing leadId or tenantId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Initialize InsForge client
    const insforge = createClient({
      baseUrl: process.env.INSFORGE_URL || 'https://gedn635p.us-east.insforge.app',
      anonKey: process.env.INSFORGE_ANON_KEY || '',
      isServerMode: true,
    })

    // Get the lead
    const { data: lead, error: leadError } = await insforge.database
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Step 1: Auto-assign lead using round robin
    const assigneeId = await getNextAssignee(insforge, tenantId)

    if (assigneeId) {
      await insforge.database
        .from('leads')
        .update({ owner_id: assigneeId })
        .eq('id', leadId)
    }

    // Step 2: Create follow-up task
    const dueDate = new Date()
    dueDate.setHours(dueDate.getHours() + 24) // Due in 24 hours

    await insforge.database
      .from('tasks')
      .insert([{
        tenant_id: tenantId,
        lead_id: leadId,
        assigned_to: assigneeId,
        created_by: assigneeId, // System-created
        title: `Contactar a ${(lead as Lead).name}`,
        description: `Follow-up inicial para el lead ${(lead as Lead).name}${(lead as Lead).company ? ` de ${(lead as Lead).company}` : ''}`,
        type: 'follow_up',
        status: 'pending',
        priority: 'high',
        due_at: dueDate.toISOString(),
      }])

    // Step 3: Get assignee info for notification
    if (assigneeId) {
      const { data: assignee } = await insforge.database
        .from('users')
        .select('id, name, email')
        .eq('id', assigneeId)
        .single()

      // TODO: Send notification (email/push)
      // This would integrate with your notification system
      console.log(`Lead ${leadId} assigned to ${assignee?.email}`)
    }

    return new Response(JSON.stringify({
      success: true,
      leadId,
      assigneeId,
      message: 'Lead processed successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error processing lead:', error)
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
// Round Robin Assignment Logic
// =====================================================

async function getNextAssignee(
  insforge: ReturnType<typeof createClient>,
  tenantId: string
): Promise<string | null> {
  // Get active assignment rule
  const { data: rules, error: rulesError } = await insforge.database
    .from('assignment_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .limit(1)

  if (rulesError || !rules || rules.length === 0) {
    // Fallback: get first admin
    const { data: admins } = await insforge.database
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .eq('is_active', true)
      .limit(1)

    return admins?.[0]?.id || null
  }

  const rule = rules[0] as AssignmentRule
  let userIds = rule.user_ids

  // If no users in rule, get all active users
  if (!userIds || userIds.length === 0) {
    const { data: users } = await insforge.database
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    userIds = users?.map(u => u.id) || []
  }

  if (userIds.length === 0) return null

  // Calculate next index for round robin
  const nextIndex = (rule.last_assigned_index + 1) % userIds.length
  const assigneeId = userIds[nextIndex]

  // Update the rule's last_assigned_index
  await insforge.database
    .from('assignment_rules')
    .update({ last_assigned_index: nextIndex })
    .eq('id', rule.id)

  return assigneeId
}