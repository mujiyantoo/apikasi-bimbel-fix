'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ArrowLeft, KeyRound, Loader2, Eye, EyeOff, ShieldCheck, User } from 'lucide-react'

export default function PengaturanPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // Form ganti password sendiri (semua role)
  const [formSendiri, setFormSendiri] = useState({ passwordLama: '', passwordBaru: '', konfirmasi: '' })
  const [showSendiri, setShowSendiri] = useState({ lama: false, baru: false, konfirmasi: false })
  const [loadingSendiri, setLoadingSendiri] = useState(false)
  const [pesanSendiri, setPesanSendiri] = useState(null)

  // Form reset password user lain (admin/owner)
  const [passwordReset, setPasswordReset] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [loadingReset, setLoadingReset] = useState(false)
  const [pesanReset, setPesanReset] = useState(null)

  const isAdminOrOwner = session?.user?.role === 'admin' || session?.user?.role === 'owner'

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status])

  useEffect(() => {
    if (session && isAdminOrOwner) fetchUsers()
  }, [session])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleGantiPasswordSendiri = async () => {
    setPesanSendiri(null)
    if (!formSendiri.passwordLama || !formSendiri.passwordBaru || !formSendiri.konfirmasi) {
      setPesanSendiri({ type: 'error', text: 'Semua field wajib diisi!' })
      return
    }
    if (formSendiri.passwordBaru !== formSendiri.konfirmasi) {
      setPesanSendiri({ type: 'error', text: 'Konfirmasi password tidak cocok!' })
      return
    }
    if (formSendiri.passwordBaru.length < 6) {
      setPesanSendiri({ type: 'error', text: 'Password baru minimal 6 karakter!' })
      return
    }
    setLoadingSendiri(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          passwordLama: formSendiri.passwordLama,
          passwordBaru: formSendiri.passwordBaru
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengganti password')
      setPesanSendiri({ type: 'success', text: 'Password berhasil diubah!' })
      setFormSendiri({ passwordLama: '', passwordBaru: '', konfirmasi: '' })
    } catch (err) {
      setPesanSendiri({ type: 'error', text: err.message })
    } finally {
      setLoadingSendiri(false)
    }
  }

  const handleResetPassword = async () => {
    setPesanReset(null)
    if (!selectedUser) {
      setPesanReset({ type: 'error', text: 'Pilih user terlebih dahulu!' })
      return
    }
    if (!passwordReset || passwordReset.length < 6) {
      setPesanReset({ type: 'error', text: 'Password minimal 6 karakter!' })
      return
    }
    setLoadingReset(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          passwordBaru: passwordReset,
          byAdmin: true
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mereset password')
      setPesanReset({ type: 'success', text: 'Password ' + selectedUser.nama + ' berhasil direset!' })
      setPasswordReset('')
      setSelectedUser(null)
    } catch (err) {
      setPesanReset({ type: 'error', text: err.message })
    } finally {
      setLoadingReset(false)
    }
  }

  const getRoleBadge = (role) => {
    const map = {
      owner: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      pegawai: 'bg-green-100 text-green-700'
    }
    return map[role?.toLowerCase()] || 'bg-gray-100 text-gray-700'
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1 bg-white">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pengaturan Password</h1>
            <p className="text-sm text-gray-500">{session?.user?.name} · {session?.user?.role}</p>
          </div>
        </div>

        {/* Ganti Password Sendiri */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-gray-900">Ganti Password Saya</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pesanSendiri && (
              <div className={'rounded-xl p-3 text-sm ' + (pesanSendiri.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                {pesanSendiri.text}
              </div>
            )}

            <div>
              <Label>Password Lama *</Label>
              <div className="relative">
                <Input
                  type={showSendiri.lama ? 'text' : 'password'}
                  value={formSendiri.passwordLama}
                  onChange={(e) => setFormSendiri({ ...formSendiri, passwordLama: e.target.value })}
                  placeholder="Masukkan password lama"
                />
                <button
                  type="button"
                  onClick={() => setShowSendiri({ ...showSendiri, lama: !showSendiri.lama })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSendiri.lama ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Password Baru * (min. 6 karakter)</Label>
              <div className="relative">
                <Input
                  type={showSendiri.baru ? 'text' : 'password'}
                  value={formSendiri.passwordBaru}
                  onChange={(e) => setFormSendiri({ ...formSendiri, passwordBaru: e.target.value })}
                  placeholder="Masukkan password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowSendiri({ ...showSendiri, baru: !showSendiri.baru })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSendiri.baru ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Konfirmasi Password Baru *</Label>
              <div className="relative">
                <Input
                  type={showSendiri.konfirmasi ? 'text' : 'password'}
                  value={formSendiri.konfirmasi}
                  onChange={(e) => setFormSendiri({ ...formSendiri, konfirmasi: e.target.value })}
                  placeholder="Ulangi password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowSendiri({ ...showSendiri, konfirmasi: !showSendiri.konfirmasi })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSendiri.konfirmasi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formSendiri.konfirmasi && formSendiri.passwordBaru !== formSendiri.konfirmasi && (
                <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
              )}
              {formSendiri.konfirmasi && formSendiri.passwordBaru === formSendiri.konfirmasi && formSendiri.passwordBaru && (
                <p className="text-xs text-green-600 mt-1">Password cocok</p>
              )}
            </div>

            <Button
              onClick={handleGantiPasswordSendiri}
              disabled={loadingSendiri}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loadingSendiri && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Simpan Password Baru
            </Button>
          </CardContent>
        </Card>

        {/* Reset Password User Lain - hanya admin/owner */}
        {isAdminOrOwner && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <h2 className="font-bold text-gray-900">Reset Password Pengguna</h2>
              </div>
              <p className="text-xs text-gray-500">Khusus Admin & Owner</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {pesanReset && (
                <div className={'rounded-xl p-3 text-sm ' + (pesanReset.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {pesanReset.text}
                </div>
              )}

              {/* Pilih User */}
              <div>
                <Label>Pilih Pengguna *</Label>
                {loadingUsers ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
                  </div>
                ) : (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                    {users.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-2">Tidak ada data pengguna</p>
                    )}
                    {users.map(user => (
                      <div
                        key={user.id}
                        onClick={() => { setSelectedUser(user); setPesanReset(null); setPasswordReset('') }}
                        className={'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ' + (selectedUser?.id === user.id ? 'bg-blue-100 border border-blue-300' : 'bg-white hover:bg-blue-50 border border-transparent')}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.nama}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <span className={'text-xs px-2 py-1 rounded font-medium ' + getRoleBadge(user.role)}>
                          {user.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedUser && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    Reset password untuk: <strong>{selectedUser.nama}</strong>
                  </div>
                  <div>
                    <Label>Password Baru * (min. 6 karakter)</Label>
                    <div className="relative">
                      <Input
                        type={showReset ? 'text' : 'password'}
                        value={passwordReset}
                        onChange={(e) => setPasswordReset(e.target.value)}
                        placeholder="Masukkan password baru"
                      />
                      <button
                        type="button"
                        onClick={() => setShowReset(!showReset)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showReset ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={handleResetPassword}
                    disabled={loadingReset}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {loadingReset && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Reset Password {selectedUser.nama}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
