import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const insforgeCode = searchParams.get('insforge_code')
  const error = searchParams.get('error')

  console.log('OAuth Callback:', {
    insforgeCode: insforgeCode ? insforgeCode.substring(0, 20) + '...' : null,
    error,
  })

  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=${error}`
    )
  }

  if (!insforgeCode) {
    console.error('No insforge_code in callback')
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=no_code`
    )
  }

  try {
    // Exchange insforge_code for tokens
    const tokenResponse = await fetch(
      `${process.env.NEXT_PUBLIC_INSFORGE_URL}/auth/v1/token?grant_type=authorization_code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
        },
        body: JSON.stringify({ code: insforgeCode }),
      }
    )

    console.log('Token exchange response:', tokenResponse.status)

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`)
    }

    const { access_token, refresh_token } = tokenData

    if (!access_token) {
      throw new Error('No access token in response')
    }

    // Set cookies
    const cookieStore = await cookies()
    cookieStore.set('accessToken', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    if (refresh_token) {
      cookieStore.set('refreshToken', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
    }

    console.log('OAuth successful, redirecting to dashboard')
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=auth_failed`
    )
  }
}
