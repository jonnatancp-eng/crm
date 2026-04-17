'use client'

import { useState } from 'react'
import { useTenantRealtime } from '@/hooks/use-realtime'
import { useDealMutations } from '@/hooks/use-crm'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { CreateDealDialog } from '@/components/deals/create-deal-dialog'
import type { DealWithOwner, LeadWithDetails } from '@/types'

export default function PipelinePage() {
  const [selectedDeal, setSelectedDeal] = useState<DealWithOwner | null>(null)
  const [createDealOpen, setCreateDealOpen] = useState(false)
  const [createDealLead, setCreateDealLead] = useState<LeadWithDetails | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)

  const tenantId = 'current-tenant'

  useTenantRealtime({
    tenantId,
    onDealChange: () => {},
  })

  const handleDealClick = (deal: DealWithOwner) => {
    setSelectedDeal(deal)
  }

  const handleWonTransition = async (deal: DealWithOwner) => {
    try {
      const res = await fetch(`/functions/api/deals?id=${deal.id}&action=stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'closed_won' }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      const { alreadyHasDeal, dealOfferDeclined } = json

      if (alreadyHasDeal || dealOfferDeclined) return

      if (deal.lead_id) {
        const leadRes = await fetch(`/functions/api/leads?id=${deal.lead_id}`)
        const leadJson = await leadRes.json()
        if (leadRes.ok && leadJson.data) {
          setCreateDealLead(leadJson.data)
          setCreateDealOpen(true)
        }
      }
    } catch (err) {
      console.error('Failed to transition deal to won:', err)
    }
  }

  const handleCreateDeal = (lead: LeadWithDetails) => {
    setCreateDealLead(lead)
    setCreateDealOpen(true)
  }

  const handleDealCreated = (_dealId: string) => {
    setCreateDealOpen(false)
    setCreateDealLead(null)
    setRefetchKey(k => k + 1)
  }

  const handleDealDeclined = (_leadId: string) => {
    setCreateDealOpen(false)
    setCreateDealLead(null)
    setRefetchKey(k => k + 1)
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline de Ventas</h1>
        <p className="text-gray-500">Arrastra las oportunidades entre etapas</p>
      </div>
      <PipelineBoard
        tenantId={tenantId}
        key={refetchKey}
        onDealClick={handleDealClick}
        onWonTransition={handleWonTransition}
      />

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

      {createDealLead && (
        <CreateDealDialog
          lead={createDealLead}
          open={createDealOpen}
          onClose={() => {
            setCreateDealOpen(false)
            setCreateDealLead(null)
          }}
          onCreated={handleDealCreated}
          onDeclined={handleDealDeclined}
        />
      )}
    </div>
  )
}