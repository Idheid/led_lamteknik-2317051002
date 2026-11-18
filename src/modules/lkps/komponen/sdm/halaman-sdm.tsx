"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/sdm/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim"
import { useState, useEffect } from 'react'
import { useInfoLkps } from "@/modules/lkps/komponen/bersama/konteks"
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import RoleNotice from "@/modules/lkps/komponen/bersama/pemberitahuan-peran"
import {
  Zap,
  UserCheck,
  GraduationCap,
  Clock,
  Award,
  Users,
  Plus,
  CheckCircle2,
} from 'lucide-react'

// ─── Interfaces ───────────────────────────────────────────────

interface DosenRow {
  id: string
  nama: string
  nidn: string
  pendidikanS2: boolean
  pendidikanS3: boolean
  prodiPascaS2?: string
  prodiPascaS3?: string
  bidangKeahlian: string
  kesesuaianKompetensi?: boolean
  jabatanAkademik: string
  sertifikasiDosen: boolean
  noSertifikatPendidik?: string
  sertifikasiKompetensi: boolean
  bidangSertifikasi?: string
  lembagaSertifikasi?: string
  mataKuliahDiampu: string
  kesesuaianBidang: boolean
  mataKuliahPSLain?: string
  bebanMengajar: number
}

interface BimbinganRow {
  id: string
  dosenId: string
  dosen?: { nama: string }
  bimbinganPSSendiriTS: number
  bimbinganPSSendiriTS1: number
  bimbinganPSSendiriTS2: number
  bimbinganPSLainTS: number
  bimbinganPSLainTS1: number
  bimbinganPSLainTS2: number
}

interface EwmpRow {
  id: string
  dosenId: string
  dosen?: { nama: string }
  sksPendidikanPSSendiri: number
  sksPendidikanPSLain: number
  sksPenelitian: number
  sksPkm: number
  sksTugasTambahan: number
}

interface LuaranDosenRow {
  id: string
  dosenId?: string
  namaDosen?: string
  dosen?: { nama: string }
  jenis: string
  judul: string
  tahun: number
  detail: string
}

interface TendikRow {
  id: string
  jenis: string
  jenjangPendidikan: string
  jumlah: number
}

// ─── Component ────────────────────────────────────────────────

export default function HalamanSdm() {
  // Gabung LKPS G5: peran dari kerangka LED; isian kriteria (termasuk tendik) hanya ditulis Tim Prodi
  const { peran } = useInfoLkps()
  const isOperator = peran === 'TIM_PRODI'

  const canEditDosen = isOperator
  const canEditTendik = isOperator

  const [activeTab, setActiveTab] = useState<'3a1' | '3a2' | '3a3' | '3b' | '3c'>('3a1')
  const [subTab3b, setSubTab3b] = useState<'semua' | '3b1' | '3b4' | '3b6' | '3b7' | '3b8'>('semua')

  const [dosenList, setDosenList] = useState<DosenRow[]>([])
  const [bimbinganList, setBimbinganList] = useState<BimbinganRow[]>([])
  const [ewmpList, setEwmpList] = useState<EwmpRow[]>([])
  const [luaranList, setLuaranList] = useState<LuaranDosenRow[]>([])
  const [tendikList, setTendikList] = useState<TendikRow[]>([])

  // Modal States
  const [showDosenModal, setShowDosenModal] = useState(false)
  const [editingDosen, setEditingDosen] = useState<DosenRow | null>(null)

  const [showBimbinganModal, setShowBimbinganModal] = useState(false)
  const [editingBimbingan, setEditingBimbingan] = useState<BimbinganRow | null>(null)

  const [showEwmpModal, setShowEwmpModal] = useState(false)
  const [editingEwmp, setEditingEwmp] = useState<EwmpRow | null>(null)

  const [showLuaranModal, setShowLuaranModal] = useState(false)
  const [editingLuaran, setEditingLuaran] = useState<LuaranDosenRow | null>(null)

  const [showTendikModal, setShowTendikModal] = useState(false)
  const [editingTendik, setEditingTendik] = useState<TendikRow | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await kirimLkps('/api/lkps/sdm')
      if (res.ok) {
        const data = await res.json()
        setDosenList(data.dosen || [])
        setBimbinganList(data.bimbingan || [])
        setEwmpList(data.ewmp || [])
        setLuaranList(data.luaranDosen || [])
        setTendikList(data.tendik || [])
      }
    } catch (err) {
      console.error('Failed to fetch SDM data:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─── Real-Time Formula Engine Computations ─────────────────

  const ndt = dosenList.length
  const ndtt = 0
  const pdtt = (ndt + ndtt) > 0 ? (ndtt / (ndt + ndtt)) * 100 : 0

  const totalS3 = dosenList.filter(d => d.pendidikanS3).length
  const totalSerkom = dosenList.filter(d => d.sertifikasiKompetensi).length
  const totalSerdos = dosenList.filter(d => d.sertifikasiDosen).length

  // Rata-rata EWMP
  const avgEwmp = ewmpList.length > 0
    ? ewmpList.reduce((acc, e) => acc + (e.sksPendidikanPSSendiri + e.sksPendidikanPSLain + e.sksPenelitian + e.sksPkm + e.sksTugasTambahan), 0) / ewmpList.length
    : 0

  // ─── Handlers Tab 1: Dosen Tetap (3.a.1) ───────────────────

  function openAddDosen() {
    setEditingDosen({
      id: `temp_${Date.now()}`,
      nama: '',
      nidn: '',
      pendidikanS2: true,
      pendidikanS3: false,
      prodiPascaS2: 'Magister Ilmu Komputer / Teknik Elektro',
      prodiPascaS3: '',
      bidangKeahlian: 'Teknik Elektro / Rekayasa Perangkat Lunak',
      kesesuaianKompetensi: true,
      jabatanAkademik: 'Lektor',
      sertifikasiDosen: true,
      noSertifikatPendidik: '',
      sertifikasiKompetensi: false,
      bidangSertifikasi: '',
      lembagaSertifikasi: '',
      mataKuliahDiampu: 'Pemrograman Web, Sistem Basis Data',
      kesesuaianBidang: true,
      mataKuliahPSLain: '-',
      bebanMengajar: 12,
    })
    setShowDosenModal(true)
  }

  function openEditDosen(row: DosenRow) {
    setEditingDosen({ ...row })
    setShowDosenModal(true)
  }

  async function handleSaveDosen() {
    if (!editingDosen) return
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/sdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveDosen', payload: editingDosen }),
      })
      if (res.ok) {
        await fetchData()
        setShowDosenModal(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteDosen(id: string) {
    if (!confirm('Hapus data Dosen Tetap ini?')) return
    try {
      const res = await kirimLkps('/api/lkps/sdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteDosen', payload: { id } }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // ─── Handlers Tab 2: Bimbingan TA (3.a.2) ──────────────────

  function openAddBimbingan() {
    if (dosenList.length === 0) {
      alert('Silakan tambahkan Dosen Tetap terlebih dahulu di Tab 1 (Tabel 3.a.1).')
      return
    }
    setEditingBimbingan({
      id: `temp_${Date.now()}`,
      dosenId: dosenList[0]?.id || '',
      bimbinganPSSendiriTS: 4,
      bimbinganPSSendiriTS1: 5,
      bimbinganPSSendiriTS2: 4,
      bimbinganPSLainTS: 0,
      bimbinganPSLainTS1: 1,
      bimbinganPSLainTS2: 0,
    })
    setShowBimbinganModal(true)
  }

  function openEditBimbingan(row: BimbinganRow) {
    setEditingBimbingan({ ...row })
    setShowBimbinganModal(true)
  }

  async function handleSaveBimbingan() {
    if (!editingBimbingan) return
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/sdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveBimbingan', payload: editingBimbingan }),
      })
      if (res.ok) {
        await fetchData()
        setShowBimbinganModal(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBimbingan(id: string) {
    if (!confirm('Hapus data Bimbingan TA ini?')) return
    try {
      const res = await kirimLkps('/api/lkps/sdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteBimbingan', payload: { id } }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // ─── Handlers Tab 3: EWMP (3.a.3) ──────────────────────────

  function openAddEwmp() {
    if (dosenList.length === 0) {
      alert('Silakan tambahkan Dosen Tetap terlebih dahulu di Tab 1 (Tabel 3.a.1).')
      return
    }
    setEditingEwmp({
      id: `temp_${Date.now()}`,
      dosenId: dosenList[0]?.id || '',
      sksPendidikanPSSendiri: 6,
      sksPendidikanPSLain: 2,
      sksPenelitian: 3,
      sksPkm: 2,
      sksTugasTambahan: 1,
    })
    setShowEwmpModal(true)
  }

  function openEditEwmp(row: EwmpRow) {
    setEditingEwmp({ ...row })
    setShowEwmpModal(true)
  }

  async function handleSaveEwmp() {
    if (!editingEwmp) return
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/sdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveEwmp', payload: editingEwmp }),
      })
      if (res.ok) {
        await fetchData()
        setShowEwmpModal(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEwmp(id: string) {
    if (!confirm('Hapus data EWMP ini?')) return
    try {
      const res = await kirimLkps('/api/lkps/sdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteEwmp', payload: { id } }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // ─── Handlers Tab 4: Kinerja & Luaran Dosen (3.b) ──────────

  function openAddLuaran() {
    setEditingLuaran({
      id: `temp_${Date.now()}`,
      dosenId: dosenList[0]?.id || '',
      namaDosen: dosenList[0]?.nama || '',
      jenis: subTab3b === '3b1' ? 'Rekognisi / Staf Ahli' :
             subTab3b === '3b4' ? 'Jurnal Nasional Terakreditasi' :
             subTab3b === '3b6' ? 'Sitasi Artikel Ilmiah' :
             subTab3b === '3b7' ? 'Produk / Jasa Diadopsi Industri' :
             subTab3b === '3b8' ? 'Paten / Paten Sederhana' :
             'Jurnal Nasional Terakreditasi',
      judul: '',
      tahun: new Date().getFullYear(),
      detail: '',
    })
    setShowLuaranModal(true)
  }

  function openEditLuaran(row: LuaranDosenRow) {
    setEditingLuaran({ ...row })
    setShowLuaranModal(true)
  }

  async function handleSaveLuaran() {
    if (!editingLuaran) return
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/sdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveLuaranDosen', payload: editingLuaran }),
      })
      if (res.ok) {
        await fetchData()
        setShowLuaranModal(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteLuaran(id: string) {
    if (!confirm('Hapus data Luaran Dosen ini?')) return
    try {
      const res = await kirimLkps('/api/lkps/sdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteLuaranDosen', payload: { id } }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  // ─── Handlers Tab 5: Tenaga Kependidikan (3.c) ──────────────

  function openAddTendik() {
    setEditingTendik({
      id: `temp_${Date.now()}`,
      jenis: 'Laboran',
      jenjangPendidikan: 'S1',
      jumlah: 1,
    })
    setShowTendikModal(true)
  }

  function openEditTendik(row: TendikRow) {
    setEditingTendik({ ...row })
    setShowTendikModal(true)
  }

  async function handleSaveTendik() {
    if (!editingTendik) return
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/sdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveTendik', payload: editingTendik }),
      })
      if (res.ok) {
        await fetchData()
        setShowTendikModal(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTendik(id: string) {
    if (!confirm('Hapus data Tenaga Kependidikan ini?')) return
    try {
      const res = await kirimLkps('/api/lkps/sdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteTendik', payload: { id } }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      <JudulHalaman judul="Kriteria 3: Sumber Daya Manusia (SDM)" />
      <div className="page-content animate-fade-in">
        
        <div style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Sumber Daya Manusia (SDM)</h2>
          <p className="section-subtitle">
            Modul penginputan lengkap Tabel 3.a.1 sampai Tabel 3.c LKPS LAM Teknik (DTPS, Pembimbing TA, EWMP, Luaran Dosen & Tendik).
          </p>
        </div>

        <RoleNotice module="sdm" />

        {/* Real-time Indicator & Formula Card */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.15)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconBadge color="purple" size="sm">
                <Zap size={18} strokeWidth={2} />
              </IconBadge>
              <div>
                <div className="card-title">Indikator Komputasi Matriks Penilaian SDM Dosen</div>
                <div className="card-subtitle">Kalkulasi Otomatis Persentase Dosen & Rata-rata EWMP</div>
              </div>
            </div>
            <div className="score-display score-excellent">
              Total DTPS: {dosenList.length} Dosen
            </div>
          </div>

          <div className="formula-display">
            Persentase Dosen Tidak Tetap (PDTT) = NDTT / (NDT + NDTT) × 100% = <strong>{pdtt.toFixed(2)}%</strong>
          </div>

          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginTop: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>Dosen Berpendidikan S3 (Doktor)</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6' }}>{totalS3} Dosen</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>Memiliki Sertifikasi Dosen</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>{totalSerdos} Dosen</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>Sertifikat Kompetensi / Profesi</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{totalSerkom} Dosen</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>Rata-rata EWMP SKS</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{avgEwmp.toFixed(1)} SKS/Sem</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>Total Tenaga Kependidikan</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#ec4899' }}>
                {tendikList.reduce((acc, t) => acc + t.jumlah, 0)} Personel
              </div>
            </div>
          </div>
        </div>

        {/* 5 Tab Navigation Switches */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { key: '3a1', label: 'Tabel 3.a.1 – Profil DTPS', icon: UserCheck },
            { key: '3a2', label: 'Tabel 3.a.2 – Pembimbing TA', icon: GraduationCap },
            { key: '3a3', label: 'Tabel 3.a.3 – EWMP SKS', icon: Clock },
            { key: '3b', label: 'Tabel 3.b – Kinerja & Luaran Dosen', icon: Award },
            { key: '3c', label: 'Tabel 3.c – Tenaga Kependidikan', icon: Users },
          ].map(tab => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                <TabIcon size={16} strokeWidth={1.75} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {saved && (
          <div className="badge badge-emerald" style={{ marginBottom: '16px', fontSize: '13px', padding: '8px 14px' }}>
            <CheckCircle2 size={14} strokeWidth={2} />
            Data SDM berhasil diperbarui!
          </div>
        )}

        {/* ─── TAB 1: TABEL 3.A.1 PROFIL DOSEN TETAP (DTPS) ───────── */}
        {activeTab === '3a1' && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconBadge color="purple" size="md">
                  <UserCheck size={20} strokeWidth={1.75} />
                </IconBadge>
                <div>
                  <div className="card-title">Profil Dosen Tetap PS / DTPS (Tabel 3.a.1 LKPS)</div>
                  <div className="card-subtitle">Nama, NIDN, Pendidikan, Sertifikasi, Jabatan Akademik & Kesesuaian Keahlian</div>
                </div>
              </div>
              {canEditDosen && (
                <button id="btn-add-dosen-3a1" className="btn btn-primary" onClick={openAddDosen}>
                  <Plus size={16} strokeWidth={2} />
                  Tambah Dosen Tetap
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--lkps-text-secondary)' }}>Memuat data Dosen...</div>
            ) : dosenList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Belum ada data Dosen Tetap</div>
                <div className="empty-state-desc">Klik "Tambah Dosen Tetap" untuk menginput data DTPS.</div>
              </div>
            ) : (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>No.</th>
                      <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Nama Dosen</th>
                      <th rowSpan={2} style={{ verticalAlign: 'middle' }}>NIDN / NIDK</th>
                      <th colSpan={2} style={{ textAlign: 'center' }}>Nama Prodi Pascasarjana 1)</th>
                      <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Bidang Keahlian 2)</th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>Kesesuaian Kompetensi Inti 3)</th>
                      <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Jabatan Akademik</th>
                      <th rowSpan={2} style={{ verticalAlign: 'middle' }}>No. Sertifikat Pendidik 4)</th>
                      <th colSpan={2} style={{ textAlign: 'center' }}>Sertifikat Profesi / Kompetensi 5)</th>
                      <th rowSpan={2} style={{ verticalAlign: 'middle' }}>MK Diampu pd PS Akreditasi 6)</th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>Kesesuaian dg MK 7)</th>
                      <th rowSpan={2} style={{ verticalAlign: 'middle' }}>MK Diampu pd PS Lain 8)</th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>Aksi</th>
                    </tr>
                    <tr>
                      <th style={{ fontSize: '11px' }}>Magister (S2)</th>
                      <th style={{ fontSize: '11px' }}>Doktor (S3)</th>
                      <th style={{ fontSize: '11px' }}>Bidang</th>
                      <th style={{ fontSize: '11px' }}>Lembaga Penerbit</th>
                    </tr>
                    <tr style={{ background: 'var(--lkps-bg-secondary)', color: 'var(--lkps-text-muted)', fontSize: '10px', textAlign: 'center' }}>
                      <th>1</th>
                      <th>2</th>
                      <th>3</th>
                      <th colSpan={2}>4</th>
                      <th>5</th>
                      <th>6</th>
                      <th>7</th>
                      <th>8</th>
                      <th>9</th>
                      <th>10</th>
                      <th>11</th>
                      <th>12</th>
                      <th>13</th>
                      <th>–</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dosenList.map((d, idx) => (
                      <tr key={d.id}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{d.nama}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{d.nidn}</td>
                        <td>{d.prodiPascaS2 || (d.pendidikanS2 ? 'Magister (S2)' : '–')}</td>
                        <td>{d.prodiPascaS3 || (d.pendidikanS3 ? 'Doktor (S3)' : '–')}</td>
                        <td>{d.bidangKeahlian || '–'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {(d.kesesuaianKompetensi ?? true) ? (
                            <span className="badge badge-emerald" style={{ padding: '2px 8px' }}>✓ Sesuai</span>
                          ) : (
                            <span className="badge badge-rose" style={{ padding: '2px 8px' }}>✗ Tidak</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{d.jabatanAkademik}</td>
                        <td style={{ fontSize: '11px' }}>{d.noSertifikatPendidik || (d.sertifikasiDosen ? 'Terverifikasi' : '–')}</td>
                        <td style={{ fontSize: '11px' }}>{d.bidangSertifikasi || (d.sertifikasiKompetensi ? 'Kompetensi Industri' : '–')}</td>
                        <td style={{ fontSize: '11px' }}>{d.lembagaSertifikasi || '–'}</td>
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.mataKuliahDiampu}>
                          {d.mataKuliahDiampu || '–'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {d.kesesuaianBidang ? (
                            <span className="badge badge-emerald" style={{ padding: '2px 8px' }}>✓ Sesuai</span>
                          ) : (
                            <span className="badge badge-rose" style={{ padding: '2px 8px' }}>✗ Tidak</span>
                          )}
                        </td>
                        <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.mataKuliahPSLain}>
                          {d.mataKuliahPSLain || '–'}
                        </td>
                        <td>
                          {canEditDosen ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditDosen(d)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDosen(d.id)}>Hapus</button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: TABEL 3.A.2 DOSEN PEMBIMBING UTAMA TA ────────── */}
        {activeTab === '3a2' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Dosen Pembimbing Utama Tugas Akhir (Tabel 3.a.2 LKPS)</div>
                <div className="card-subtitle">Jumlah Mahasiswa Bimbingan pada PS Sendiri & PS Lain (TS-2, TS-1, TS)</div>
              </div>
              {canEditDosen && (
                <button id="btn-add-bimbingan-3a2" className="btn btn-primary" onClick={openAddBimbingan}>
                  <Plus size={16} />
                  Tambah Data Bimbingan
                </button>
              )}
            </div>

            {bimbinganList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Belum ada data bimbingan TA</div>
                <div className="empty-state-desc">Klik "Tambah Data Bimbingan" untuk mencatat beban bimbingan dosen.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>No</th>
                      <th rowSpan={2}>Nama Dosen Pembimbing</th>
                      <th colSpan={3} style={{ textAlign: 'center' }}>Bimbingan di PS Sendiri</th>
                      <th colSpan={3} style={{ textAlign: 'center' }}>Bimbingan di PS Lain</th>
                      <th rowSpan={2}>Rata-rata / Tahun</th>
                      <th rowSpan={2}>Aksi</th>
                    </tr>
                    <tr>
                      <th>TS-2</th>
                      <th>TS-1</th>
                      <th>TS</th>
                      <th>TS-2</th>
                      <th>TS-1</th>
                      <th>TS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bimbinganList.map((b, idx) => {
                      const totalMhs = b.bimbinganPSSendiriTS + b.bimbinganPSSendiriTS1 + b.bimbinganPSSendiriTS2 +
                                       b.bimbinganPSLainTS + b.bimbinganPSLainTS1 + b.bimbinganPSLainTS2
                      const avgMhs = (totalMhs / 3).toFixed(1)
                      const namaDosen = b.dosen?.nama || dosenList.find(d => d.id === b.dosenId)?.nama || '–'
                      return (
                        <tr key={b.id}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{namaDosen}</td>
                          <td>{b.bimbinganPSSendiriTS2}</td>
                          <td>{b.bimbinganPSSendiriTS1}</td>
                          <td style={{ fontWeight: 700, color: 'var(--lkps-accent-blue)' }}>{b.bimbinganPSSendiriTS}</td>
                          <td>{b.bimbinganPSLainTS2}</td>
                          <td>{b.bimbinganPSLainTS1}</td>
                          <td>{b.bimbinganPSLainTS}</td>
                          <td><span className="badge badge-purple">{avgMhs} Mhs</span></td>
                          <td>
                            {canEditDosen ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => openEditBimbingan(b)}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBimbingan(b.id)}>Hapus</button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted">–</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: TABEL 3.A.3 EWMP DOSEN TETAP ─────────────────── */}
        {activeTab === '3a3' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Ekuivalensi Waktu Mengajar Penuh / EWMP (Tabel 3.a.3 LKPS)</div>
                <div className="card-subtitle">Beban Kerja SKS Pendidikan, Penelitian, PkM, dan Tugas Tambahan</div>
              </div>
              {canEditDosen && (
                <button id="btn-add-ewmp-3a3" className="btn btn-primary" onClick={openAddEwmp}>
                  <Plus size={16} />
                  Tambah Data EWMP
                </button>
              )}
            </div>

            {ewmpList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Belum ada data EWMP</div>
                <div className="empty-state-desc">Klik "Tambah Data EWMP" untuk memasukkan rincian SKS dosen.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Dosen Tetap</th>
                      <th>Pendidikan (PS Sendiri)</th>
                      <th>Pendidikan (PS Lain)</th>
                      <th>Penelitian</th>
                      <th>PkM</th>
                      <th>Tugas Tambahan</th>
                      <th>Total EWMP SKS</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ewmpList.map((e, idx) => {
                      const totalSks = e.sksPendidikanPSSendiri + e.sksPendidikanPSLain + e.sksPenelitian + e.sksPkm + e.sksTugasTambahan
                      const namaDosen = e.dosen?.nama || dosenList.find(d => d.id === e.dosenId)?.nama || '–'
                      return (
                        <tr key={e.id}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{namaDosen}</td>
                          <td>{e.sksPendidikanPSSendiri} SKS</td>
                          <td>{e.sksPendidikanPSLain} SKS</td>
                          <td>{e.sksPenelitian} SKS</td>
                          <td>{e.sksPkm} SKS</td>
                          <td>{e.sksTugasTambahan} SKS</td>
                          <td style={{ fontWeight: 700, color: 'var(--lkps-accent-emerald)' }}>
                            <span className="badge badge-emerald">{totalSks} SKS</span>
                          </td>
                          <td>
                            {canEditDosen ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => openEditEwmp(e)}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteEwmp(e.id)}>Hapus</button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted">–</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: TABEL 3.B.1–8 KINERJA & LUARAN DOSEN ─────────── */}
        {activeTab === '3b' && (
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div className="card-title">Kinerja & Luaran Dosen (Tabel 3.b.1–3.b.8 LKPS)</div>
                <div className="card-subtitle">Rekognisi, Publikasi Ilmiah, Sitasi, Produk Industri & Hak Kekayaan Intelektual (HKI)</div>
              </div>
              {canEditDosen && (
                <button id="btn-add-luaran-3b" className="btn btn-primary" onClick={openAddLuaran}>
                  <Plus size={16} />
                  Tambah Luaran Dosen
                </button>
              )}
            </div>

            {/* Filter Sub-Tabel 3.b */}
            <div style={{ display: 'flex', gap: '8px', padding: '0 0 16px', overflowX: 'auto', borderBottom: '1px solid var(--lkps-border-color)', marginBottom: '16px' }}>
              {[
                { id: 'semua', label: 'Semua Kategori' },
                { id: '3b1', label: '3.b.1 Rekognisi DTPS' },
                { id: '3b4', label: '3.b.4 Publikasi Ilmiah' },
                { id: '3b6', label: '3.b.6 Sitasi Karya' },
                { id: '3b7', label: '3.b.7 Produk Industri' },
                { id: '3b8', label: '3.b.8 HKI & Buku' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSubTab3b(st.id as any)}
                  className={`btn btn-sm ${subTab3b === st.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ whiteSpace: 'nowrap', fontSize: '12px' }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {(() => {
              const filteredLuaran = luaranList.filter((l) => {
                if (subTab3b === 'semua') return true
                if (subTab3b === '3b1') return l.jenis.includes('Rekognisi') || l.jenis.includes('Staf Ahli') || l.jenis.includes('Visiting')
                if (subTab3b === '3b4') return l.jenis.includes('Jurnal') || l.jenis.includes('Prosiding') || l.jenis.includes('Publikasi')
                if (subTab3b === '3b6') return l.jenis.includes('Sitasi')
                if (subTab3b === '3b7') return l.jenis.includes('Produk') || l.jenis.includes('Jasa') || l.jenis.includes('Industri')
                if (subTab3b === '3b8') return l.jenis.includes('Paten') || l.jenis.includes('Hak Cipta') || l.jenis.includes('HKI') || l.jenis.includes('Buku')
                return true
              })

              if (filteredLuaran.length === 0) {
                return (
                  <div className="empty-state">
                    <div className="empty-state-title">Belum ada data luaran dosen pada kategori ini</div>
                    <div className="empty-state-desc">Klik "Tambah Luaran Dosen" untuk mencatat data sesuai kategori tabel 3.b.</div>
                  </div>
                )
              }

              return (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Nama Dosen</th>
                        <th>Kategori / Tabel</th>
                        <th>Judul Karya / Luaran / Rekognisi</th>
                        <th>Tahun</th>
                        <th>Keterangan / Nomor Registrasi</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLuaran.map((l, idx) => {
                        const namaDosen = l.namaDosen || l.dosen?.nama || '–'
                        return (
                          <tr key={l.id}>
                            <td>{idx + 1}</td>
                            <td style={{ fontWeight: 600 }}>{namaDosen}</td>
                            <td><span className="badge badge-blue">{l.jenis}</span></td>
                            <td style={{ fontWeight: 500, maxWidth: '260px' }}>{l.judul}</td>
                            <td>{l.tahun}</td>
                            <td style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)' }}>{l.detail || '–'}</td>
                            <td>
                              {canEditDosen ? (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => openEditLuaran(l)}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteLuaran(l.id)}>Hapus</button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted">–</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        )}

        {/* ─── TAB 5: TABEL 3.C TENAGA KEPENDIDIKAN ────────────────── */}
        {activeTab === '3c' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Tenaga Kependidikan (Tabel 3.c LKPS)</div>
                <div className="card-subtitle">Jumlah Pustakawan, Laboran, Teknisi, & Administrasi Berdasarkan Pendidikan</div>
              </div>
              {canEditTendik && (
                <button id="btn-add-tendik-3c" className="btn btn-primary" onClick={openAddTendik}>
                  <Plus size={16} />
                  Tambah Tendik
                </button>
              )}
            </div>

            {tendikList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Belum ada data tenaga kependidikan</div>
                <div className="empty-state-desc">Klik "Tambah Tendik" untuk menginput data pendukung.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Jenis Tenaga Kependidikan</th>
                      <th>Jenjang Pendidikan Terakhir</th>
                      <th>Jumlah Personel</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tendikList.map((t, idx) => (
                      <tr key={t.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{t.jenis}</td>
                        <td><span className="badge badge-purple">{t.jenjangPendidikan}</span></td>
                        <td style={{ fontWeight: 700, color: 'var(--lkps-accent-blue)' }}>{t.jumlah} Orang</td>
                        <td>
                          {canEditTendik ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditTendik(t)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTendik(t.id)}>Hapus</button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODALS ─────────────────────────────────────────────── */}

      {/* 1. Modal Dosen Tetap (3.a.1) */}
      {showDosenModal && editingDosen && canEditDosen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDosenModal(false)}>
          <div className="modal" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingDosen.id.startsWith('temp_') ? 'Tambah Profil DTPS (Tabel 3.a.1)' : 'Edit Profil DTPS (Tabel 3.a.1)'}
              </div>
              <button onClick={() => setShowDosenModal(false)} style={{ background: 'none', border: 'none', color: 'var(--lkps-text-secondary)' }}>✕</button>
            </div>
            <div className="modal-body">
              {/* Kolom 2 & 3: Nama & NIDN */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nama Lengkap & Gelar Dosen (Kolom 2) <span className="required">*</span></label>
                  <input className="form-input" value={editingDosen.nama} onChange={e => setEditingDosen({ ...editingDosen, nama: e.target.value })} placeholder="Dr. Ir. Nama Dosen, M.T." />
                </div>
                <div className="form-group">
                  <label className="form-label">NIDN / NIDK (Kolom 3) <span className="required">*</span></label>
                  <input className="form-input" value={editingDosen.nidn} onChange={e => setEditingDosen({ ...editingDosen, nidn: e.target.value })} placeholder="0012345678" />
                </div>
              </div>

              {/* Kolom 4: Nama Prodi Pascasarjana Magister & Doktor */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prodi Magister / Magister Terapan (S2)</label>
                  <input className="form-input" value={editingDosen.prodiPascaS2 || ''} onChange={e => setEditingDosen({ ...editingDosen, prodiPascaS2: e.target.value, pendidikanS2: Boolean(e.target.value) })} placeholder="Contoh: Magister Teknik Elektro UNILA" />
                </div>
                <div className="form-group">
                  <label className="form-label">Prodi Doktor / Doktor Terapan (S3)</label>
                  <input className="form-input" value={editingDosen.prodiPascaS3 || ''} onChange={e => setEditingDosen({ ...editingDosen, prodiPascaS3: e.target.value, pendidikanS3: Boolean(e.target.value) })} placeholder="Contoh: Doktor Ilmu Komputer ITB (kosongkan bila belum S3)" />
                </div>
              </div>

              {/* Kolom 5 & 6: Bidang Keahlian & Kesesuaian Kompetensi Inti */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bidang Keahlian (Kolom 5) <span className="required">*</span></label>
                  <input className="form-input" value={editingDosen.bidangKeahlian} onChange={e => setEditingDosen({ ...editingDosen, bidangKeahlian: e.target.value })} placeholder="Contoh: Rekayasa Perangkat Lunak & Sistem Cerdas" />
                </div>
                <div className="form-group">
                  <label className="form-label">Kesesuaian dg Kompetensi Inti PS (Kolom 6)</label>
                  <select className="form-select" value={(editingDosen.kesesuaianKompetensi ?? true) ? 'true' : 'false'} onChange={e => setEditingDosen({ ...editingDosen, kesesuaianKompetensi: e.target.value === 'true' })}>
                    <option value="true">✓ Sesuai (V)</option>
                    <option value="false">✗ Tidak Sesuai</option>
                  </select>
                </div>
              </div>

              {/* Kolom 7 & 8: Jabatan Akademik & No Sertifikat Pendidik */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jabatan Akademik (Kolom 7)</label>
                  <select className="form-select" value={editingDosen.jabatanAkademik} onChange={e => setEditingDosen({ ...editingDosen, jabatanAkademik: e.target.value })}>
                    <option>Asisten Ahli</option>
                    <option>Lektor</option>
                    <option>Lektor Kepala</option>
                    <option>Guru Besar</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">No. Sertifikat Pendidik Profesional (Kolom 8)</label>
                  <input className="form-input" value={editingDosen.noSertifikatPendidik || ''} onChange={e => setEditingDosen({ ...editingDosen, noSertifikatPendidik: e.target.value, sertifikasiDosen: Boolean(e.target.value) })} placeholder="Contoh: 191001001001 (kosongkan bila belum serdos)" />
                </div>
              </div>

              {/* Kolom 9 & 10: Sertifikat Kompetensi/Profesi */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bidang Sertifikasi Profesi/Industri (Kolom 9)</label>
                  <input className="form-input" value={editingDosen.bidangSertifikasi || ''} onChange={e => setEditingDosen({ ...editingDosen, bidangSertifikasi: e.target.value, sertifikasiKompetensi: Boolean(e.target.value) })} placeholder="Contoh: Certified Software Architect / CCNA" />
                </div>
                <div className="form-group">
                  <label className="form-label">Lembaga Penerbit Sertifikasi (Kolom 10)</label>
                  <input className="form-input" value={editingDosen.lembagaSertifikasi || ''} onChange={e => setEditingDosen({ ...editingDosen, lembagaSertifikasi: e.target.value })} placeholder="Contoh: BNSP / Cisco Systems / Oracle" />
                </div>
              </div>

              {/* Kolom 11, 12, 13: Mata Kuliah Diampu */}
              <div className="form-group">
                <label className="form-label">Mata Kuliah Diampu pd PS yang Diakreditasi (Kolom 11) <span className="required">*</span></label>
                <input className="form-input" value={editingDosen.mataKuliahDiampu} onChange={e => setEditingDosen({ ...editingDosen, mataKuliahDiampu: e.target.value })} placeholder="Pemrograman Web, Rekayasa Perangkat Lunak, Basis Data" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kesesuaian Keahlian dg MK (Kolom 12)</label>
                  <select className="form-select" value={editingDosen.kesesuaianBidang ? 'true' : 'false'} onChange={e => setEditingDosen({ ...editingDosen, kesesuaianBidang: e.target.value === 'true' })}>
                    <option value="true">✓ Sesuai (V)</option>
                    <option value="false">✗ Tidak Sesuai</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mata Kuliah Diampu pd PS Lain (Kolom 13)</label>
                  <input className="form-input" value={editingDosen.mataKuliahPSLain || ''} onChange={e => setEditingDosen({ ...editingDosen, mataKuliahPSLain: e.target.value })} placeholder="Contoh: Algoritma & Pemrograman (PS Teknik Elektro) atau '-'" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDosenModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveDosen} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Dosen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Bimbingan TA (3.a.2) */}
      {showBimbinganModal && editingBimbingan && canEditDosen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBimbinganModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Beban Bimbingan Tugas Akhir Dosen</div>
              <button onClick={() => setShowBimbinganModal(false)} style={{ background: 'none', border: 'none', color: 'var(--lkps-text-secondary)' }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Pilih Dosen Pembimbing <span className="required">*</span></label>
                <select className="form-select" value={editingBimbingan.dosenId} onChange={e => setEditingBimbingan({ ...editingBimbingan, dosenId: e.target.value })}>
                  {dosenList.map(d => (
                    <option key={d.id} value={d.id}>{d.nama} ({d.nidn})</option>
                  ))}
                </select>
              </div>
              <div style={{ fontWeight: 600, fontSize: '13px', margin: '12px 0 8px', color: 'var(--lkps-accent-blue)' }}>Bimbingan di PS Sendiri:</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jumlah Mhs TS-2</label>
                  <input type="number" min="0" className="form-input" value={editingBimbingan.bimbinganPSSendiriTS2} onChange={e => setEditingBimbingan({ ...editingBimbingan, bimbinganPSSendiriTS2: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Mhs TS-1</label>
                  <input type="number" min="0" className="form-input" value={editingBimbingan.bimbinganPSSendiriTS1} onChange={e => setEditingBimbingan({ ...editingBimbingan, bimbinganPSSendiriTS1: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Mhs TS</label>
                  <input type="number" min="0" className="form-input" value={editingBimbingan.bimbinganPSSendiriTS} onChange={e => setEditingBimbingan({ ...editingBimbingan, bimbinganPSSendiriTS: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: '13px', margin: '12px 0 8px', color: 'var(--lkps-accent-purple)' }}>Bimbingan di PS Lain:</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jumlah Mhs TS-2</label>
                  <input type="number" min="0" className="form-input" value={editingBimbingan.bimbinganPSLainTS2} onChange={e => setEditingBimbingan({ ...editingBimbingan, bimbinganPSLainTS2: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Mhs TS-1</label>
                  <input type="number" min="0" className="form-input" value={editingBimbingan.bimbinganPSLainTS1} onChange={e => setEditingBimbingan({ ...editingBimbingan, bimbinganPSLainTS1: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Mhs TS</label>
                  <input type="number" min="0" className="form-input" value={editingBimbingan.bimbinganPSLainTS} onChange={e => setEditingBimbingan({ ...editingBimbingan, bimbinganPSLainTS: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowBimbinganModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveBimbingan} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Bimbingan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal EWMP (3.a.3) */}
      {showEwmpModal && editingEwmp && canEditDosen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEwmpModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Ekuivalensi Waktu Mengajar Penuh (EWMP)</div>
              <button onClick={() => setShowEwmpModal(false)} style={{ background: 'none', border: 'none', color: 'var(--lkps-text-secondary)' }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Pilih Dosen Tetap <span className="required">*</span></label>
                <select className="form-select" value={editingEwmp.dosenId} onChange={e => setEditingEwmp({ ...editingEwmp, dosenId: e.target.value })}>
                  {dosenList.map(d => (
                    <option key={d.id} value={d.id}>{d.nama} ({d.nidn})</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Pendidikan (PS Sendiri)</label>
                  <input type="number" step="0.5" className="form-input" value={editingEwmp.sksPendidikanPSSendiri} onChange={e => setEditingEwmp({ ...editingEwmp, sksPendidikanPSSendiri: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pendidikan (PS Lain)</label>
                  <input type="number" step="0.5" className="form-input" value={editingEwmp.sksPendidikanPSLain} onChange={e => setEditingEwmp({ ...editingEwmp, sksPendidikanPSLain: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">SKS Penelitian</label>
                  <input type="number" step="0.5" className="form-input" value={editingEwmp.sksPenelitian} onChange={e => setEditingEwmp({ ...editingEwmp, sksPenelitian: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">SKS PkM</label>
                  <input type="number" step="0.5" className="form-input" value={editingEwmp.sksPkm} onChange={e => setEditingEwmp({ ...editingEwmp, sksPkm: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">SKS Tugas Tambahan / Manajerial</label>
                <input type="number" step="0.5" className="form-input" value={editingEwmp.sksTugasTambahan} onChange={e => setEditingEwmp({ ...editingEwmp, sksTugasTambahan: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowEwmpModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveEwmp} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan EWMP'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Luaran Dosen (3.b) */}
      {showLuaranModal && editingLuaran && canEditDosen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLuaranModal(false)}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div className="modal-title">Kinerja & Luaran Dosen Tetap (Tabel 3.b)</div>
              <button onClick={() => setShowLuaranModal(false)} style={{ background: 'none', border: 'none', color: 'var(--lkps-text-secondary)' }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dosen Tetap Penugasan PS (DTPS) <span className="required">*</span></label>
                  <select
                    className="form-select"
                    value={editingLuaran.dosenId || ''}
                    onChange={(e) => {
                      const sel = dosenList.find((d) => d.id === e.target.value)
                      setEditingLuaran({
                        ...editingLuaran,
                        dosenId: e.target.value,
                        namaDosen: sel ? sel.nama : editingLuaran.namaDosen,
                      })
                    }}
                  >
                    <option value="">-- Pilih DTPS Terdaftar atau Isi Manual --</option>
                    {dosenList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama} ({d.nidn})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Dosen (Tampil di Borang)</label>
                  <input
                    className="form-input"
                    value={editingLuaran.namaDosen || ''}
                    onChange={(e) => setEditingLuaran({ ...editingLuaran, namaDosen: e.target.value })}
                    placeholder="Nama dosen lengkap beserta gelar"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Kategori / Tabel Indikator LAM Teknik <span className="required">*</span></label>
                <select
                  className="form-select"
                  value={editingLuaran.jenis}
                  onChange={(e) => setEditingLuaran({ ...editingLuaran, jenis: e.target.value })}
                >
                  <optgroup label="Tabel 3.b.1) Pengakuan / Rekognisi DTPS">
                    <option value="Rekognisi - Visiting Lecturer / Scholar">Visiting Lecturer / Visiting Scholar</option>
                    <option value="Rekognisi - Keynote / Invited Speaker">Keynote Speaker / Invited Speaker</option>
                    <option value="Rekognisi - Editor / Mitra Bestari Jurnal">Editor / Mitra Bestari Jurnal Bereputasi</option>
                    <option value="Rekognisi - Staf Ahli / Narasumber">Staf Ahli / Konsultan / Narasumber Lembaga</option>
                    <option value="Rekognisi - Penghargaan Prestasi / Kinerja">Penghargaan atas Prestasi / Kinerja</option>
                  </optgroup>
                  <optgroup label="Tabel 3.b.4 & 3.b.5) Publikasi Ilmiah DTPS">
                    <option value="Publikasi - Jurnal Nasional Tidak Terakreditasi">Jurnal Nasional Tidak Terakreditasi</option>
                    <option value="Publikasi - Jurnal Nasional Terakreditasi (SINTA)">Jurnal Nasional Terakreditasi (SINTA)</option>
                    <option value="Publikasi - Jurnal Internasional">Jurnal Internasional</option>
                    <option value="Publikasi - Jurnal Internasional Bereputasi">Jurnal Internasional Bereputasi (Scopus/WoS)</option>
                    <option value="Publikasi - Seminar Wilayah / Lokal">Seminar Wilayah / Lokal / PT</option>
                    <option value="Publikasi - Seminar Nasional">Seminar Nasional</option>
                    <option value="Publikasi - Seminar Internasional">Seminar Internasional / Prosiding Terindeks</option>
                    <option value="Publikasi - Media Massa Nasional / Internasional">Tulisan di Media Massa Nasional / Internasional</option>
                  </optgroup>
                  <optgroup label="Tabel 3.b.6) Karya Ilmiah DTPS yang Disitasi">
                    <option value="Sitasi - Artikel Ilmiah DTPS">Artikel Ilmiah yang Disitasi dalam 3 Tahun Terakhir</option>
                  </optgroup>
                  <optgroup label="Tabel 3.b.7) Produk / Jasa yang Diadopsi Industri">
                    <option value="Produk/Jasa - Diadopsi Industri / Masyarakat">Produk / Jasa yang Diadopsi Industri / Masyarakat</option>
                  </optgroup>
                  <optgroup label="Tabel 3.b.8) Luaran HKI & Buku DTPS">
                    <option value="HKI - Paten / Paten Sederhana">HKI Bagian 1: Paten / Paten Sederhana (Granted)</option>
                    <option value="HKI - Hak Cipta / Desain Industri">HKI Bagian 2: Hak Cipta / Desain Produk Industri</option>
                    <option value="Teknologi Tepat Guna / Desain / Rekayasa">Teknologi Tepat Guna / Desain Produk / Rekayasa Sosial</option>
                    <option value="Buku Ber-ISBN / Book Chapter">Buku Ber-ISBN / Book Chapter Penerbit Terakreditasi</option>
                  </optgroup>
                </select>
              </div>

              {/* Form Dinamis Berdasarkan Kategori Luaran */}
              {editingLuaran.jenis.includes('Rekognisi') ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Bentuk Rekognisi / Nama Kegiatan <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={editingLuaran.judul}
                      onChange={(e) => setEditingLuaran({ ...editingLuaran, judul: e.target.value })}
                      placeholder="Contoh: Keynote Speaker International Conference on IoT / Reviewer IEEE Access"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tahun Pelaksanaan</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editingLuaran.tahun}
                        onChange={(e) => setEditingLuaran({ ...editingLuaran, tahun: parseInt(e.target.value) || new Date().getFullYear() })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tingkat & Bukti Sahih (SK/Sertifikat/Tautan)</label>
                      <input
                        className="form-input"
                        value={editingLuaran.detail}
                        onChange={(e) => setEditingLuaran({ ...editingLuaran, detail: e.target.value })}
                        placeholder="Contoh: Internasional - SK Rektor / Piagam / URL Bukti"
                      />
                    </div>
                  </div>
                </>
              ) : editingLuaran.jenis.includes('Sitasi') ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Judul Artikel yang Disitasi <span className="required">*</span></label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={editingLuaran.judul}
                      onChange={(e) => setEditingLuaran({ ...editingLuaran, judul: e.target.value })}
                      placeholder="Judul artikel ilmiah lengkap dosen yang disitasi..."
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tahun Publikasi Artikel</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editingLuaran.tahun}
                        onChange={(e) => setEditingLuaran({ ...editingLuaran, tahun: parseInt(e.target.value) || new Date().getFullYear() })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nama Jurnal, Volume, No & Jumlah Sitasi</label>
                      <input
                        className="form-input"
                        value={editingLuaran.detail}
                        onChange={(e) => setEditingLuaran({ ...editingLuaran, detail: e.target.value })}
                        placeholder="Contoh: Jurnal TELKOMNIKA Vol 18(2), 2023 | 14 Sitasi (Google Scholar/Scopus)"
                      />
                    </div>
                  </div>
                </>
              ) : editingLuaran.jenis.includes('Produk') || editingLuaran.jenis.includes('Jasa') ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Nama Produk / Jasa yang Diadopsi <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={editingLuaran.judul}
                      onChange={(e) => setEditingLuaran({ ...editingLuaran, judul: e.target.value })}
                      placeholder="Contoh: Sistem SCADA Pembangkit Mikrohidro / Aplikasi Monitoring Irigasi Cerdas"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tahun Adopsi</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editingLuaran.tahun}
                        onChange={(e) => setEditingLuaran({ ...editingLuaran, tahun: parseInt(e.target.value) || new Date().getFullYear() })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Industri / Mitra Pengadopsi & Bukti Sahih</label>
                      <input
                        className="form-input"
                        value={editingLuaran.detail}
                        onChange={(e) => setEditingLuaran({ ...editingLuaran, detail: e.target.value })}
                        placeholder="Contoh: PT. PLN Persero / Dinas Pertanian - Kontrak Lisensi / PKS"
                      />
                    </div>
                  </div>
                </>
              ) : editingLuaran.jenis.includes('HKI') || editingLuaran.jenis.includes('Paten') || editingLuaran.jenis.includes('Buku') ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Judul Luaran HKI / Paten / Judul Buku <span className="required">*</span></label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={editingLuaran.judul}
                      onChange={(e) => setEditingLuaran({ ...editingLuaran, judul: e.target.value })}
                      placeholder="Judul penemuan yang dipatenkan / judul buku ber-ISBN..."
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tahun Perolehan / Terbit</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editingLuaran.tahun}
                        onChange={(e) => setEditingLuaran({ ...editingLuaran, tahun: parseInt(e.target.value) || new Date().getFullYear() })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nomor Paten / Sertifikat HKI / ISBN Buku</label>
                      <input
                        className="form-input"
                        value={editingLuaran.detail}
                        onChange={(e) => setEditingLuaran({ ...editingLuaran, detail: e.target.value })}
                        placeholder="Contoh: IDP000012345 (Granted) / ISBN 978-623-1234-56-7"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Default Publikasi Ilmiah */
                <>
                  <div className="form-group">
                    <label className="form-label">Judul Artikel / Makalah Publikasi Ilmiah <span className="required">*</span></label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={editingLuaran.judul}
                      onChange={(e) => setEditingLuaran({ ...editingLuaran, judul: e.target.value })}
                      placeholder="Judul artikel ilmiah lengkap..."
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tahun Terbit</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editingLuaran.tahun}
                        onChange={(e) => setEditingLuaran({ ...editingLuaran, tahun: parseInt(e.target.value) || new Date().getFullYear() })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nama Jurnal / Prosiding, Volume & Tautan DOI</label>
                      <input
                        className="form-input"
                        value={editingLuaran.detail}
                        onChange={(e) => setEditingLuaran({ ...editingLuaran, detail: e.target.value })}
                        placeholder="Contoh: IEEE Access Vol. 11, pp. 102-115 | https://doi.org/10.1109/..."
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowLuaranModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveLuaran} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Luaran'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Tendik (3.c) */}
      {showTendikModal && editingTendik && canEditTendik && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTendikModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Tenaga Kependidikan</div>
              <button onClick={() => setShowTendikModal(false)} style={{ background: 'none', border: 'none', color: 'var(--lkps-text-secondary)' }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Jenis Tenaga Kependidikan</label>
                <select className="form-select" value={editingTendik.jenis} onChange={e => setEditingTendik({ ...editingTendik, jenis: e.target.value })}>
                  <option>Pustakawan</option>
                  <option>Laboran</option>
                  <option>Teknisi</option>
                  <option>Administrasi</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jenjang Pendidikan Terakhir</label>
                  <select className="form-select" value={editingTendik.jenjangPendidikan} onChange={e => setEditingTendik({ ...editingTendik, jenjangPendidikan: e.target.value })}>
                    <option>SMA/SMK</option>
                    <option>D3</option>
                    <option>S1</option>
                    <option>S2</option>
                    <option>S3</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Personel</label>
                  <input type="number" min="1" className="form-input" value={editingTendik.jumlah} onChange={e => setEditingTendik({ ...editingTendik, jumlah: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowTendikModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveTendik} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Tendik'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
