'use client'

import { useState } from 'react'
import { useTenantRealtime } from '@/hooks/use-realtime'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import type { DealWithOwner } from '@/types'

export default function PipelinePage() {
  const [selectedDeal, setSelectedDeal] = useState<DealWithOwner | null>(null)

  // Get tenant from session (simplified for demo)
  const tenantId = 'current-tenant' // This would come from auth context

  useTenantRealtime({
    tenantId,
    onDealChange: () => {
      // Refresh handled by React Query invalidation
    },
  })

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline de Ventas</h1>
        <p className="text-gray-500">Arrastra las oportunidades entre etapas</p>
      </div>
      <PipelineBoard
        tenantId={tenantId}
        onDealClick={(deal) => setSelectedDeal(deal)}
      />

      {/* TODO: Add deal detail modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold mb-4">{selectedDeal.title}</h2>
            <p className="text-gray-600 mb-4">{selectedDeal.value ? `$${selectedDeal.value.toLocaleString()}` : 'Sin valor'}</p>
            <button
              onClick={() => setSelectedDeal(null)}
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