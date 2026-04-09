import { redirect } from 'next/navigation';
import { setAuthCookies } from '@/lib/auth'; // tu función para cookies

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  try {
    const code = searchParams.code as string;
    if (!code) throw new Error('No se recibió code');

    // Intercambiar código por tokens
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_INSFORGE_URL}/auth/v1/token?grant_type=authorization_code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
        },
        body: JSON.stringify({ code }),
      }
    );

    if (!res.ok) throw new Error('Error en token endpoint');

    const data = await res.json();
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    if (!accessToken || !refreshToken) throw new Error('Tokens faltantes');

    // Guardar tokens en cookies (httpOnly, secure, etc.)
    await setAuthCookies(accessToken, refreshToken);

    // Redirigir al dashboard o ruta protegida
    redirect('/dashboard');
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    // En caso de fallo, ir a login
    redirect('/login');
  }
}
