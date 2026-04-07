'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { insforge } from '@/lib/insforge'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for OAuth error in URL
        const errorParam = searchParams.get('error')
        if (errorParam) {
          throw new Error(`Authentication error: ${errorParam}`)
        }

        // Get current user from InsForge (SDK reads cookies automatically)
        const { data, error: userError } = await insforge.auth.getCurrentUser()

        if (userError || !data?.user) {
          throw new Error('No session found after OAuth callback')
        }

        // Successfully authenticated - redirect to dashboard
        // The SDK already saved tokens in cookies
        router.push('/')
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        // Redirect to login after error display
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-xl font-semibold text-red-600 mb-4">
            Error de Autenticación
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirigiendo al login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Completando autenticación...</p>
      </div>
    </div>
  )
}