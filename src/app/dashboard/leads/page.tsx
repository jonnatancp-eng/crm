'use client'

import { useState } from 'react'
import { useLeads, useLeadMutations, usePipeline } from '@/hooks/use-crm'
import { LeadList } from '@/components/leads/lead-list'
import { LeadDetailDrawer } from '@/components/leads/lead-detail-drawer'
import { CreateDealDialog } from '@/components/deals/create-deal-dialog'
import type { LeadWithOwner, LeadWithDetails } from '@/types'

export default function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<LeadWithOwner | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [createDealOpen, setCreateDealOpen] = useState(false)
  const [createDealLead, setCreateDealLead] = useState<LeadWithDetails | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)

  const { refetch: refetchLeads } = useLeads()
  const { refetch: refetchPipeline } = usePipeline()

  const handleLeadClick = (lead: LeadWithOwner) => {
    setSelectedLead(lead)
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setSelectedLead(null)
  }

  const handleCreateDeal = (lead: LeadWithDetails) => {
    setCreateDealLead(lead)
    setCreateDealOpen(true)
    setDrawerOpen(false)
  }

  const handleDealCreated = (dealId: string) => {
    setCreateDealOpen(false)
    setCreateDealLead(null)
    setRefetchKey(k => k + 1)
    refetchLeads()
    refetchPipeline()
  }

  const handleDealDeclined = (leadId: string) => {
    setCreateDealOpen(false)
    setCreateDealLead(null)
    setDrawerOpen(true)
    setRefetchKey(k => k + 1)
    refetchLeads()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-gray-500">Gestiona tus contactos y prospectos</p>
      </div>
      <LeadList onLeadClick={handleLeadClick} />

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        leadId={selectedLead?.id || null}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onCreateDeal={handleCreateDeal}
        onRefetch={() => {
          setRefetchKey(k => k + 1)
          refetchLeads()
        }}
      />

      {/* Create Deal Dialog */}
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