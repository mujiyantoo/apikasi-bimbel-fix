const BASE_URL = 'http://localhost:3000';

async function seedData() {
    console.log('🌱 Seeding one student data...');

    const newSiswa = {
        nama: "Siswa Contoh",
        nis: "1234567890",
        kelas: "12 SMA",
        mataPelajaran: "Matematika",
        jenisKelamin: "Laki-laki",
        alamat: "Jl. Contoh No. 1",
        telepon: "08123456789",
        tanggalMasuk: new Date().toISOString().split('T')[0]
    };

    try {
        const res = await fetch(`${BASE_URL}/api/siswa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSiswa)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to seed: ${res.status} - ${errorText}`);
        }

        const data = await res.json();
        console.log('✅ Successfully added sample student:');
        console.log(data);
        console.log('\nSilakan refresh halaman dashboard Anda.');

    } catch (e) {
        if (e.message.includes('NIS sudah terdaftar')) {
            console.log('⚠️ Data sample mungkin sudah ada (NIS conflict).');
        } else {
            console.error('❌ Error seeding data:', e.message);
        }
    }
}

seedData();
