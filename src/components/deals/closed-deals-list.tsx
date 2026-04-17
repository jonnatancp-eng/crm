'use client'

import { useState } from 'react'
import { useClosedDeals } from '@/hooks/use-crm'
import { formatDate, getInitials, cn } from '@/lib/utils'
import type { ClosedDealWithRelations } from '@/types'

interface ClosedDealsListProps {
  onDealClick?: (deal: ClosedDealWithRelations) => void
}

export function ClosedDealsList({ onDealClick }: ClosedDealsListProps) {
  const { data: deals, loading, error, refetch } = useClosedDeals()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        <p>Error al cargar los negocios: {error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asignado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha cierre
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No hay negocios cerrados
                </td>
              </tr>
            ) : (
              deals.map(deal => (
                <tr
                  key={deal.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onDealClick?.(deal)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-green-700">
                          {getInitials(deal.lead?.name || '?' )}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {deal.lead?.name || 'Lead eliminado'}
                        </div>
                        {deal.lead?.company && (
                          <div className="text-sm text-gray-500">
                            {deal.lead.company}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {deal.lead?.email || '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {deal.lead?.phone || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {deal.value ? `$${deal.value.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {deal.assigned_to_user ? (
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          {deal.assigned_to_user.avatar_url ? (
                            <img
                              src={deal.assigned_to_user.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <span className="text-xs font-medium text-gray-600">
                              {getInitials(deal.assigned_to_user.name)}
                            </span>
                          )}
                        </div>
                        <span className="ml-2 text-sm text-gray-700">
                          {deal.assigned_to_user.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(deal.closed_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
