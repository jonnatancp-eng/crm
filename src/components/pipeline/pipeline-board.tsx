'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { usePipeline, useDealMutations } from '@/hooks/use-crm'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { DealWithOwner, DealStage } from '@/types'
import { DealCard } from './deal-card'
import { PipelineColumn } from './pipeline-column'

interface PipelineBoardProps {
  tenantId: string
  onDealClick?: (deal: DealWithOwner) => void
}

const STAGES: { id: DealStage; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'contacted', label: 'Contactado' },
  { id: 'qualified', label: 'Calificado' },
  { id: 'scheduled', label: 'Agendado' },
  { id: 'closed_won', label: 'Ganado' },
  { id: 'closed_lost', label: 'Perdido' },
]

export function PipelineBoard({ tenantId, onDealClick }: PipelineBoardProps) {
  const { data, loading, refetch } = usePipeline()
  const { updateDealStage } = useDealMutations()
  const [activeDeal, setActiveDeal] = useState<DealWithOwner | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const deal = Object.values(data)
      .flat()
      .find(d => d.id === active.id)
    setActiveDeal(deal || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)

    if (!over) return

    const dealId = active.id as string
    const newStage = over.id as DealStage

    // Find the deal
    const deal = Object.values(data)
      .flat()
      .find(d => d.id === dealId)

    if (!deal || deal.stage === newStage) return

    try {
      await updateDealStage(dealId, newStage)
      refetch()
    } catch (error) {
      console.error('Failed to update deal stage:', error)
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
    <div className="h-full overflow-x-auto">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full min-w-max p-4">
          {STAGES.map(stage => {
            const deals = data[stage.id] || []
            const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)

            return (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                deals={deals}
                totalValue={totalValue}
                onDealClick={onDealClick}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeDeal && (
            <DealCard deal={activeDeal} onClick={() => {}} isDragging />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}