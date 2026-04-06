'use client'

import { useState } from 'react'
import { useTasks, useTaskMutations, useUsers } from '@/hooks/use-crm'
import { useTenantRealtime } from '@/hooks/use-realtime'
import { formatDate, formatRelativeDate, getInitials } from '@/lib/utils'
import type { TaskWithRelations, TaskStatus, TaskPriority } from '@/types'
import { TASK_STATUSES, TASK_PRIORITIES } from '@/types'

export default function TasksPage() {
  const [filters, setFilters] = useState<{
    status?: TaskStatus[]
    priority?: TaskPriority[]
  }>({})
  const [showForm, setShowForm] = useState(false)

  // Get tenant from session (simplified for demo)
  const tenantId = 'current-tenant'

  const { data: tasks, loading, refetch } = useTasks(filters)
  const { completeTask, deleteTask } = useTaskMutations()
  const { data: users } = useUsers()

  useTenantRealtime({
    tenantId,
    onTaskChange: () => {
      // Refresh handled by React Query invalidation
    },
  })

  const handleComplete = async (id: string) => {
    await completeTask(id)
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta tarea?')) {
      await deleteTask(id)
      refetch()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
        <p className="text-gray-500">Gestiona tus tareas y seguimientos</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={filters.status?.[0] || ''}
          onChange={e => setFilters({
            ...filters,
            status: e.target.value ? [e.target.value as TaskStatus] : undefined
          })}
        >
          <option value="">Todos los estados</option>
          {TASK_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={filters.priority?.[0] || ''}
          onChange={e => setFilters({
            ...filters,
            priority: e.target.value ? [e.target.value as TaskPriority] : undefined
          })}
        >
          <option value="">Todas las prioridades</option>
          {TASK_PRIORITIES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nueva Tarea
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No se encontraron tareas
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* TODO: Add task form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Nueva Tarea</h2>
            <p className="text-gray-500 mb-4">Formulario de creación de tareas</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: TaskWithRelations
  onComplete: (id: string) => void
  onDelete: (id: string) => void
}

function TaskCard({ task, onComplete, onDelete }: TaskCardProps) {
  const priorityColors = {
    low: 'text-gray-500 bg-gray-50',
    medium: 'text-blue-600 bg-blue-50',
    high: 'text-orange-600 bg-orange-50',
    urgent: 'text-red-600 bg-red-50',
  }

  const statusColors = {
    pending: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const isOverdue = task.due_at &&
    new Date(task.due_at) < new Date() &&
    task.status !== 'completed'

  return (
    <div className={cn(
      'bg-white rounded-lg shadow-sm border p-4',
      isOverdue ? 'border-red-200' : 'border-gray-200'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              'font-medium',
              task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'
            )}>
              {task.title}
            </h3>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              statusColors[task.status]
            )}>
              {TASK_STATUSES.find(s => s.value === task.status)?.label}
            </span>
          </div>

          {task.description && (
            <p className="text-sm text-gray-500 mb-2">{task.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            {/* Assignee */}
            <div className="flex items-center gap-1">
              <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {getInitials(task.assignee?.name)}
                </span>
              </div>
              <span>{task.assignee?.name || 'Sin asignar'}</span>
            </div>

            {/* Due date */}
            {task.due_at && (
              <span className={cn(isOverdue && 'text-red-600')}>
                {formatRelativeDate(task.due_at)}
              </span>
            )}

            {/* Lead/Deal */}
            {task.lead && (
              <span className="text-blue-600">
                Lead: {task.lead.name}
              </span>
            )}
            {task.deal && (
              <span className="text-purple-600">
                Deal: {task.deal.title}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs px-2 py-1 rounded',
            priorityColors[task.priority]
          )}>
            {TASK_PRIORITIES.find(p => p.value === task.priority)?.label}
          </span>

          {task.status !== 'completed' && (
            <button
              onClick={() => onComplete(task.id)}
              className="text-green-600 hover:text-green-700 text-sm"
            >
              Completar
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="text-red-600 hover:text-red-700 text-sm"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}