import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Bimbel Management System',
  description: 'Sistem Manajemen Bimbingan Belajar',
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
