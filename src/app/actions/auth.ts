'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/insforge'

export async function initiateOAuthAction(provider: 'google' | 'facebook') {
  const insforge = createServerClient()

  const { data, error } = await insforge.auth.signInWithOAuth({
    provider,
    redirectTo: new URL('/api/auth/callback', process.env.NEXT_PUBLIC_APP_URL).toString(),
    skipBrowserRedirect: true,
  })

  if (error || !data?.url) {
    throw new Error(error?.message ?? 'OAuth init failed')
  }

  const cookieStore = await cookies()
  cookieStore.set('insforge_code_verifier', data.codeVerifier!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  redirect(data.url)
}

export async function setAuthCookiesAction(accessToken: string, refreshToken?: string) {
  const cookieStore = await cookies()

  cookieStore.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  if (refreshToken) {
    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
  }
}

export async function clearAuthCookiesAction() {
  const cookieStore = await cookies()
  cookieStore.delete('accessToken')
  cookieStore.delete('refreshToken')
}
