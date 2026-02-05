# Bimbel Management System

Sistem Manajemen Bimbingan Belajar - Aplikasi web untuk mengelola data siswa, pegawai, dan operasional bimbingan belajar.

## Fitur yang Sudah Tersedia

### ✅ Authentication
- Login dengan NextAuth.js
- Role-based access (Admin, Pimpinan, Staff)
- Protected routes

### ✅ Dashboard Utama
- Cards statistik ringkasan (Total Siswa, Total Pegawai, Pembayaran Pending, Total Pendapatan)
- Aksi cepat ke menu utama
- Log aktivitas terkini

### ✅ Dashboard Pimpinan
- KPI Cards dengan design gradient
- Chart Trend Pendapatan Bulanan (Bar Chart)
- Chart Pertumbuhan Jumlah Siswa (Line Chart)
- Distribusi Siswa per Jenjang (Pie Chart)
- Status Pembayaran SPP (Progress bars)
- Ringkasan eksekutif

### ✅ Kesiswaan (CRUD Data Siswa)
- Tabel data siswa dengan search dan filter kelas
- Form tambah/edit siswa
- Hapus siswa
- Field: Nama, NIS, Kelas, Jenis Kelamin, Telepon, Alamat

### ✅ Kepegawaian (CRUD Data Pegawai)
- Tabel data pegawai dengan search
- Form tambah/edit pegawai
- Hapus pegawai
- Field: Nama, NIP, Jabatan, Jenis Kelamin, Telepon, Alamat

### ✅ Laporan
- Export data siswa ke PDF
- Export data siswa ke Excel
- Export data pegawai ke PDF
- Export data pegawai ke Excel

### ✅ Modul Placeholder
- Akademik (jadwal, nilai, kurikulum)
- Keuangan (pembayaran SPP)
- Akuntansi (buku kas, jurnal)

## Tech Stack

- **Frontend**: Next.js 14 App Router
- **UI Components**: shadcn/ui + Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: MongoDB
- **Charts**: Recharts
- **Export**: jsPDF + xlsx

## Akun Demo

```
Email: admin@bimbel.com
Password: admin123
```

## API Endpoints

### Dashboard
- `GET /api/dashboard/stats` - Statistik dashboard

### Siswa
- `GET /api/siswa` - List siswa (dengan query: search, kelas)
- `POST /api/siswa` - Tambah siswa
- `PUT /api/siswa/:id` - Update siswa
- `DELETE /api/siswa/:id` - Hapus siswa

### Pegawai
- `GET /api/pegawai` - List pegawai (dengan query: search)
- `POST /api/pegawai` - Tambah pegawai
- `PUT /api/pegawai/:id` - Update pegawai
- `DELETE /api/pegawai/:id` - Hapus pegawai

### Pembayaran
- `GET /api/pembayaran` - List pembayaran
- `POST /api/pembayaran` - Tambah pembayaran

### Users
- `GET /api/users` - List users
- `POST /api/users` - Tambah user

## Struktur Folder

```
/app
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.js  # NextAuth handler
│   │   └── [[...path]]/route.js         # API routes
│   ├── dashboard/
│   │   ├── page.js                      # Dashboard utama
│   │   ├── layout.js                    # Dashboard layout
│   │   ├── siswa/page.js               # Halaman siswa
│   │   ├── pegawai/page.js             # Halaman pegawai
│   │   ├── pimpinan/page.js            # Dashboard pimpinan
│   │   ├── akademik/page.js            # Halaman akademik
│   │   ├── keuangan/page.js            # Halaman keuangan
│   │   ├── akuntansi/page.js           # Halaman akuntansi
│   │   └── laporan/page.js             # Halaman laporan
│   ├── login/page.js                    # Halaman login
│   ├── page.js                          # Home redirect
│   ├── layout.js                        # Root layout
│   ├── providers.js                     # Session provider
│   └── globals.css                      # Global styles
├── components/
│   └── sidebar.js                       # Sidebar navigasi
├── lib/
│   ├── auth.js                          # Auth utilities
│   └── utils.js                         # Utility functions
└── .env                                 # Environment variables
```

## Environment Variables

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=bimbel_db
NEXT_PUBLIC_BASE_URL=https://your-domain.com
CORS_ORIGINS=*
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Cara Menjalankan

1. Install dependencies:
```bash
yarn install
```

2. Jalankan development server:
```bash
yarn dev
```

3. Buka http://localhost:3000

## Pengembangan Selanjutnya

- [ ] Fitur lengkap modul Akademik (jadwal, nilai, kurikulum)
- [ ] Fitur lengkap modul Keuangan (pembayaran SPP)
- [ ] Fitur lengkap modul Akuntansi (buku kas, jurnal)
- [ ] Laporan lebih lengkap per modul
- [ ] Manajemen user dan role
- [ ] Notifikasi pembayaran
