// =====================================================
// InsForge Client Configuration
// =====================================================

import { createClient } from '@insforge/sdk'

// InsForge project configuration
const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://gedn635p.us-east.insforge.app'
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || ''

// Client-side InsForge instance
export const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
})

// Server-side InsForge instance (for SSR/API routes)
export function createServerClient(accessToken?: string) {
  return createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    isServerMode: true,
    edgeFunctionToken: accessToken,
  })
}

// Export types for convenience
// export type { User, Session } from '@insforge/sdk'
export type User = any;
export type Session = any;