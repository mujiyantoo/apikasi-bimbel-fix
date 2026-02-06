'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  Users,
  UserCog,
  BookOpen,
  Wallet,
  Calculator,
  Crown,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Pimpinan', 'Staff'] },
  { name: 'Kesiswaan', href: '/dashboard/siswa', icon: Users, roles: ['Admin', 'Staff'] },
  { name: 'Kepegawaian', href: '/dashboard/pegawai', icon: UserCog, roles: ['Admin'] },
  { name: 'Akademik', href: '/dashboard/akademik', icon: BookOpen, roles: ['Admin', 'Staff'] },
  { name: 'Keuangan', href: '/dashboard/keuangan', icon: Wallet, roles: ['Admin', 'Staff'] },
  { name: 'Akuntansi', href: '/dashboard/akuntansi', icon: Calculator, roles: ['Admin'] },
  { name: 'Pimpinan', href: '/dashboard/pimpinan', icon: Crown, roles: ['Admin', 'Pimpinan'] },
  { name: 'Laporan', href: '/dashboard/laporan', icon: FileText, roles: ['Admin', 'Pimpinan'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const userRole = session?.user?.role || 'Staff'

  // Helper to normalize string to Title Case (e.g., 'admin' -> 'Admin')
  const normalizeRole = (role) => {
    if (!role) return 'Staff'
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
  }

  const normalizedUserRole = normalizeRole(userRole)

  const filteredMenu = menuItems.filter(item => item.roles.includes(normalizedUserRole))

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md lg:hidden"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-auto py-4 flex items-center justify-center px-6 border-b border-gray-200">
            <div className="relative w-full h-16">
              <Image
                src="/logo-bin.png"
                alt="Bina Insan Nusantara"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {filteredMenu.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 mr-3 transition-transform group-hover:scale-110",
                      isActive ? "text-white" : "text-gray-500"
                    )} />
                    {item.name}
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </Link>
                )
              })}
            </nav>
          </ScrollArea>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                  {session?.user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session?.user?.role || 'Role'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
