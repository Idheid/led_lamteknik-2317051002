// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/lib/onedata-parser.ts.
// Gabung LKPS G4: dipindah tanpa perubahan isi (dipakai impor /api/lkps/impor; sinkron One Data menyusul di G6).
/* eslint-disable @typescript-eslint/no-explicit-any -- isi kode asal dipertahankan */

/**
 * Ingestion Parser One Data UNILA (myUnila Web Service / Excel Ekspor)
 * Mengonversi struktur JSON / Excel One Data ke entitas tabel LKPS LAM Teknik
 */

export interface IngestionResult {
  domain: string
  recordsProcessed: number
  kriteriaTarget: string
  tabelTarget: string
  details: string
  items: any[]
}

// 1. Parser Data SDM Dosen (Tabel 3.a.1 & 3.a.4 LKPS)
export function parseOneDataSDM(rows: any[]): IngestionResult {
  const items = rows.map((r, idx) => {
    const nama = r.nama_sdm || r.nm_sdm || r.nama || r.Nama || `Dosen ${idx + 1}`
    const nidn = r.nidn || r.nip || r.NIDN || '-'
    const pendidikan = r.pendidikan_terakhir || r.jenjang_didik || r.pendidikan || 'S2'
    const jabatan = r.jabatan_fungsional || r.jabatan || 'Lektor'
    const bidang = r.bidang_keahlian || r.bidang_ilmu || 'Ilmu Komputer'
    const status = (r.status_kepegawaian || r.status || '').toLowerCase().includes('tidak tetap')
      ? 'DTT'
      : 'DTPS'

    return {
      nidn,
      nama,
      pendidikan,
      bidangKeahlian: bidang,
      kesesuaianKompetensi: true, // default flag prodi, bisa di-override
      jabatanAkademik: jabatan,
      sertifikatPendidik: true,
      sertifikatProfesi: false,
      mataKuliahDiampu: r.matakuliah || 'Pemrograman / Basis Data',
      statusDosen: status,
    }
  })

  return {
    domain: 'SDM / Dosen',
    recordsProcessed: items.length,
    kriteriaTarget: 'Kriteria 3',
    tabelTarget: 'Tabel 3.a.1 (DTPS) & Tabel 3.a.4 (DTT)',
    details: `${items.filter((i) => i.statusDosen === 'DTPS').length} DTPS dan ${
      items.filter((i) => i.statusDosen === 'DTT').length
    } DTT teridentifikasi.`,
    items,
  }
}

// 2. Parser Data Mahasiswa Baru / PMB (Tabel 2.a LKPS)
export function parseOneDataMahasiswa(rows: any[]): IngestionResult {
  const items = rows.map((r) => {
    const tahunAkademik = r.tahun_akademik || r.tahun_masuk || r.tahun || 'TS'
    const dayaTampung = Number(r.daya_tampung || r.kuota || 100)
    const pendaftar = Number(r.pendaftar || r.calon_mhs || 850)
    const lulusSeleksi = Number(r.lulus_seleksi || r.diterima || 120)
    const mhsBaruReguler = Number(r.mhs_baru_reguler || r.baru_reguler || 100)
    const mhsBaruTransfer = Number(r.mhs_baru_transfer || r.baru_transfer || 0)
    const mhsAktifReguler = Number(r.mhs_aktif_reguler || r.aktif_reguler || 380)
    const mhsAktifTransfer = Number(r.mhs_aktif_transfer || r.aktif_transfer || 0)

    return {
      tahunAkademik,
      dayaTampung,
      pendaftar,
      lulusSeleksi,
      mhsBaruReguler,
      mhsBaruTransfer,
      mhsAktifReguler,
      mhsAktifTransfer,
      totalMahasiswaAktif: mhsAktifReguler + mhsAktifTransfer,
    }
  })

  return {
    domain: 'Mahasiswa / PMB',
    recordsProcessed: items.length,
    kriteriaTarget: 'Kriteria 2',
    tabelTarget: 'Tabel 2.a.1 (Seleksi & Jumlah Mahasiswa Baru/Aktif)',
    details: `${items.length} siklus tahun akademik (TS s/d TS-4) terpetakan.`,
    items,
  }
}

// 3. Parser Data Kerjasama (Tabel 1 LKPS)
export function parseOneDataKerjasama(rows: any[]): IngestionResult {
  const items = rows.map((r, idx) => {
    const lembaga = r.lembaga_mitra || r.mitra || r.nama_instansi || `Mitra ${idx + 1}`
    const tingkat = r.tingkat || (r.id_wilayah === 1 ? 'Internasional' : 'Nasional')
    const judul = r.judul_kerjasama || r.kegiatan || 'Program Tridharma'
    const bidang = (r.bidang || r.jenis_kegiatan || 'Pendidikan').toLowerCase().includes('penelitian')
      ? 'Penelitian'
      : (r.bidang || '').toLowerCase().includes('pengabdian')
      ? 'Pengabdian'
      : 'Pendidikan'

    return {
      lembagaMitra: lembaga,
      tingkat,
      judulKegiatan: judul,
      bidang, // N1 (Pendidikan), N2 (Penelitian), N3 (PkM)
      manfaat: r.manfaat || 'Peningkatan kapasitas mutu dan akreditasi prodi',
      durasi: r.durasi || '3 Tahun (2024-2027)',
      statusBukti: 'Tersedia di LP2M',
    }
  })

  return {
    domain: 'Kerjasama / LP2M',
    recordsProcessed: items.length,
    kriteriaTarget: 'Kriteria 1',
    tabelTarget: 'Tabel 1.1, 1.2, 1.3 (Kerjasama Tridharma)',
    details: `${items.filter((i) => i.bidang === 'Pendidikan').length} Pendidikan (N1), ${
      items.filter((i) => i.bidang === 'Penelitian').length
    } Penelitian (N2), ${items.filter((i) => i.bidang === 'Pengabdian').length} PkM (N3).`,
    items,
  }
}

// 4. Parser Data Tracer Study & Luaran (Tabel 8 LKPS)
export function parseOneDataTracer(rows: any[]): IngestionResult {
  const items = rows.map((r) => {
    return {
      tahunLulus: r.tahun_lulus || r.periode_lulus || 'TS-1',
      jumlahLulusan: Number(r.jumlah_lulusan || r.total_lulus || 85),
      jumlahTerlacak: Number(r.jumlah_terlacak || r.responden || 75),
      waktuTungguRata: Number(r.waktu_tunggu_bulan || r.rata_tunggu || 3.8),
      gajiRata: Number(r.rata_gaji || 6500000),
      kesesuaianTinggi: Number(r.kesesuaian_tinggi || 60),
      kesesuaianSedang: Number(r.kesesuaian_sedang || 12),
      kesesuaianRendah: Number(r.kesesuaian_rendah || 3),
    }
  })

  return {
    domain: 'Tracer Study / Alumni',
    recordsProcessed: items.length,
    kriteriaTarget: 'Kriteria 8',
    tabelTarget: 'Tabel 8.d.1 & 8.d.2 (Waktu Tunggu & Kesesuaian Bidang)',
    details: `${items.length} kohort lulusan terlacak berhasil diproses.`,
    items,
  }
}
