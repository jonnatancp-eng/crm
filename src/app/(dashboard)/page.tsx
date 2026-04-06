import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard/dashboard'

export default async function HomePage() {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  return <Dashboard tenantId={user.tenant_id} />
}