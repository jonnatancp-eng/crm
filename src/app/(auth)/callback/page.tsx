export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { setAuthCookies } from '@/lib/auth'

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  try {
    // 🔥 Obtener code correctamente tipado
    const codeParam = searchParams.code

    const code =
      typeof codeParam === 'string'
        ? codeParam
        : Array.isArray(codeParam)
        ? codeParam[0]
        : null

    if (!code) {
      throw new Error('No code in callback')
    }

    // 🔥 Validación de ENV (pro)
    if (!process.env.NEXT_PUBLIC_INSFORGE_URL) {
      throw new Error('Missing INSFORGE URL')
    }

    if (!process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) {
      throw new Error('Missing INSFORGE ANON KEY')
    }

    // 🔥 Exchange code → tokens
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_INSFORGE_URL}/auth/v1/token?grant_type=authorization_code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
        },
        body: JSON.stringify({ code }),
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Token exchange failed: ${errorText}`)
    }

    const data = await res.json()

    const accessToken = data.access_token
    const refreshToken = data.refresh_token

    if (!accessToken || !refreshToken) {
      throw new Error('Missing tokens in response')
    }

    // 🔥 Guardar cookies (clave para SSR)
    await setAuthCookies(accessToken, refreshToken)

    // 🔥 Redirigir a dashboard
    redirect('/dashboard')
  } catch (err) {
    console.error('OAuth Callback Error:', err)
    redirect('/login')
  }
}