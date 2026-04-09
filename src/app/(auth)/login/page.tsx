'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { insforge } from '@/lib/insforge'
import { setAuthCookiesAction } from '@/app/actions/auth'

export default function LoginPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [showOtp, setShowOtp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up
        const { data, error: signUpError } = await insforge.auth.signUp({
          email,
          password,
          name,
        })

        if (signUpError) throw signUpError

        if (data?.requireEmailVerification) {
          // Show OTP input
          setShowOtp(true)
        } else if (data?.accessToken) {
          // User is signed in
          await setAuthCookiesAction(data.accessToken, data.refreshToken)
          router.push('/')
        }
      } else {
        // Sign in
        const { data, error: signInError } = await insforge.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        if (data?.accessToken) {
          await setAuthCookiesAction(data.accessToken, data.refreshToken)
        }

        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: verifyError } = await insforge.auth.verifyEmail({
        email,
        otp,
      })

      if (verifyError) throw verifyError

      if (data?.accessToken) {
        await setAuthCookiesAction(data.accessToken, data.refreshToken)
      }

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      console.log('Starting Google OAuth with SDK')
      // El SDK maneja OAuth completamente
      // Shared Keys: el SDK redirige todo a Insforge
      // Insforge autentica y vuelve con sesión guardada
      await insforge.auth.signInWithOAuth({
        provider: 'google',
      })
      // No necesitamos redirect manual
      // El SDK debería recargar la página o detectar sesión
      // Espera 2 segundos y refresca
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)
    } catch (err) {
      console.error('Google sign in error:', err)
      setError(err instanceof Error ? err.message : 'Google sign in failed')
    }
  }

  const handleFacebookSignIn = async () => {
    try {
      console.log('Starting Facebook OAuth with SDK')
      // El SDK maneja OAuth completamente
      await insforge.auth.signInWithOAuth({
        provider: 'facebook',
      })
      // No necesitamos redirect manual
      // Espera 2 segundos y refresca
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)
    } catch (err) {
      console.error('Facebook sign in error:', err)
      setError(err instanceof Error ? err.message : 'Facebook sign in failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            CRM
          </h1>
          <h2 className="mt-2 text-center text-sm text-gray-600">
            Sistema de Gestión de Leads
          </h2>
        </div>

        {showOtp ? (
          // OTP verification form
          <form onSubmit={handleVerifyOtp} className="mt-8 space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Hemos enviado un código de verificación a <strong>{email}</strong>
              </p>
              <label htmlFor="otp" className="sr-only">
                Código de verificación
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Código de 6 dígitos"
                value={otp}
                onChange={e => setOtp(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>
        ) : (
          // Login/Sign up form
          <form onSubmit={handleEmailAuth} className="mt-8 space-y-6">
            <div className="space-y-4">
              {isSignUp && (
                <div>
                  <label htmlFor="name" className="sr-only">
                    Nombre
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={isSignUp}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Nombre completo"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="sr-only">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {loading
                ? 'Cargando...'
                : isSignUp
                  ? 'Crear cuenta'
                  : 'Iniciar sesión'}
            </button>

            <div className="text-center">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500 text-sm"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp
                  ? '¿Ya tienes cuenta? Inicia sesión'
                  : '¿No tienes cuenta? Regístrate'}
              </button>
            </div>
          </form>
        )}

        {!showOtp && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">O continúa con</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.12.81-.72z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>

              <button
                type="button"
                onClick={handleFacebookSignIn}
                className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}