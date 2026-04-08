'use client'

import { useState } from 'react'
import { useTenantRealtime } from '@/hooks/use-realtime'
import { LeadList } from '@/components/leads/lead-list'
import type { LeadWithOwner } from '@/types'

export default function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<LeadWithOwner | null>(null)

  // Get tenant from session (simplified for demo)
  const tenantId = 'current-tenant' // This would come from auth context

  useTenantRealtime({
    tenantId,
    onLeadChange: () => {
      // Refresh handled by React Query invalidation
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-gray-500">Gestiona tus contactos y prospectos</p>
      </div>
      <LeadList onLeadClick={(lead) => setSelectedLead(lead)} />

      {/* TODO: Add lead detail modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold mb-4">{selectedLead.name}</h2>
            <div className="space-y-2 text-gray-600 mb-4">
              {selectedLead.email && <p>Email: {selectedLead.email}</p>}
              {selectedLead.phone && <p>Teléfono: {selectedLead.phone}</p>}
              {selectedLead.company && <p>Empresa: {selectedLead.company}</p>}
            </div>
            <button
              onClick={() => setSelectedLead(null)}
              className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}