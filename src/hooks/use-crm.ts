// =====================================================
// React Hooks for CRM Data
// =====================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import type {
  Lead, LeadWithOwner, LeadWithDetails,
  Deal, DealWithOwner,
  Task, TaskWithRelations,
  Note, NoteWithAuthor,
  Activity, ActivityWithUser,
  User, AssignmentRule,
  LeadFilters, TaskFilters, DealFilters,
  CreateLeadInput, UpdateLeadInput,
  CreateDealInput, UpdateDealInput,
  CreateTaskInput, UpdateTaskInput,
  CreateNoteInput,
} from '@/types'

// =====================================================
// Leads Hook
// =====================================================

export function useLeads(filters?: LeadFilters) {
  const [data, setData] = useState<LeadWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = insforge.database
        .from('leads')
        .select(`
          *,
          owner:users!leads_owner_id_fkey(id, name, avatar_url, role)
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status)
      }
      if (filters?.source?.length) {
        query = query.in('source', filters.source)
      }
      if (filters?.owner_id?.length) {
        query = query.in('owner_id', filters.owner_id)
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`)
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }

      const { data: result, error: err } = await query

      if (err) throw err
      setData(result as LeadWithOwner[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching leads')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  return { data, loading, error, refetch: fetchLeads }
}

export function useLead(id: string) {
  const [data, setData] = useState<LeadWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchLead = async () => {
      setLoading(true)
      try {
        const { data: result, error: err } = await insforge.database
          .from('leads')
          .select(`
            *,
            owner:users!leads_owner_id_fkey(id, name, avatar_url, role),
            tasks(*, assignee:users!tasks_assigned_to_fkey(id, name, avatar_url)),
            notes(*, author:users!notes_created_by_fkey(id, name, avatar_url)),
            deals(*)
          `)
          .eq('id', id)
          .single()

        if (err) throw err
        setData(result as LeadWithDetails)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching lead')
      } finally {
        setLoading(false)
      }
    }

    fetchLead()
  }, [id])

  return { data, loading, error }
}

export function useLeadMutations() {
  const createLead = async (input: CreateLeadInput): Promise<Lead> => {
    const { data, error } = await insforge.database
      .from('leads')
      .insert([input])
      .select()
      .single()

    if (error) throw error
    return data as Lead
  }

  const updateLead = async (id: string, input: UpdateLeadInput): Promise<Lead> => {
    const { data, error } = await insforge.database
      .from('leads')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Lead
  }

  const deleteLead = async (id: string): Promise<void> => {
    const { error } = await insforge.database
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  const assignLead = async (id: string, ownerId: string): Promise<Lead> => {
    const { data, error } = await insforge.database
      .from('leads')
      .update({ owner_id: ownerId })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Lead
  }

  return { createLead, updateLead, deleteLead, assignLead }
}

// =====================================================
// Deals Hook
// =====================================================

export function useDeals(filters?: DealFilters) {
  const [data, setData] = useState<DealWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = insforge.database
        .from('deals')
        .select(`
          *,
          owner:users!deals_owner_id_fkey(id, name, avatar_url, role),
          lead:leads(id, name, email, company)
        `)
        .order('created_at', { ascending: false })

      if (filters?.stage?.length) {
        query = query.in('stage', filters.stage)
      }
      if (filters?.owner_id?.length) {
        query = query.in('owner_id', filters.owner_id)
      }
      if (filters?.min_value) {
        query = query.gte('value', filters.min_value)
      }
      if (filters?.max_value) {
        query = query.lte('value', filters.max_value)
      }

      const { data: result, error: err } = await query

      if (err) throw err
      setData(result as DealWithOwner[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching deals')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  return { data, loading, error, refetch: fetchDeals }
}

export function usePipeline() {
  const [data, setData] = useState<Record<string, DealWithOwner[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPipeline = async () => {
      setLoading(true)
      try {
        const { data: result, error: err } = await insforge.database
          .from('deals')
          .select(`
            *,
            owner:users!deals_owner_id_fkey(id, name, avatar_url, role),
            lead:leads(id, name, email, company)
          `)
          .order('created_at', { ascending: false })

        if (err) throw err

        // Group by stage
        const grouped = (result as DealWithOwner[]).reduce((acc, deal) => {
          if (!acc[deal.stage]) acc[deal.stage] = []
          acc[deal.stage].push(deal)
          return acc
        }, {} as Record<string, DealWithOwner[]>)

        setData(grouped)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching pipeline')
      } finally {
        setLoading(false)
      }
    }

    fetchPipeline()
  }, [])

  return { data, loading, error }
}

export function useDealMutations() {
  const createDeal = async (input: CreateDealInput): Promise<Deal> => {
    const { data, error } = await insforge.database
      .from('deals')
      .insert([input])
      .select()
      .single()

    if (error) throw error
    return data as Deal
  }

  const updateDeal = async (id: string, input: UpdateDealInput): Promise<Deal> => {
    const { data, error } = await insforge.database
      .from('deals')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Deal
  }

  const updateDealStage = async (id: string, stage: string): Promise<Deal> => {
    const { data, error } = await insforge.database
      .from('deals')
      .update({ stage })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Deal
  }

  const deleteDeal = async (id: string): Promise<void> => {
    const { error } = await insforge.database
      .from('deals')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  return { createDeal, updateDeal, updateDealStage, deleteDeal }
}

// =====================================================
// Tasks Hook
// =====================================================

export function useTasks(filters?: TaskFilters) {
  const [data, setData] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = insforge.database
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assigned_to_fkey(id, name, avatar_url, role),
          creator:users!tasks_created_by_fkey(id, name),
          lead:leads(id, name),
          deal:deals(id, title)
        `)
        .order('due_at', { ascending: true, nullsFirst: false })

      if (filters?.status?.length) {
        query = query.in('status', filters.status)
      }
      if (filters?.priority?.length) {
        query = query.in('priority', filters.priority)
      }
      if (filters?.assigned_to?.length) {
        query = query.in('assigned_to', filters.assigned_to)
      }
      if (filters?.type?.length) {
        query = query.in('type', filters.type)
      }
      if (filters?.overdue) {
        query = query.lt('due_at', new Date().toISOString()).neq('status', 'completed')
      }

      const { data: result, error: err } = await query

      if (err) throw err
      setData(result as TaskWithRelations[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching tasks')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { data, loading, error, refetch: fetchTasks }
}

export function useTaskMutations() {
  const createTask = async (input: CreateTaskInput): Promise<Task> => {
    const { data, error } = await insforge.database
      .from('tasks')
      .insert([input])
      .select()
      .single()

    if (error) throw error
    return data as Task
  }

  const updateTask = async (id: string, input: UpdateTaskInput): Promise<Task> => {
    const { data, error } = await insforge.database
      .from('tasks')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Task
  }

  const completeTask = async (id: string): Promise<Task> => {
    const { data, error } = await insforge.database
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Task
  }

  const deleteTask = async (id: string): Promise<void> => {
    const { error } = await insforge.database
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  return { createTask, updateTask, completeTask, deleteTask }
}

// =====================================================
// Notes Hook
// =====================================================

export function useNotes(leadId?: string, dealId?: string) {
  const [data, setData] = useState<NoteWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true)
      try {
        let query = insforge.database
          .from('notes')
          .select(`
            *,
            author:users!notes_created_by_fkey(id, name, avatar_url)
          `)
          .order('created_at', { ascending: false })

        if (leadId) {
          query = query.eq('lead_id', leadId)
        }
        if (dealId) {
          query = query.eq('deal_id', dealId)
        }

        const { data: result, error: err } = await query

        if (err) throw err
        setData(result as NoteWithAuthor[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching notes')
      } finally {
        setLoading(false)
      }
    }

    fetchNotes()
  }, [leadId, dealId])

  return { data, loading, error }
}

export function useNoteMutations() {
  const createNote = async (input: CreateNoteInput): Promise<Note> => {
    const { data, error } = await insforge.database
      .from('notes')
      .insert([input])
      .select()
      .single()

    if (error) throw error
    return data as Note
  }

  const deleteNote = async (id: string): Promise<void> => {
    const { error } = await insforge.database
      .from('notes')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  return { createNote, deleteNote }
}

// =====================================================
// Activities Hook
// =====================================================

export function useActivities(limit = 20) {
  const [data, setData] = useState<ActivityWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)
      try {
        const { data: result, error: err } = await insforge.database
          .from('activities')
          .select(`
            *,
            user:users(id, name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (err) throw err
        setData(result as ActivityWithUser[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching activities')
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [limit])

  return { data, loading, error }
}

// =====================================================
// Users Hook
// =====================================================

export function useUsers() {
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const { data: result, error: err } = await insforge.database
          .from('users')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (err) throw err
        setData(result as User[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return { data, loading, error }
}

// =====================================================
// Assignment Rules Hook
// =====================================================

export function useAssignmentRules() {
  const [data, setData] = useState<AssignmentRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true)
      try {
        const { data: result, error: err } = await insforge.database
          .from('assignment_rules')
          .select('*')
          .order('created_at')

        if (err) throw err
        setData(result as AssignmentRule[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching assignment rules')
      } finally {
        setLoading(false)
      }
    }

    fetchRules()
  }, [])

  return { data, loading, error }
}