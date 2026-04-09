import { redirect } from 'next/navigation'
import { setAuthCookies } from '@/lib/auth'

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  try {
    const code = searchParams.code as string

    if (!code) {
      throw new Error('No code in callback')
    }

    // 🔥 LLAMADA DIRECTA A INSFORGE
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_INSFORGE_URL}/auth/v1/token?grant_type=authorization_code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
        },
        body: JSON.stringify({
          code,
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      throw new Error('Failed to exchange code')
    }

    const accessToken = data.access_token
    const refreshToken = data.refresh_token

    if (!accessToken || !refreshToken) {
      throw new Error('Missing tokens')
    }

    // 🔥 GUARDAR COOKIES
    await setAuthCookies(accessToken, refreshToken)

    redirect('/dashboard')

  } catch (err) {
    console.error('Callback error:', err)
    redirect('/login')
  }
}