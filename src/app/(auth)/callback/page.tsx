export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { setAuthCookies } from '@/lib/auth'

export default async function CallbackPage({ searchParams }) {
  try {
    const code = searchParams.code

    if (!code) throw new Error('No code')

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_INSFORGE_URL}/auth/v1/token?grant_type=authorization_code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
        },
        body: JSON.stringify({ code }),
      }
    )

    const data = await res.json()

    await setAuthCookies(data.access_token, data.refresh_token)

    redirect('/dashboard')
  } catch (err) {
    console.error(err)
    redirect('/login')
  }
}