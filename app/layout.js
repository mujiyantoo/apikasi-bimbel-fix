import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'binbimbel',
  description: 'Sistem Manajemen Bimbingan Belajar Bina Insan Nusantara',
  manifest: '/manifest.json',
  applicationName: 'binbimbel',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'binbimbel',
  },
}

export const viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
