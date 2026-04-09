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

    console.log('CODE:', code)

    // 🔥 Validación de ENV
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

    // 🔥 DEBUG CLAVE
    console.log('STATUS:', res.status)

    const text = await res.text()
    console.log('RAW RESPONSE:', text)

    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('Response is not JSON')
    }

    if (!res.ok) {
      throw new Error(`Token exchange failed: ${text}`)
    }

    const accessToken = data.access_token
    const refreshToken = data.refresh_token

    console.log('TOKENS:', {
      accessToken,
      refreshToken,
    })

    if (!accessToken || !refreshToken) {
      throw new Error('Missing tokens in response')
    }

    // 🔥 Guardar cookies
    await setAuthCookies(accessToken, refreshToken)

    console.log('COOKIES SET')

    // 🔥 Redirigir
    redirect('/dashboard')
  } catch (err) {
    console.error('OAuth Callback Error:', err)
    redirect('/login')
  }
}