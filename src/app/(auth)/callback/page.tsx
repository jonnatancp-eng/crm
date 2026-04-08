import { redirect } from 'next/navigation'
import { setAuthCookies } from '@/lib/auth'

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  try {
    // 🔥 Tokens vienen en la URL
    const accessToken = searchParams.access_token as string
    const refreshToken = searchParams.refresh_token as string

    if (!accessToken || !refreshToken) {
      throw new Error('No tokens in callback URL')
    }

    // 🔥 Guardar cookies (CLAVE)
    await setAuthCookies(accessToken, refreshToken)

    // 🔥 Redirigir
    redirect('/dashboard')

  } catch (err) {
    console.error('Callback error:', err)
    redirect('/login')
  }
}