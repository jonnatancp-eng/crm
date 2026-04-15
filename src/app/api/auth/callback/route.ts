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

  await ensureUserProfile(data.accessToken, data.user)

  return NextResponse.redirect(new URL('/dashboard', request.url))
}

async function ensureUserProfile(
  accessToken: string,
  authUser: { id: string; email?: string | null; profile?: Record<string, unknown> | null }
) {
  const insforge = createServerClient(accessToken)

  const { data: existing } = await insforge.database
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle()

  if (existing) return

  const displayName =
    (typeof authUser.profile?.name === 'string' && authUser.profile.name) ||
    authUser.email?.split('@')[0] ||
    authUser.email ||
    'New User'

  const avatarUrl =
    typeof authUser.profile?.avatar_url === 'string' ? authUser.profile.avatar_url : null

  const { data: tenant, error: tenantError } = await insforge.database
    .from('tenants')
    .insert([{ name: `${displayName}'s workspace`, slug: authUser.id }])
    .select('id')
    .single()

  if (tenantError || !tenant) {
    console.error('Failed to create tenant:', tenantError)
    return
  }

  const { error: userError } = await insforge.database.from('users').insert([
    {
      id: authUser.id,
      tenant_id: tenant.id,
      name: displayName,
      avatar_url: avatarUrl,
      role: 'admin',
    },
  ])

  if (userError) {
    console.error('Failed to create user profile:', userError)
  }
}
