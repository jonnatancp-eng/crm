'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import type { DealWithOwner } from '@/types'

interface DealCardProps {
  deal: DealWithOwner
  onClick?: () => void
  isDragging?: boolean
}

export function DealCard({ deal, onClick, isDragging }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragging = isDragging || isSortableDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer',
        'hover:shadow-md transition-shadow',
        dragging && 'opacity-50 shadow-lg'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
          {deal.title}
        </h3>
        {deal.value && (
          <span className="text-sm font-semibold text-gray-700">
            {formatCurrency(deal.value)}
          </span>
        )}
      </div>

      {/* Lead info */}
      {deal.lead && (
        <p className="text-xs text-gray-500 mb-2">
          {deal.lead.name}
          {deal.lead.company && ` - ${deal.lead.company}`}
        </p>
      )}

      {/* Owner */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
            {deal.owner?.avatar_url ? (
              <img
                src={deal.owner.avatar_url}
                alt={deal.owner.name || ''}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <span className="text-xs font-medium text-gray-600">
                {getInitials(deal.owner?.name)}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {deal.owner?.name || 'Sin asignar'}
          </span>
        </div>
        {deal.expected_close_date && (
          <span className="text-xs text-gray-400">
            {formatDate(deal.expected_close_date)}
          </span>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}