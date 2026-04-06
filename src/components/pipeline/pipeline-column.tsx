'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { DealCard } from './deal-card'
import type { DealWithOwner, DealStage } from '@/types'

interface PipelineColumnProps {
  stage: { id: DealStage; label: string }
  deals: DealWithOwner[]
  totalValue: number
  onDealClick?: (deal: DealWithOwner) => void
}

const stageColors: Record<DealStage, { bg: string; border: string; badge: string }> = {
  lead: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100' },
  contacted: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100' },
  qualified: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100' },
  scheduled: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100' },
  closed_won: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100' },
  closed_lost: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100' },
}

export function PipelineColumn({ stage, deals, totalValue, onDealClick }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const colors = stageColors[stage.id]

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-80 min-h-0 rounded-lg border-2',
        colors.bg,
        isOver ? 'border-blue-400' : colors.border
      )}
    >
      {/* Column header */}
      <div className={cn('px-3 py-2 border-b', colors.border)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{stage.label}</h3>
          <span className="text-sm font-medium text-gray-500 bg-white px-2 py-0.5 rounded">
            {deals.length}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {formatCurrency(totalValue)}
        </p>
      </div>

      {/* Deals list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 kanban-column">
        <SortableContext
          items={deals.map(d => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick?.(deal)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add deal button */}
      <button
        className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors rounded-b-lg"
      >
        <Plus className="h-4 w-4" />
        <span>Agregar oportunidad</span>
      </button>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}