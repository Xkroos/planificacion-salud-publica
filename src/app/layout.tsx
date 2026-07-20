import type { Metadata } from 'next'
import './globals.css'
import { ToasterProvider } from '@/components/ToasterProvider'

import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'Sistema de Planificación Académica — UNERG',
  description: 'Sistema de Gestión de Cronogramas Académicos del Decanato de Postgrado de la Universidad Nacional Experimental Rómulo Gallegos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ToasterProvider />
        {children}
      </body>
    </html>
  )
}
