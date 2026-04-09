import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error')
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')

  console.log('OAuth Callback received:', {
    error,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    allParams: Array.from(searchParams.keys()),
  })

  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=${error}`
    )
  }

  try {
    if (accessToken) {
      // Set cookies if tokens are passed
      const cookieStore = await cookies()
      cookieStore.set('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })

      if (refreshToken) {
        cookieStore.set('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        })
      }

      console.log('Tokens set from query params')
    }

    console.log('OAuth callback successful, redirecting to dashboard')
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=auth_failed`
    )
  }
}
