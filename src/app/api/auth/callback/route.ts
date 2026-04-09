import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Debug: log TODO lo que llega
  const allParams = Object.fromEntries(searchParams.entries())
  console.log('🔥 CALLBACK DEBUG - ALL PARAMS:', JSON.stringify(allParams, null, 2))
  console.log('🔥 FULL URL:', request.url)
  
  const insforgeCode = searchParams.get('insforge_code')
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  console.log('🔥 PARSED:', { insforgeCode, code, error })

  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=${error}`
    )
  }

  // Try insforge_code first, then code
  const authCode = insforgeCode || code

  if (!authCode) {
    console.error('❌ NO CODE FOUND - params were:', Object.keys(allParams))
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=no_code`
    )
  }

  try {
    console.log('🔥 Exchanging code for tokens...')
    
    // Exchange code for tokens
    const tokenResponse = await fetch(
      `${process.env.NEXT_PUBLIC_INSFORGE_URL}/auth/v1/token?grant_type=authorization_code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
        },
        body: JSON.stringify({ code: authCode }),
      }
    )

    console.log('🔥 Token response status:', tokenResponse.status)

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

    console.log('✅ OAuth successful, redirecting to dashboard')
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
  } catch (err) {
    console.error('❌ OAuth callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=auth_failed`
    )
  }
}
