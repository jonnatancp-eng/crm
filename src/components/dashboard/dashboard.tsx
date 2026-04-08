'use client'

// 1. Imports externos
import {
  Users,
  DollarSign,
  TrendingUp,
  CheckSquare,
  Clock,
  AlertTriangle,
} from 'lucide-react'

// 2. Imports internos
import { useLeads, useDeals, useTasks, useActivities } from '@/hooks/use-crm'
import { useTenantRealtime } from '@/hooks/use-realtime'
import { formatCurrency, formatDate } from '@/lib/utils'

// 3. Types (IMPORTANTE: arriba, no abajo)
import type { ActivityWithUser } from '@/types'

// 4. Props
interface DashboardProps {
  tenantId: string
}

// 5. Componente principal
export function Dashboard({ tenantId }: DashboardProps) {
  const { data: leads, loading: leadsLoading } = useLeads()
  const { data: deals, loading: dealsLoading } = useDeals()
  const { data: tasks, loading: tasksLoading } = useTasks()
  const { data: activities, loading: activitiesLoading } = useActivities(10)

  // Realtime
  useTenantRealtime({
    tenantId,
    onLeadChange: () => {},
    onDealChange: () => {},
    onTaskChange: () => {},
  })

  const loading = leadsLoading || dealsLoading || tasksLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  // Stats
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

  const conversionRate =
    totalLeads > 0
      ? ((wonDeals.length / totalLeads) * 100).toFixed(1)
      : '0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Resumen de tu pipeline de ventas</p>
      </div>

      {/* Stats */}
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

      {/* Tasks + Activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Resumen de Tareas
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-500 mr-3" />
                <span>Pendientes</span>
              </div>
              <span className="text-xl font-semibold">{pendingTasks}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                <span>Vencidas</span>
              </div>
              <span className="text-xl font-semibold text-red-600">
                {overdueTasks}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            Actividad Reciente
          </h2>

          {activitiesLoading ? (
            <div className="animate-pulse space-y-3" />
          ) : activities.length === 0 ? (
            <p>No hay actividad reciente</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 5).map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------- COMPONENTES ----------------

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 flex justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className={`p-3 rounded-lg ${colors[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  )
}

function ActivityItem({ activity }: { activity: ActivityWithUser }) {
  return (
    <div className="text-sm text-gray-700">
      {activity.user?.name || 'Sistema'} - {formatDate(activity.created_at)}
    </div>
  )
}
