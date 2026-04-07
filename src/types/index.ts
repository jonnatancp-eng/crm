// =====================================================
// CRM TypeScript Types
// =====================================================

// =====================================================
// Enums
// =====================================================

export type UserRole = 'admin' | 'setter' | 'closer'
export type TenantPlan = 'free' | 'pro' | 'enterprise'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type LeadSource = 'website' | 'referral' | 'ads' | 'organic' | 'cold' | 'other'

export type DealStage = 'lead' | 'contacted' | 'qualified' | 'scheduled' | 'closed_won' | 'closed_lost'

export type TaskType = 'follow_up' | 'call' | 'email' | 'meeting' | 'other'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type NoteType = 'note' | 'call' | 'email' | 'meeting'

export type EntityType = 'lead' | 'deal' | 'task' | 'note' | 'user' | 'tenant'
export type ActivityAction = 'created' | 'updated' | 'deleted' | 'assigned' | 'stage_changed' | 'status_changed'

export type AssignmentRuleType = 'round_robin' | 'weighted' | 'manual'

// =====================================================
// Core Entities
// =====================================================

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  tenant_id: string
  name: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserWithTenant extends User {
  tenant?: Tenant
}

export interface Lead {
  id: string
  tenant_id: string
  owner_id: string | null
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: LeadStatus
  source: LeadSource | null
  value: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LeadWithOwner extends Lead {
  owner?: User | null
}

export interface LeadWithDetails extends Omit<LeadWithOwner, 'notes'> {
  tasks?: Task[]
  notes?: Note[]
  deals?: Deal[]
  activities?: Activity[]
}

export interface Deal {
  id: string
  tenant_id: string
  lead_id: string | null
  owner_id: string
  title: string
  stage: DealStage
  value: number | null
  probability: number
  expected_close_date: string | null
  created_at: string
  updated_at: string
}

export interface DealWithOwner extends Deal {
  owner?: User
  lead?: Lead | null
}

export interface Task {
  id: string
  tenant_id: string
  lead_id: string | null
  deal_id: string | null
  assigned_to: string
  created_by: string
  title: string
  description: string | null
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  due_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskWithRelations extends Task {
  assignee?: User
  creator?: User
  lead?: Lead | null
  deal?: Deal | null
}

export interface Note {
  id: string
  tenant_id: string
  lead_id: string | null
  deal_id: string | null
  task_id: string | null
  created_by: string
  content: string
  type: NoteType
  created_at: string
}

export interface NoteWithAuthor extends Note {
  author?: User
}

export interface Activity {
  id: string
  tenant_id: string
  user_id: string | null
  entity_type: EntityType
  entity_id: string
  action: ActivityAction
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ActivityWithUser extends Activity {
  user?: User | null
}

export interface AssignmentRule {
  id: string
  tenant_id: string
  name: string
  is_active: boolean
  rule_type: AssignmentRuleType
  user_ids: string[]
  weights: Record<string, number>
  last_assigned_index: number
  created_at: string
  updated_at: string
}

// =====================================================
// API Request/Response Types
// =====================================================

export interface CreateLeadInput {
  name: string
  email?: string
  phone?: string
  company?: string
  source?: LeadSource
  value?: number
  notes?: string
}

export interface UpdateLeadInput {
  name?: string
  email?: string
  phone?: string
  company?: string
  status?: LeadStatus
  source?: LeadSource
  value?: number
  notes?: string
  owner_id?: string
}

export interface CreateDealInput {
  lead_id?: string
  title: string
  stage?: DealStage
  value?: number
  probability?: number
  expected_close_date?: string
}

export interface UpdateDealInput {
  title?: string
  stage?: DealStage
  value?: number
  probability?: number
  expected_close_date?: string
  owner_id?: string
}

export interface CreateTaskInput {
  lead_id?: string
  deal_id?: string
  assigned_to: string
  title: string
  description?: string
  type?: TaskType
  priority?: TaskPriority
  due_at?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  type?: TaskType
  status?: TaskStatus
  priority?: TaskPriority
  due_at?: string
}

export interface CreateNoteInput {
  lead_id?: string
  deal_id?: string
  task_id?: string
  content: string
  type?: NoteType
}

// =====================================================
// Dashboard Stats
// =====================================================

export interface DashboardStats {
  totalLeads: number
  newLeadsToday: number
  totalDeals: number
  dealsByStage: Record<DealStage, number>
  totalValue: number
  pipelineValue: number
  wonValue: number
  tasksDueToday: number
  tasksOverdue: number
  conversionRate: number
}

export interface PipelineData {
  stages: {
    stage: DealStage
    label: string
    deals: DealWithOwner[]
    totalValue: number
  }[]
}

// =====================================================
// Auth Types
// =====================================================

export interface AuthSession {
  user: User
  tenant: Tenant
  accessToken: string
}

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
}

// =====================================================
// Filter Types
// =====================================================

export interface LeadFilters {
  status?: LeadStatus[]
  source?: LeadSource[]
  owner_id?: string[]
  search?: string
  date_from?: string
  date_to?: string
}

export interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assigned_to?: string[]
  type?: TaskType[]
  overdue?: boolean
  due_today?: boolean
}

export interface DealFilters {
  stage?: DealStage[]
  owner_id?: string[]
  min_value?: number
  max_value?: number
}

// =====================================================
// Table Column Types
// =====================================================

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
}

// =====================================================
// Form State Types
// =====================================================

export interface FormState<T> {
  data: T
  loading: boolean
  error: string | null
}

// =====================================================
// Pagination Types
// =====================================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// =====================================================
// Constants
// =====================================================

export const LEAD_STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'Nuevo', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contactado', color: 'bg-yellow-500' },
  { value: 'qualified', label: 'Calificado', color: 'bg-purple-500' },
  { value: 'converted', label: 'Convertido', color: 'bg-green-500' },
  { value: 'lost', label: 'Perdido', color: 'bg-gray-500' },
]

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'website', label: 'Sitio Web' },
  { value: 'referral', label: 'Referido' },
  { value: 'ads', label: 'Publicidad' },
  { value: 'organic', label: 'Orgánico' },
  { value: 'cold', label: 'Frío' },
  { value: 'other', label: 'Otro' },
]

export const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-slate-500' },
  { value: 'contacted', label: 'Contactado', color: 'bg-blue-500' },
  { value: 'qualified', label: 'Calificado', color: 'bg-yellow-500' },
  { value: 'scheduled', label: 'Agendado', color: 'bg-purple-500' },
  { value: 'closed_won', label: 'Ganado', color: 'bg-green-500' },
  { value: 'closed_lost', label: 'Perdido', color: 'bg-red-500' },
]

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baja', color: 'text-gray-500' },
  { value: 'medium', label: 'Media', color: 'text-blue-500' },
  { value: 'high', label: 'Alta', color: 'text-orange-500' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-500' },
]

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
]

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'closer', label: 'Closer' },
  { value: 'setter', label: 'Setter' },
]