import Providers from '@/components/Providers'
import Sidebar from '@/components/Sidebar'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <Providers>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <main className="page-content">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  )
}
