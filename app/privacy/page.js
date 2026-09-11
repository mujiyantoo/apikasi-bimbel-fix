import Link from 'next/link'

export const metadata = {
  title: 'Kebijakan Privasi - binbimbel',
  description: 'Kebijakan Privasi aplikasi binbimbel (Bina Insan Nusantara)',
}

const KONTAK_EMAIL = 'muj582@gmail.com'
const TERAKHIR_DIPERBARUI = '11 September 2026'

function Bab({ nomor, judul, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold" style={{ color: '#2d7d6f' }}>
        {nomor}. {judul}
      </h2>
      <div className="mt-3 space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  )
}

export default function KebijakanPrivasiPage() {
  return (
    <div className="min-h-screen py-10 px-4" style={{ background: 'linear-gradient(135deg, #e8f5f3 0%, #fff8f0 50%, #e8f5f3 100%)' }}>
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 sm:p-12">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center" style={{ width: 96, height: 96 }}>
            <img src="/logo.png" alt="Logo Bina Insan Nusantara" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold" style={{ color: '#2d7d6f' }}>
            Kebijakan Privasi
          </h1>
          <p className="mt-1 text-sm text-gray-500">Aplikasi binbimbel &mdash; Bina Insan Nusantara</p>
          <p className="mt-1 text-xs text-gray-400">Terakhir diperbarui: {TERAKHIR_DIPERBARUI}</p>
        </div>

        <Bab nomor="1" judul="Pengantar">
          <p>
            Kebijakan Privasi ini menjelaskan bagaimana aplikasi &quot;binbimbel&quot; (selanjutnya disebut
            &quot;Aplikasi&quot;) yang dikelola oleh Bina Insan Nusantara (&quot;Kami&quot;) mengumpulkan,
            menggunakan, dan melindungi data pribadi pengguna. Aplikasi ini merupakan sistem manajemen
            bimbingan belajar yang digunakan untuk mencatat data pendaftaran, data siswa, data pengajar,
            kehadiran, jadwal, kinerja, dan keuangan.
          </p>
          <p>
            Dengan menggunakan Aplikasi, Anda menyetujui pengumpulan dan penggunaan data sebagaimana
            diuraikan dalam kebijakan ini.
          </p>
        </Bab>

        <Bab nomor="2" judul="Data yang Kami Kumpulkan">
          <p>Kami mengumpulkan data berikut untuk keperluan operasional bimbel:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Data Calon Siswa (Pendaftaran): nama lengkap, kelas, nomor telepon, program bimbel, dan tanggal pendaftaran.</li>
            <li>Data Siswa: nama, nomor induk siswa (NIS), kelas, mata pelajaran, jenis kelamin, nomor telepon, alamat, dan tanggal masuk.</li>
            <li>Data Pengajar/Pegawai: nama, dan data kehadiran/kinerja terkait pekerjaan.</li>
            <li>Data Kehadiran &amp; Kinerja: catatan absensi, jadwal mengajar, dan perhitungan gaji.</li>
            <li>Data Akun: alamat email dan kata sandi (disimpan dalam bentuk terenkripsi/hashed).</li>
            <li>Data transaksi keuangan: catatan pembayaran SPP dan pengeluaran bimbel.</li>
          </ul>
        </Bab>

        <Bab nomor="3" judul="Bagaimana Kami Menggunakan Data">
          <p>Data yang dikumpulkan digunakan semata-mata untuk:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Memproses pendaftaran calon siswa menjadi siswa definitif.</li>
            <li>Mengelola data siswa, jadwal, dan kehadiran.</li>
            <li>Menghitung kinerja dan gaji pengajar.</li>
            <li>Mencatat pembayaran dan pengeluaran keuangan bimbel.</li>
            <li>Menjaga keamanan dan operasional aplikasi.</li>
          </ul>
          <p>
            Kami TIDAK menjual, menyewakan, atau membagikan data pribadi pengguna kepada pihak ketiga
            untuk keperluan komersial.
          </p>
        </Bab>

        <Bab nomor="4" judul="Penyimpanan & Keamanan Data">
          <p>
            Data disimpan pada server database yang aman (MongoDB Atlas) dengan akses terbatas hanya bagi
            pengelola bimbel yang berwenang. Kata sandi pengguna dienkripsi dan tidak dapat dibaca kembali.
            Kami berupaya melindungi data dengan prosedur keamanan yang wajar, namun tidak dapat menjamin
            keamanan mutlak terhadap seluruh risiko di internet.
          </p>
        </Bab>

        <Bab nomor="5" judul="Hak Pengguna">
          <p>Sesuai peraturan yang berlaku, pengguna berhak:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Meminta akses atas data pribadinya.</li>
            <li>Meminta perbaikan data yang tidak akurat.</li>
            <li>Meminta penghapusan data pribadinya, kecuali data tersebut wajib disimpan untuk keperluan administrasi bimbel.</li>
          </ul>
          <p>Untuk menggunakan hak tersebut, silakan hubungi Kami melalui kontak di bawah ini.</p>
        </Bab>

        <Bab nomor="6" judul="Data Anak di Bawah Umur">
          <p>
            Sebagian data siswa merupakan data anak di bawah umur yang dikumpulkan dari orang tua/wali atau
            melalui pendaftaran resmi. Data tersebut hanya digunakan untuk keperluan manajemen bimbel dan
            tidak dibagikan kepada pihak luar tanpa persetujuan.
          </p>
        </Bab>

        <Bab nomor="7" judul="Perubahan Kebijakan">
          <p>
            Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan akan diinformasikan
            melalui Aplikasi atau melalui kontak resmi bimbel.
          </p>
        </Bab>

        <Bab nomor="8" judul="Kontak">
          <p>Apabila Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, silakan hubungi:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email: <a className="underline" style={{ color: '#2d7d6f' }} href={`mailto:${KONTAK_EMAIL}`}>{KONTAK_EMAIL}</a></li>
            <li>Website: <a className="underline" style={{ color: '#2d7d6f' }} href="https://www.bin.biz.id">https://www.bin.biz.id</a></li>
          </ul>
        </Bab>

        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <Link href="/login" className="text-sm font-medium" style={{ color: '#2d7d6f' }}>
            &larr; Kembali ke halaman masuk
          </Link>
          <p className="mt-3 text-xs text-gray-400">binbimbel &mdash; Bina Insan Nusantara</p>
        </div>
      </div>
    </div>
  )
}
