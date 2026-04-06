'use client'

import { useState } from 'react'
import { useLeads, useLeadMutations } from '@/hooks/use-crm'
import { formatDate, getInitials } from '@/lib/utils'
import type { LeadWithOwner, LeadStatus, LeadSource } from '@/types'
import { LEAD_STATUSES, LEAD_SOURCES } from '@/types'
import { LeadForm } from './lead-form'

interface LeadListProps {
  onLeadClick?: (lead: LeadWithOwner) => void
}

export function LeadList({ onLeadClick }: LeadListProps) {
  const [filters, setFilters] = useState<{
    status?: LeadStatus[]
    source?: LeadSource[]
    search?: string
  }>({})
  const [showForm, setShowForm] = useState(false)
  const [selectedLead, setSelectedLead] = useState<LeadWithOwner | null>(null)

  const { data: leads, loading, error, refetch } = useLeads(filters)
  const { deleteLead } = useLeadMutations()

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este lead?')) {
      await deleteLead(id)
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

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        <p>Error al cargar leads: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar leads..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.search || ''}
            onChange={e => setFilters({ ...filters, search: e.target.value || undefined })}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filters.status?.[0] || ''}
            onChange={e => setFilters({
              ...filters,
              status: e.target.value ? [e.target.value as LeadStatus] : undefined
            })}
          >
            <option value="">Todos los estados</option>
            {LEAD_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filters.source?.[0] || ''}
            onChange={e => setFilters({
              ...filters,
              source: e.target.value ? [e.target.value as LeadSource] : undefined
            })}
          >
            <option value="">Todas las fuentes</option>
            {LEAD_SOURCES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSelectedLead(null)
              setShowForm(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Nuevo Lead
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fuente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asignado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron leads
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onLeadClick?.(lead)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {getInitials(lead.name)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {lead.name}
                          </div>
                          {lead.company && (
                            <div className="text-sm text-gray-500">
                              {lead.company}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.email || '-'}</div>
                      <div className="text-sm text-gray-500">{lead.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.source ? LEAD_SOURCES.find(s => s.value === lead.source)?.label : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lead.value ? `$${lead.value.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.owner ? (
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            {lead.owner.avatar_url ? (
                              <img
                                src={lead.owner.avatar_url}
                                alt={lead.owner.name || ''}
                                className="h-8 w-8 rounded-full"
                              />
                            ) : (
                              <span className="text-xs font-medium text-gray-600">
                                {getInitials(lead.owner.name)}
                              </span>
                            )}
                          </div>
                          <span className="ml-2 text-sm text-gray-700">
                            {lead.owner.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedLead(lead)
                          setShowForm(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleDelete(lead.id)
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead form modal */}
      {showForm && (
        <LeadForm
          lead={selectedLead}
          onClose={() => {
            setShowForm(false)
            setSelectedLead(null)
          }}
          onSave={() => {
            setShowForm(false)
            setSelectedLead(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const statusConfig = LEAD_STATUSES.find(s => s.value === status)
  if (!statusConfig) return <span>{status}</span>

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      statusConfig.color.replace('bg-', 'bg-opacity-10 ').replace('bg-opacity-10', 'bg-opacity-10'),
      `text-${statusConfig.color.replace('bg-', '')}`
    )}>
      {statusConfig.label}
    </span>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}