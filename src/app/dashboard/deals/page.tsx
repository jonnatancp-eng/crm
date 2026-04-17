'use client'

import { useState } from 'react'
import { ClosedDealsList } from '@/components/deals/closed-deals-list'
import { LeadDetailDrawer } from '@/components/leads/lead-detail-drawer'
import type { ClosedDealWithRelations, LeadWithDetails } from '@/types'

export default function DealsPage() {
  const [selectedDeal, setSelectedDeal] = useState<ClosedDealWithRelations | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [refetchKey, setRefetchKey] = useState(0)

  const handleDealClick = (deal: ClosedDealWithRelations) => {
    setSelectedDeal(deal)
    setSelectedLeadId(deal.lead_id)
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setSelectedDeal(null)
    setSelectedLeadId(null)
  }

  const handleLeadUpdated = () => {
    setRefetchKey(k => k + 1)
  }

  const handleCreateDeal = (_lead: LeadWithDetails) => {
    // Closed from drawer - just refetch
    setRefetchKey(k => k + 1)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Negocios Cerrados</h1>
        <p className="text-gray-500">Historial de leads ganados</p>
      </div>

      <ClosedDealsList
        key={refetchKey}
        onDealClick={handleDealClick}
      />

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        leadId={selectedLeadId}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onCreateDeal={handleCreateDeal}
        onRefetch={handleLeadUpdated}
      />
    </div>
  )
}
