import { NextResponse } from 'next/server'

export async function GET() {
  // Insforge maneja OAuth en su dominio.
  // Los tokens están guardados en su dominio, no aquí.
  // Solo redirigimos al dashboard, el SDK detectará la sesión.
  console.log('OAuth callback received - redirecting to dashboard')
  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL))
}
