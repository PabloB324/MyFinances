import type { Metadata, Viewport } from 'next'
import { ClientRoot } from './client-root'
import './globals.css'

export const metadata: Metadata = {
  title: 'MyFinances',
  description: 'Tu app personal de finanzas',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6366f1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  )
}
