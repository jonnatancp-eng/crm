// =====================================================
// Real-time Updates Hook
// =====================================================

'use client'

import { useEffect, useRef } from 'react'
import { insforge } from '@/lib/insforge'
// @ts-ignore
// import type { RealtimeChannel } from '@insforge/sdk'

interface UseRealtimeOptions {
  channel: string
  onMessage?: (event: string, payload: unknown) => void
  enabled?: boolean
}

export function useRealtime({ channel, onMessage, enabled = true }: UseRealtimeOptions) {
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!enabled) return

    const connect = async () => {
      await insforge.realtime.connect()

      // @ts-ignore
      const ch = insforge.realtime.subscribe(channel, (event: any, payload: any) => {
        onMessage?.(event, payload)
      })

      channelRef.current = ch
    }

    connect()

    return () => {
      if (channelRef.current) {
        insforge.realtime.unsubscribe(channelRef.current)
      }
    }
  }, [channel, onMessage, enabled])
}

// =====================================================
// Tenant-scoped Realtime Hook
// =====================================================

interface UseTenantRealtimeOptions {
  tenantId: string
  onLeadChange?: (action: string, lead: unknown) => void
  onDealChange?: (action: string, deal: unknown) => void
  onTaskChange?: (action: string, task: unknown) => void
  onActivity?: (activity: unknown) => void
  enabled?: boolean
}

export function useTenantRealtime({
  tenantId,
  onLeadChange,
  onDealChange,
  onTaskChange,
  onActivity,
  enabled = true,
}: UseTenantRealtimeOptions) {
  // Subscribe to leads channel
  useRealtime({
    channel: `leads:${tenantId}`,
    onMessage: (event, payload) => {
      if (event.startsWith('lead_')) {
        const action = event.replace('lead_', '')
        onLeadChange?.(action, payload)
      }
    },
    enabled,
  })

  // Subscribe to deals channel
  useRealtime({
    channel: `deals:${tenantId}`,
    onMessage: (event, payload) => {
      if (event.startsWith('deal_')) {
        const action = event.replace('deal_', '')
        onDealChange?.(action, payload)
      }
    },
    enabled,
  })

  // Subscribe to tasks channel
  useRealtime({
    channel: `tasks:${tenantId}`,
    onMessage: (event, payload) => {
      if (event.startsWith('task_')) {
        const action = event.replace('task_', '')
        onTaskChange?.(action, payload)
      }
    },
    enabled,
  })

  // Subscribe to activities channel
  useRealtime({
    channel: `activities:${tenantId}`,
    onMessage: (event, payload) => {
      if (event === 'new_activity') {
        onActivity?.(payload)
      }
    },
    enabled,
  })
}