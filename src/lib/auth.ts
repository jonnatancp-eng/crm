// =====================================================
// Authentication Utilities
// =====================================================

import { insforge, createServerClient } from './insforge'
import type { User, Tenant } from '@/types'
import { cookies } from 'next/headers'

// =====================================================
// Client-side Auth Functions
// =====================================================

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name,
  })

  if (error) throw error
  return data
}

export async function verifyEmail(email: string, otp: string) {
  const { data, error } = await insforge.auth.verifyEmail({
    email,
    otp,
  })

  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await insforge.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signInWithGoogle(redirectTo?: string) {
  await insforge.auth.signInWithOAuth({
    provider: 'google',
    redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
  })
}

export async function signInWithFacebook(redirectTo?: string) {
  await insforge.auth.signInWithOAuth({
    provider: 'facebook',
    redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
  })
}

export async function signOut() {
  const { error } = await insforge.auth.signOut()
  if (error) throw error
}

export async function getCurrentSession() {
  const { data, error } = await insforge.auth.getCurrentSession()
  if (error) return null
  return data?.session || null
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession()
  if (!session) return null

  const { data, error } = await insforge.database
    .from('users')
    .select('*, tenant:tenants(*)')
    .eq('id', session.user.id)
    .single()

  if (error) return null
  return data as User
}

// =====================================================
// Server-side Auth Functions (for SSR)
// =====================================================

export async function getServerSession() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value
  const refreshToken = cookieStore.get('refreshToken')?.value

  if (!accessToken) return null

  const client = createServerClient(accessToken)
  const { data, error } = await client.auth.getCurrentSession()

  if (error) return null
  return data?.session || null
}

export async function getServerUser(): Promise<(User & { tenant: Tenant }) | null> {
  const session = await getServerSession()
  if (!session) return null

  const client = createServerClient(session.accessToken)
  const { data, error } = await client.database
    .from('users')
    .select('*, tenant:tenants(*)')
    .eq('id', session.user.id)
    .single()

  if (error) return null
  return data as User & { tenant: Tenant }
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()

  cookieStore.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  cookieStore.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
}

export async function clearAuthCookies() {
  const cookieStore = await cookies()

  cookieStore.delete('accessToken')
  cookieStore.delete('refreshToken')
}

// =====================================================
// Permission Helpers
// =====================================================

export function isAdmin(user: User): boolean {
  return user.role === 'admin'
}

export function isCloser(user: User): boolean {
  return user.role === 'closer' || user.role === 'admin'
}

export function isSetter(user: User): boolean {
  return user.role === 'setter' || user.role === 'closer' || user.role === 'admin'
}

export function canManageUsers(user: User): boolean {
  return isAdmin(user)
}

export function canDeleteLeads(user: User): boolean {
  return isAdmin(user)
}

export function canViewAllLeads(user: User): boolean {
  return isAdmin(user)
}

export function canAssignLeads(user: User): boolean {
  return isAdmin(user) || user.role === 'closer'
}

export function canViewReports(user: User): boolean {
  return isAdmin(user) || user.role === 'closer'
}