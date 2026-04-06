'use client'

import { useLeads, useDeals, useTasks, useActivities } from '@/hooks/use-crm'
import { useTenantRealtime } from '@/hooks/use-realtime'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Users,
  DollarSign,
  TrendingUp,
  CheckSquare,
  Clock,
  AlertTriangle,
} from 'lucide-react'

interface DashboardProps {
  tenantId: string
}

export function Dashboard({ tenantId }: DashboardProps) {
  const { data: leads, loading: leadsLoading } = useLeads()
  const { data: deals, loading: dealsLoading } = useDeals()
  const { data: tasks, loading: tasksLoading } = useTasks()
  const { data: activities, loading: activitiesLoading } = useActivities(10)

  // Subscribe to realtime updates
  useTenantRealtime({
    tenantId,
    onLeadChange: () => {
      // Refresh leads when changes occur
    },
    onDealChange: () => {
      // Refresh deals when changes occur
    },
    onTaskChange: () => {
      // Refresh tasks when changes occur
    },
  })

  const loading = leadsLoading || dealsLoading || tasksLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  // Calculate stats
  const totalLeads = leads.length
  const newLeadsToday = leads.filter(
    l => new Date(l.created_at).toDateString() === new Date().toDateString()
  ).length

  const totalDeals = deals.length
  const wonDeals = deals.filter(d => d.stage === 'closed_won')
  const pipelineValue = deals
    .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.value || 0), 0)
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)

  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const overdueTasks = tasks.filter(
    t => t.status !== 'completed' && t.due_at && new Date(t.due_at) < new Date()
  ).length

  const conversionRate = totalLeads > 0
    ? ((wonDeals.length / totalLeads) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Resumen de tu pipeline de ventas</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={totalLeads.toString()}
          subtitle={`${newLeadsToday} nuevos hoy`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Pipeline"
          value={formatCurrency(pipelineValue)}
          subtitle={`${totalDeals} oportunidades`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Ganado"
          value={formatCurrency(wonValue)}
          subtitle={`${wonDeals.length} cerrados`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Conversión"
          value={`${conversionRate}%`}
          subtitle="Lead → Cliente"
          icon={CheckSquare}
          color="yellow"
        />
      </div>

      {/* Tasks summary */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Task summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Resumen de Tareas
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-500 mr-3" />
                <span className="text-gray-700">Pendientes</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                {pendingTasks}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                <span className="text-gray-700">Vencidas</span>
              </div>
              <span className="text-xl font-semibold text-red-600">
                {overdueTasks}
              </span>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Actividad Reciente
          </h2>
          {activitiesLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay actividad reciente</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pipeline por Etapa
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { stage: 'lead', label: 'Lead', color: 'bg-slate-500' },
            { stage: 'contacted', label: 'Contactado', color: 'bg-blue-500' },
            { stage: 'qualified', label: 'Calificado', color: 'bg-yellow-500' },
            { stage: 'scheduled', label: 'Agendado', color: 'bg-purple-500' },
            { stage: 'closed_won', label: 'Ganado', color: 'bg-green-500' },
            { stage: 'closed_lost', label: 'Perdido', color: 'bg-red-500' },
          ].map(({ stage, label, color }) => {
            const stageDeals = deals.filter(d => d.stage === stage)
            const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)

            return (
              <div key={stage} className="text-center">
                <div className={`h-2 ${color} rounded-full mb-2`} />
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{stageDeals.length} deals</p>
                <p className="text-sm font-semibold text-gray-700">
                  {formatCurrency(stageValue)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Stat card component
interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'purple' | 'yellow'
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={cn('p-3 rounded-lg', colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

// Activity item component
import type { ActivityWithUser } from '@/types'

function ActivityItem({ activity }: { activity: ActivityWithUser }) {
  const actionLabels: Record<string, string> = {
    created: 'creó',
    updated: 'actualizó',
    deleted: 'eliminó',
    assigned: 'asignó',
    stage_changed: 'movió de etapa',
    status_changed: 'cambió estado',
  }

  const entityLabels: Record<string, string> = {
    lead: 'lead',
    deal: 'oportunidad',
    task: 'tarea',
    note: 'nota',
  }

  return (
    <div className="flex items-start space-x-3 text-sm">
      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-medium text-gray-600">
          {activity.user?.name?.charAt(0) || '?'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-700">
          <span className="font-medium">{activity.user?.name || 'Sistema'}</span>{' '}
          {actionLabels[activity.action] || activity.action}{' '}
          {entityLabels[activity.entity_type] || activity.entity_type}
        </p>
        <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
      </div>
    </div>
  )
}