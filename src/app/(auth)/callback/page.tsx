'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { insforge } from '@/lib/insforge'
import { setAuthCookiesAction } from '@/app/actions/auth'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // The InsForge SDK handles the OAuth callback automatically and securely saves flags internally
        // @ts-ignore - explicitly accessing sync getSession missing in typings
        const session = insforge.auth.getSession()

        if (session?.accessToken) {
          // Successfully authenticated, setup server-side auth cookies
          await setAuthCookiesAction(session.accessToken, session.refreshToken)
          router.push('/')
        } else {
          throw new Error('No session found')
        }
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
  }, [router])

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