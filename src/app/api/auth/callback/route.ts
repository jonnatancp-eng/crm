import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/insforge'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const code = params.get('insforge_code') ?? params.get('code')
  const oauthError = params.get('error')

  if (oauthError || !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${oauthError ?? 'oauth_failed'}`, request.url)
    )
  }

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('insforge_code_verifier')?.value

  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/login?error=missing_verifier', request.url))
  }

  const insforge = createServerClient()
  const { data, error } = await insforge.auth.exchangeOAuthCode(code, codeVerifier)

  if (error || !data?.accessToken) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error?.message ?? 'exchange_failed')}`, request.url)
    )
  }

  cookieStore.set('accessToken', data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  if (data.refreshToken) {
    cookieStore.set('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  cookieStore.delete('insforge_code_verifier')

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
