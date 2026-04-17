'use client'

import { useState, useEffect } from 'react'
import { X, Mail, Phone, Building2, Calendar, User, Edit2, CheckCircle, DollarSign } from 'lucide-react'
import { useLead, useLeadMutations } from '@/hooks/use-crm'
import { useUsers } from '@/hooks/use-crm'
import { formatDate, formatRelativeDate, getInitials, cn } from '@/lib/utils'
import { LEAD_STATUSES } from '@/types'
import type { LeadWithDetails, LeadStatus } from '@/types'

interface LeadDetailDrawerProps {
  leadId: string | null
  open: boolean
  onClose: () => void
  onCreateDeal: (lead: LeadWithDetails) => void
  onRefetch?: () => void
}

export function LeadDetailDrawer({ leadId, open, onClose, onCreateDeal, onRefetch }: LeadDetailDrawerProps) {
  const { data: lead, loading, refetch } = useLead(leadId || '')
  const { updateLead } = useLeadMutations()
  const [editingStatus, setEditingStatus] = useState(false)
  const [localStatus, setLocalStatus] = useState<LeadStatus | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (lead) setLocalStatus(lead.status)
  }, [lead])

  useEffect(() => {
    if (leadId && open) refetch?.()
  }, [leadId, open])

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!leadId || !lead) return
    setSaving(true)
    try {
      await updateLead(leadId, { status: newStatus })
      setLocalStatus(newStatus)
      setEditingStatus(false)
      onRefetch?.()
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateDeal = () => {
    if (!lead) return
    onCreateDeal(lead)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-30"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : lead ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {getInitials(lead.name)}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{lead.name}</h2>
                  {lead.company && (
                    <p className="text-sm text-gray-500">{lead.company}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Estado:</span>
                  {editingStatus ? (
                    <select
                      value={localStatus || ''}
                      onChange={e => setLocalStatus(e.target.value as LeadStatus)}
                      disabled={saving}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {LEAD_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={lead.status} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingStatus ? (
                    <>
                      <button
                        onClick={() => setEditingStatus(false)}
                        disabled={saving}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => localStatus && handleStatusChange(localStatus)}
                        disabled={saving}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingStatus(true)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      <Edit2 className="h-3 w-3" />
                      Cambiar
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <Section title="Información de contacto">
                {lead.email && (
                  <InfoRow icon={Mail} label="Email" value={lead.email} />
                )}
                {lead.phone && (
                  <InfoRow icon={Phone} label="Teléfono" value={lead.phone} />
                )}
                {lead.company && (
                  <InfoRow icon={Building2} label="Empresa" value={lead.company} />
                )}
                {lead.source && (
                  <InfoRow
                    icon={Building2}
                    label="Fuente"
                    value={lead.source.charAt(0).toUpperCase() + lead.source.slice(1)}
                  />
                )}
              </Section>

              {/* Value */}
              {lead.value && (
                <Section title="Valor estimado">
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    {lead.value.toLocaleString()}
                  </div>
                </Section>
              )}

              {/* Notes */}
              {(lead.notes as unknown as string) && (
                <Section title="Notas">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead.notes as unknown as string}</p>
                </Section>
              )}

              {/* Tasks */}
              <Section title="Tareas">
                {lead.tasks && lead.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {lead.tasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-500">
                            {task.due_at ? formatRelativeDate(task.due_at) : 'Sin fecha'}
                          </p>
                        </div>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          task.status === 'completed' ? 'bg-green-100 text-green-700' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin tareas</p>
                )}
              </Section>

              {/* Metadata */}
              <Section title="Metadata">
                <InfoRow
                  icon={Calendar}
                  label="Creado"
                  value={formatDate(lead.created_at)}
                />
                {lead.owner && (
                  <InfoRow
                    icon={User}
                    label="Asignado a"
                    value={lead.owner.name || '-'}
                  />
                )}
              </Section>

              {/* Create Deal Button - visible when won and no deal or declined */}
              {lead.status === 'won' && (
                <div className="pt-2">
                  <button
                    onClick={handleCreateDeal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Crear negocio cerrado
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Convierte este lead ganado en un registro de negocio
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-gray-500">Lead no encontrado</p>
          </div>
        )}
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <span className="text-sm text-gray-500 min-w-[80px]">{label}:</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = LEAD_STATUSES.find(s => s.value === status)
  if (!config) return <span className="text-sm text-gray-600">{status}</span>

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      config.color.replace('bg-', 'bg-opacity-20 ')
    )}>
      {config.label}
    </span>
  )
}
