'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('Email atau password salah')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #e8f5f3 0%, #fff8f0 50%, #e8f5f3 100%)' }}>
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-2">

          <div className="mx-auto flex items-center justify-center" style={{ width: 110, height: 110 }}>
            <img
              src="/logo.png"
              alt="Logo Bimbel"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <div>
            <CardTitle className="text-2xl font-bold" style={{ color: '#2d7d6f' }}>
              Bimbel Management
            </CardTitle>
            <CardDescription className="mt-1" style={{ color: '#f5821f' }}>
              Sistem Manajemen Bimbingan Belajar
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Masukkan email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
                style={{ borderColor: '#2d7d6f' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
                style={{ borderColor: '#2d7d6f' }}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-white font-medium shadow-md"
              style={{ background: 'linear-gradient(to right, #2d7d6f, #3a9e8d)' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          {/* Whitespace + Credit */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              UI/UX designed by{' '}
              <span style={{ color: '#2d7d6f' }} className="font-medium">Mujiyanto</span>
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
