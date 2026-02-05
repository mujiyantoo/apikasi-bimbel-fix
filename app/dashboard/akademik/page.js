'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Calendar, Clock, FileText } from 'lucide-react'

export default function AkademikPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Akademik</h1>
        <p className="text-gray-500 mt-1">Kelola jadwal, nilai, dan kurikulum</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-blue-50 rounded-xl w-fit">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Jadwal Pelajaran</CardTitle>
            <CardDescription>Kelola jadwal kelas dan tutor</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Kelola Jadwal</Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-emerald-50 rounded-xl w-fit">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">Nilai Siswa</CardTitle>
            <CardDescription>Input dan lihat nilai siswa</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Kelola Nilai</Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 bg-purple-50 rounded-xl w-fit">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Kurikulum</CardTitle>
            <CardDescription>Kelola materi dan silabus</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Kelola Kurikulum</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-8 text-center">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Modul Akademik</h3>
          <p className="text-gray-500 mt-2">Fitur lengkap akan segera tersedia. Termasuk manajemen jadwal, input nilai, dan pengelolaan kurikulum.</p>
        </CardContent>
      </Card>
    </div>
  )
}
