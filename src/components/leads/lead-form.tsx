'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useLeadMutations, useUsers } from '@/hooks/use-crm'
import type { LeadWithOwner, CreateLeadInput, UpdateLeadInput, LeadSource } from '@/types'
import { LEAD_STATUSES, LEAD_SOURCES } from '@/types'

interface LeadFormProps {
  lead?: LeadWithOwner | null
  onClose: () => void
  onSave: () => void
}

export function LeadForm({ lead, onClose, onSave }: LeadFormProps) {
  const { createLead, updateLead } = useLeadMutations()
  const { data: users } = useUsers()

  const [formData, setFormData] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    company: lead?.company || '',
    source: lead?.source || 'website' as LeadSource,
    value: lead?.value?.toString() || '',
    notes: lead?.notes || '',
    owner_id: lead?.owner_id || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      if (lead) {
        // Update existing lead
        const updateData: UpdateLeadInput = {
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          company: formData.company || undefined,
          source: formData.source,
          value: formData.value ? parseFloat(formData.value) : undefined,
          notes: formData.notes || undefined,
          owner_id: formData.owner_id || undefined,
        }
        await updateLead(lead.id, updateData)
      } else {
        // Create new lead
        const createData: CreateLeadInput = {
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          company: formData.company || undefined,
          source: formData.source,
          value: formData.value ? parseFloat(formData.value) : undefined,
          notes: formData.notes || undefined,
        }
        await createLead(createData)
      }
      onSave()
    } catch (error) {
      console.error('Failed to save lead:', error)
      setErrors({ submit: 'Error al guardar el lead' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              {lead ? 'Editar Lead' : 'Nuevo Lead'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {errors.submit && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded">
                {errors.submit}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                className={cn(
                  'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  errors.name ? 'border-red-500' : 'border-gray-300'
                )}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre completo"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className={cn(
                  'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  errors.email ? 'border-red-500' : 'border-gray-300'
                )}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+52 123 456 7890"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empresa
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nombre de la empresa"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuente
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.source}
                onChange={e => setFormData({ ...formData, source: e.target.value as LeadSource })}
              >
                {LEAD_SOURCES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor estimado
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.value}
                  onChange={e => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="100"
                />
              </div>
            </div>

            {/* Owner */}
            {lead && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asignado a
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.owner_id}
                  onChange={e => setFormData({ ...formData, owner_id: e.target.value })}
                >
                  <option value="">Sin asignar</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>

            {/* Status (only for existing leads) */}
            {lead && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.source}
                  disabled
                >
                  {LEAD_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  El estado se actualiza desde el pipeline
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'px-4 py-2 text-white rounded-md transition-colors',
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {loading ? 'Guardando...' : lead ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}