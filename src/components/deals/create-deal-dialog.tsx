'use client'

import { useState } from 'react'
import { X, DollarSign, User } from 'lucide-react'
import { useUsers } from '@/hooks/use-crm'
import type { LeadWithDetails, User as UserType } from '@/types'

interface CreateDealDialogProps {
  lead: LeadWithDetails
  open: boolean
  onClose: () => void
  onCreated: (dealId: string) => void
  onDeclined: (leadId: string) => void
}

export function CreateDealDialog({ lead, open, onClose, onCreated, onDeclined }: CreateDealDialogProps) {
  const { data: users } = useUsers()
  const [value, setValue] = useState<string>(lead.value?.toString() || '')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/functions/api/closed-deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({
          lead_id: lead.id,
          value: value ? parseFloat(value) : null,
          notes: notes || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setError('Este lead ya tiene un negocio creado')
          return
        }
        throw new Error(json.error || 'Error al crear el negocio')
      }

      onCreated(json.data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el negocio')
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    setLoading(true)
    try {
      // Update lead with decline flag via PATCH (we'll add the action later)
      const res = await fetch(`/functions/api/leads?id=${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({
          status: 'won',
          deal_offer_declined: true,
        }),
      })

      if (res.ok) {
        onDeclined(lead.id)
      }
    } catch (err) {
      console.error('Failed to decline:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Crear negocio cerrado</h2>
            <p className="text-sm text-gray-500">Lead: {lead.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-md">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor del negocio
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asignado a
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                <option value="">Seleccionar usuario</option>
                {users?.map((u: UserType) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Observaciones adicionales..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleDecline}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              No, gracias
            </button>
            <button
              type="submit"
              disabled={loading || !assignedTo}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear negocio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Helper to get access token (simplified - in real app use proper auth)
async function getAccessToken(): Promise<string> {
  if (typeof window === 'undefined') return ''
  const cookies = document.cookie.split(';').find(c => c.trim().startsWith('accessToken='))
  return cookies?.split('=')[1] || ''
}
