import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardLayout
      user={{
        name: user.name,
        email: user.tenant.slug, // Using tenant slug as placeholder
        role: user.role,
        avatar_url: user.avatar_url,
      }}
    >
      {children}
    </DashboardLayout>
  )
}