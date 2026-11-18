// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/lib/computation-engine.ts.
// Gabung LKPS G4: dipindah tanpa perubahan rumus (diuji dengan hitungan tangan di docs/uji/hitungan-manual-lkps-gabung.md).
/**
 * Computation Engine LKPS LAM Teknik
 * Peraturan BAN-PT No. 12 Tahun 2021 & Panduan Matriks LAM Teknik
 */

export interface IndikatorScore {
  kode: string
  nama: string
  kriteriaId: number
  nilaiRiil: number
  skor: number // 0.0 - 4.0
  bobot: number
  nilaiTertimbang: number
  keterangan: string
  status: 'Unggul' | 'Baik Sekali' | 'Baik' | 'Perlu Perbaikan'
}

export interface KriteriaSummary {
  nomorUrut: number
  nama: string
  skorRataRata: number
  bobotKriteria: number
  skorTertimbang: number
  indikatorList: IndikatorScore[]
}

export interface HasilKomputasiAkreditasi {
  skorTotal: number // skala 0 - 400
  prediksiPeringkat: 'Unggul' | 'Baik Sekali' | 'Baik' | 'Tidak Terakreditasi'
  syaratPerluTerpenuhi: boolean
  catatanSyaratPerlu: string[]
  kriteria: KriteriaSummary[]
  tanggalKomputasi: string
}

// 1. Kriteria 1: Kuantitas Kerjasama (KK) - Elemen 10 Matriks LAM Teknik
export function hitungIndikatorRK(n1: number, n2: number, n3: number, ndtps: number): IndikatorScore {
  const safeNdtps = ndtps > 0 ? ndtps : 1
  // Matriks LAM Teknik: N1=Pendidikan (bobot 3), N2=Penelitian (bobot 2), N3=PkM (bobot 1)
  const kk = (3 * n1 + 2 * n2 + 1 * n3) / safeNdtps

  let skor = 0
  if (kk >= 4.0) {
    skor = 4.0
  } else {
    skor = Math.max(0, Math.min(4, kk))
  }
  skor = Number(skor.toFixed(2))

  const bobot = 5.0
  return {
    kode: '1.KK',
    nama: 'Kuantitas & Rasio Kerjasama (KK)',
    kriteriaId: 1,
    nilaiRiil: Number(kk.toFixed(3)),
    skor,
    bobot,
    nilaiTertimbang: Number(((skor * bobot) / 4).toFixed(2)),
    keterangan: `KK = (3×${n1} + 2×${n2} + 1×${n3}) / ${safeNdtps} = ${kk.toFixed(3)} (Baku: KK ≥ 4.0 untuk Skor 4)`,
    status: skor >= 3.5 ? 'Unggul' : skor >= 3.0 ? 'Baik Sekali' : skor >= 2.0 ? 'Baik' : 'Perlu Perbaikan',
  }
}

// 2. Kriteria 2: Rasio Mahasiswa Dosen (RMD) - Elemen 19 Matriks LAM Teknik
export function hitungIndikatorRMD(totalMahasiswaAktif: number, ndtps: number): IndikatorScore {
  const safeNdtps = ndtps > 0 ? ndtps : 1
  const rmd = totalMahasiswaAktif / safeNdtps

  // Formula Baku LAM Teknik Program Sarjana:
  // Baku: 15 <= RMD <= 25 dan NDTPS >= 12 -> Skor = 4
  const a = Math.max(0, Math.min(1, (safeNdtps - 5) / 7))
  let b = 0
  if (rmd < 15) {
    b = rmd / 15
  } else if (rmd >= 15 && rmd <= 25) {
    b = 1.0
  } else if (rmd > 25 && rmd <= 35) {
    b = (35 - rmd) / 10
  } else {
    b = 0
  }

  let skor = 0
  if (rmd > 35) {
    skor = 0
  } else if (safeNdtps >= 12) {
    if (rmd >= 15 && rmd <= 25) {
      skor = 4.0
    } else {
      skor = 1 + 3 * b
    }
  } else if (safeNdtps >= 5 && safeNdtps < 12) {
    skor = 1 + 3 * (a * b)
  } else {
    skor = 0
  }

  skor = Number(Math.max(0, Math.min(4, skor)).toFixed(2))

  const bobot = 10.0
  return {
    kode: '2.RMD',
    nama: 'Rasio Mahasiswa Dosen (RMD)',
    kriteriaId: 2,
    nilaiRiil: Number(rmd.toFixed(2)),
    skor,
    bobot,
    nilaiTertimbang: Number(((skor * bobot) / 4).toFixed(2)),
    keterangan: `RMD = ${totalMahasiswaAktif} mhs / ${safeNdtps} DTPS = ${rmd.toFixed(2)} (Baku Sarjana Teknik: 15 s.d. 25)`,
    status: skor >= 3.5 ? 'Unggul' : skor >= 3.0 ? 'Baik Sekali' : skor >= 2.0 ? 'Baik' : 'Perlu Perbaikan',
  }
}

// 3. Kriteria 3: SDM (Kecukupan DTPS, Dosen S3, PDTT, EWMP, RBD)
export function hitungIndikatorSDM(params: {
  ndtps: number
  dosenS3: number
  ndtt: number
  ndt: number
  rataEwmp: number
  rataBimbingan: number
}): IndikatorScore[] {
  const { ndtps, dosenS3, ndtt, ndt, rataEwmp, rataBimbingan } = params

  // 3.a.1 Kecukupan DTPS (Minimal 12)
  let skorNdtps = ndtps >= 12 ? 4.0 : (ndtps / 12) * 4
  skorNdtps = Number(Math.max(0, Math.min(4, skorNdtps)).toFixed(2))

  // 3.a.2 Persentase S3 (PDS3 >= 50%)
  const pds3 = ndtps > 0 ? (dosenS3 / ndtps) * 100 : 0
  let skorPds3 = pds3 >= 50 ? 4.0 : (pds3 / 50) * 4
  skorPds3 = Number(Math.max(0, Math.min(4, skorPds3)).toFixed(2))

  // 3.a.3 Persentase Dosen Tidak Tetap (PDTT <= 10%)
  const totalDosen = ndt + ndtt
  const pdtt = totalDosen > 0 ? (ndtt / totalDosen) * 100 : 0
  let skorPdtt = 0
  if (pdtt <= 10) skorPdtt = 4.0
  else if (pdtt <= 20) skorPdtt = 4 - ((pdtt - 10) / 10) * 2
  else skorPdtt = Math.max(0, 2 - ((pdtt - 20) / 20) * 2)
  skorPdtt = Number(skorPdtt.toFixed(2))

  // 3.a.4 Rata-rata EWMP (12 - 16 SKS)
  let skorEwmp = 0
  if (rataEwmp >= 12 && rataEwmp <= 16) skorEwmp = 4.0
  else if (rataEwmp >= 8 && rataEwmp < 12) skorEwmp = (rataEwmp / 12) * 4
  else if (rataEwmp > 16 && rataEwmp <= 18) skorEwmp = 3.0
  else skorEwmp = 1.5
  skorEwmp = Number(skorEwmp.toFixed(2))

  // 3.a.5 Rata-rata Bimbingan Tugas Akhir (RBD <= 8)
  let skorRbd = 0
  if (rataBimbingan <= 8 && rataBimbingan > 0) skorRbd = 4.0
  else if (rataBimbingan <= 12) skorRbd = 3.0
  else skorRbd = 2.0
  skorRbd = Number(skorRbd.toFixed(2))

  return [
    {
      kode: '3.NDTPS',
      nama: 'Kecukupan Jumlah DTPS',
      kriteriaId: 3,
      nilaiRiil: ndtps,
      skor: skorNdtps,
      bobot: 6.0,
      nilaiTertimbang: Number(((skorNdtps * 6.0) / 4).toFixed(2)),
      keterangan: `Jumlah DTPS: ${ndtps} dosen (Target minimal: 12)`,
      status: skorNdtps >= 3.5 ? 'Unggul' : skorNdtps >= 3.0 ? 'Baik Sekali' : 'Perlu Perbaikan',
    },
    {
      kode: '3.PDS3',
      nama: 'Persentase DTPS Berpendidikan Doktor (S3)',
      kriteriaId: 3,
      nilaiRiil: Number(pds3.toFixed(2)),
      skor: skorPds3,
      bobot: 6.0,
      nilaiTertimbang: Number(((skorPds3 * 6.0) / 4).toFixed(2)),
      keterangan: `PDS3: ${pds3.toFixed(2)}% (${dosenS3} dari ${ndtps} DTPS)`,
      status: skorPds3 >= 3.5 ? 'Unggul' : skorPds3 >= 3.0 ? 'Baik Sekali' : 'Perlu Perbaikan',
    },
    {
      kode: '3.PDTT',
      nama: 'Persentase Dosen Tidak Tetap (PDTT)',
      kriteriaId: 3,
      nilaiRiil: Number(pdtt.toFixed(2)),
      skor: skorPdtt,
      bobot: 4.0,
      nilaiTertimbang: Number(((skorPdtt * 4.0) / 4).toFixed(2)),
      keterangan: `PDTT: ${pdtt.toFixed(2)}% (Maksimal baku: 10%)`,
      status: skorPdtt >= 3.5 ? 'Unggul' : skorPdtt >= 3.0 ? 'Baik Sekali' : 'Perlu Perbaikan',
    },
    {
      kode: '3.EWMP',
      nama: 'Ekuivalen Waktu Mengajar Penuh (EWMP)',
      kriteriaId: 3,
      nilaiRiil: Number(rataEwmp.toFixed(2)),
      skor: skorEwmp,
      bobot: 4.0,
      nilaiTertimbang: Number(((skorEwmp * 4.0) / 4).toFixed(2)),
      keterangan: `Rata-rata EWMP: ${rataEwmp.toFixed(2)} SKS/semester (Ideal: 12-16 SKS)`,
      status: skorEwmp >= 3.5 ? 'Unggul' : skorEwmp >= 3.0 ? 'Baik Sekali' : 'Perlu Perbaikan',
    },
    {
      kode: '3.RBD',
      nama: 'Rata-rata Beban Bimbingan Tugas Akhir',
      kriteriaId: 3,
      nilaiRiil: Number(rataBimbingan.toFixed(2)),
      skor: skorRbd,
      bobot: 5.0,
      nilaiTertimbang: Number(((skorRbd * 5.0) / 4).toFixed(2)),
      keterangan: `Rata-rata Bimbingan: ${rataBimbingan.toFixed(2)} mhs/dosen (Maksimal: 8)`,
      status: skorRbd >= 3.5 ? 'Unggul' : skorRbd >= 3.0 ? 'Baik Sekali' : 'Perlu Perbaikan',
    },
  ]
}

// 4. Kriteria 4: Keuangan (Biaya Operasional per Mahasiswa - DOPM)
export function hitungIndikatorKeuangan(biayaOperasionalTahunan: number, totalMahasiswa: number): IndikatorScore {
  const safeMhs = totalMahasiswa > 0 ? totalMahasiswa : 1
  const dopm = biayaOperasionalTahunan / safeMhs / 1000000 // dalam juta rupiah per mhs/tahun

  // Baku Sarjana Teknik: DOPM >= 20 juta/mhs/tahun -> skor 4
  let skor = 0
  if (dopm >= 20) skor = 4.0
  else if (dopm >= 10) skor = 2.0 + ((dopm - 10) / 10) * 2.0
  else skor = Math.max(1, (dopm / 10) * 2.0)
  skor = Number(Math.max(0, Math.min(4, skor)).toFixed(2))

  return {
    kode: '4.DOPM',
    nama: 'Biaya Operasional Pendidikan per Mahasiswa (DOPM)',
    kriteriaId: 4,
    nilaiRiil: Number(dopm.toFixed(2)),
    skor,
    bobot: 10.0,
    nilaiTertimbang: Number(((skor * 10.0) / 4).toFixed(2)),
    keterangan: `DOPM: Rp ${dopm.toFixed(2)} Juta/mhs/tahun (Baku Sarjana Teknik: ≥ Rp 20 Juta)`,
    status: skor >= 3.5 ? 'Unggul' : skor >= 3.0 ? 'Baik Sekali' : skor >= 2.0 ? 'Baik' : 'Perlu Perbaikan',
  }
}

// 5. Kriteria 6: Penelitian Dosen Tetap (Rata-rata Penelitian per Dosen per Tahun - RPD)
export function hitungIndikatorPenelitian(jumlahPenelitian3Tahun: number, ndtps: number): IndikatorScore {
  const safeNdtps = ndtps > 0 ? ndtps : 1
  const rpd = jumlahPenelitian3Tahun / 3 / safeNdtps

  // Baku: RPD >= 1 judul/dosen/tahun -> skor 4
  let skor = 0
  if (rpd >= 1.0) skor = 4.0
  else skor = (rpd / 1.0) * 4.0
  skor = Number(Math.max(0, Math.min(4, skor)).toFixed(2))

  return {
    kode: '6.RPD',
    nama: 'Rata-rata Penelitian DTPS per Tahun (RPD)',
    kriteriaId: 6,
    nilaiRiil: Number(rpd.toFixed(2)),
    skor,
    bobot: 10.0,
    nilaiTertimbang: Number(((skor * 10.0) / 4).toFixed(2)),
    keterangan: `RPD: ${rpd.toFixed(2)} judul/dosen/tahun (Target: ≥ 1.0)`,
    status: skor >= 3.5 ? 'Unggul' : skor >= 3.0 ? 'Baik Sekali' : skor >= 2.0 ? 'Baik' : 'Perlu Perbaikan',
  }
}

// 6. Kriteria 7: Pengabdian kepada Masyarakat (Rata-rata PkM per Dosen per Tahun - RPKM)
export function hitungIndikatorPkM(jumlahPkm3Tahun: number, ndtps: number): IndikatorScore {
  const safeNdtps = ndtps > 0 ? ndtps : 1
  const rpkm = jumlahPkm3Tahun / 3 / safeNdtps

  // Baku: RPKM >= 0.5 judul/dosen/tahun -> skor 4
  let skor = 0
  if (rpkm >= 0.5) skor = 4.0
  else skor = (rpkm / 0.5) * 4.0
  skor = Number(Math.max(0, Math.min(4, skor)).toFixed(2))

  return {
    kode: '7.RPKM',
    nama: 'Rata-rata PkM DTPS per Tahun (RPKM)',
    kriteriaId: 7,
    nilaiRiil: Number(rpkm.toFixed(2)),
    skor,
    bobot: 5.0,
    nilaiTertimbang: Number(((skor * 5.0) / 4).toFixed(2)),
    keterangan: `RPKM: ${rpkm.toFixed(2)} judul/dosen/tahun (Target: ≥ 0.5)`,
    status: skor >= 3.5 ? 'Unggul' : skor >= 3.0 ? 'Baik Sekali' : skor >= 2.0 ? 'Baik' : 'Perlu Perbaikan',
  }
}

// 7. Kriteria 9: Sistem Penjaminan Mutu Internal (SPMI)
export function hitungIndikatorSPMI(dokumenTersediaCount: number): IndikatorScore {
  // 5 pilar PPEPP (Kebijakan, Manual, Standar, Formulir, AMI/RTM)
  const totalWajib = 5
  const rasio = Math.min(totalWajib, dokumenTersediaCount) / totalWajib
  let skor = rasio * 4.0
  skor = Number(Math.max(0, Math.min(4, skor)).toFixed(2))

  return {
    kode: '9.SPMI',
    nama: 'Keterlaksanaan Siklus Penjaminan Mutu (PPEPP)',
    kriteriaId: 9,
    nilaiRiil: dokumenTersediaCount,
    skor,
    bobot: 5.0,
    nilaiTertimbang: Number(((skor * 5.0) / 4).toFixed(2)),
    keterangan: `Siklus PPEPP: ${dokumenTersediaCount} dari ${totalWajib} dokumen pilar SPMI terlaksana`,
    status: skor >= 3.5 ? 'Unggul' : skor >= 3.0 ? 'Baik Sekali' : skor >= 2.0 ? 'Baik' : 'Perlu Perbaikan',
  }
}

// 4. Kriteria 8: Luaran (IPK, Masa Studi, Waktu Tunggu)
export function hitungIndikatorLuaran(params: {
  rataIpk: number
  masaStudiTahun: number
  waktuTungguBulan: number
}): IndikatorScore[] {
  const { rataIpk, masaStudiTahun, waktuTungguBulan } = params

  // 8.a IPK Lulusan (IPK >= 3.25 skor 4)
  let skorIpk = 0
  if (rataIpk >= 3.25) skorIpk = 4.0
  else if (rataIpk >= 2.75) skorIpk = 3.0 + ((rataIpk - 2.75) / 0.5) * 1.0
  else if (rataIpk >= 2.0) skorIpk = 2.0 + ((rataIpk - 2.0) / 0.75) * 1.0
  else skorIpk = 1.0
  skorIpk = Number(Math.max(0, Math.min(4, skorIpk)).toFixed(2))

  // 8.b Masa Studi (3.0 <= MS <= 3.5 skor 4 untuk Diploma / 3.5 - 4.5 Sarjana)
  let skorMs = 0
  if (masaStudiTahun >= 3.0 && masaStudiTahun <= 4.0) skorMs = 4.0
  else if (masaStudiTahun < 3.0 && masaStudiTahun >= 2.5) skorMs = 3.5
  else if (masaStudiTahun > 4.0 && masaStudiTahun <= 5.0) skorMs = 3.0
  else skorMs = 2.0
  skorMs = Number(skorMs.toFixed(2))

  // 8.c Waktu Tunggu Lulusan Bekerja (WT < 6 bulan skor 4)
  let skorWt = 0
  if (waktuTungguBulan <= 6) skorWt = 4.0
  else if (waktuTungguBulan <= 12) skorWt = 4 - ((waktuTungguBulan - 6) / 6) * 1.5
  else skorWt = 2.0
  skorWt = Number(skorWt.toFixed(2))

  return [
    {
      kode: '8.IPK',
      nama: 'Indeks Prestasi Kumulatif (IPK) Lulusan',
      kriteriaId: 8,
      nilaiRiil: Number(rataIpk.toFixed(2)),
      skor: skorIpk,
      bobot: 8.0,
      nilaiTertimbang: Number(((skorIpk * 8.0) / 4).toFixed(2)),
      keterangan: `Rata-rata IPK: ${rataIpk.toFixed(2)} (Target: ≥ 3.25)`,
      status: skorIpk >= 3.5 ? 'Unggul' : skorIpk >= 3.0 ? 'Baik Sekali' : 'Baik',
    },
    {
      kode: '8.MS',
      nama: 'Masa Studi Lulusan (MS)',
      kriteriaId: 8,
      nilaiRiil: Number(masaStudiTahun.toFixed(2)),
      skor: skorMs,
      bobot: 10.0,
      nilaiTertimbang: Number(((skorMs * 10.0) / 4).toFixed(2)),
      keterangan: `Rata-rata Masa Studi: ${masaStudiTahun.toFixed(2)} tahun`,
      status: skorMs >= 3.5 ? 'Unggul' : skorMs >= 3.0 ? 'Baik Sekali' : 'Baik',
    },
    {
      kode: '8.WT',
      nama: 'Waktu Tunggu Lulusan Mendapat Pekerjaan',
      kriteriaId: 8,
      nilaiRiil: Number(waktuTungguBulan.toFixed(1)),
      skor: skorWt,
      bobot: 7.0,
      nilaiTertimbang: Number(((skorWt * 7.0) / 4).toFixed(2)),
      keterangan: `Rata-rata Waktu Tunggu: ${waktuTungguBulan.toFixed(1)} bulan (Target: ≤ 6 bulan)`,
      status: skorWt >= 3.5 ? 'Unggul' : skorWt >= 3.0 ? 'Baik Sekali' : 'Baik',
    },
  ]
}

// 5. Agregator Keseluruhan Skoring Matriks LAM Teknik
export function hitungTotalAkreditasi(indikatorList: IndikatorScore[]): HasilKomputasiAkreditasi {
  const bobotPerKriteria: Record<number, { nama: string; bobot: number }> = {
    1: { nama: 'Tata Pamong, Tata Kelola & Kerjasama', bobot: 5.0 },
    2: { nama: 'Mahasiswa', bobot: 10.0 },
    3: { nama: 'Sumber Daya Manusia', bobot: 25.0 },
    4: { nama: 'Keuangan, Sarana & Prasarana', bobot: 10.0 },
    5: { nama: 'Pendidikan & Kurikulum', bobot: 15.0 },
    6: { nama: 'Penelitian', bobot: 10.0 },
    7: { nama: 'Pengabdian kepada Masyarakat', bobot: 5.0 },
    8: { nama: 'Luaran dan Capaian Tridharma', bobot: 25.0 },
    9: { nama: 'Penjaminan Mutu Internal', bobot: 5.0 },
  }

  const kriteriaMap = new Map<number, IndikatorScore[]>()
  for (let i = 1; i <= 9; i++) {
    kriteriaMap.set(i, [])
  }

  indikatorList.forEach((ind) => {
    if (kriteriaMap.has(ind.kriteriaId)) {
      kriteriaMap.get(ind.kriteriaId)!.push(ind)
    }
  })

  let totalSkorTertimbang = 0
  let totalBobotAktif = 0

  const kriteriaSummaries: KriteriaSummary[] = []

  for (let kId = 1; kId <= 9; kId++) {
    const list = kriteriaMap.get(kId) || []
    const info = bobotPerKriteria[kId]

    let skorRataRata = 3.0 // default estimasi bila belum ada data spesifik
    if (list.length > 0) {
      const sumSkor = list.reduce((acc, curr) => acc + curr.skor, 0)
      skorRataRata = sumSkor / list.length
    }

    const skorTertimbang = Number(((skorRataRata / 4.0) * info.bobot * 4).toFixed(2))
    totalSkorTertimbang += skorTertimbang
    totalBobotAktif += info.bobot

    kriteriaSummaries.push({
      nomorUrut: kId,
      nama: info.nama,
      skorRataRata: Number(skorRataRata.toFixed(2)),
      bobotKriteria: info.bobot,
      skorTertimbang,
      indikatorList: list,
    })
  }

  // Skala total skor akreditasi (maks 400)
  const skorTotal = Number(totalSkorTertimbang.toFixed(2))

  // Cek Syarat Perlu Akreditasi Unggul (LAM Teknik):
  // 1. Skor DTPS >= 3.5 (NDTPS minimal 12)
  // 2. Skor SPMI / Penjaminan Mutu >= 3.0
  const catatanSyaratPerlu: string[] = []
  let syaratPerluTerpenuhi = true

  const indNdtps = indikatorList.find((i) => i.kode === '3.NDTPS')
  if (indNdtps && indNdtps.nilaiRiil < 12) {
    syaratPerluTerpenuhi = false
    catatanSyaratPerlu.push(`Jumlah DTPS (${indNdtps.nilaiRiil}) kurang dari syarat minimum 12 dosen.`)
  }

  let prediksiPeringkat: HasilKomputasiAkreditasi['prediksiPeringkat'] = 'Tidak Terakreditasi'
  if (skorTotal >= 361) {
    prediksiPeringkat = syaratPerluTerpenuhi ? 'Unggul' : 'Baik Sekali'
  } else if (skorTotal >= 301) {
    prediksiPeringkat = 'Baik Sekali'
  } else if (skorTotal >= 200) {
    prediksiPeringkat = 'Baik'
  } else {
    prediksiPeringkat = 'Tidak Terakreditasi'
  }

  return {
    skorTotal,
    prediksiPeringkat,
    syaratPerluTerpenuhi,
    catatanSyaratPerlu,
    kriteria: kriteriaSummaries,
    tanggalKomputasi: new Date().toISOString(),
  }
}
