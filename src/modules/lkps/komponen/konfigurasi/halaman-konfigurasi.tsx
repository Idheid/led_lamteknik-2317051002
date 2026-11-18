"use client";
/* eslint-disable react/no-unescaped-entities -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/konfigurasi/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useInfoLkps } from "@/modules/lkps/komponen/bersama/konteks"
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import {
  SlidersHorizontal,
  Plus,
  Edit2,
  Trash2,
  Layers,
  TableProperties,
  Calendar,
  Building,
  GraduationCap,
  Users2,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Save,
  X,
  Copy,
  Info,
  Sparkles,
  HelpCircle,
  Search,
  Filter,
  Eye,
  FileCheck,
  Calculator,
  Clock,
  BookOpen,
  ExternalLink,
} from 'lucide-react'

interface ParsedKetentuan {
  sheetRef?: string
  targetJenjang?: string
  konvensiWaktu?: string
  kolom?: string[] | string
  dokumenBukti?: string
  rumusPenilaian?: string
}

interface TabelItem {
  id: string
  nomorTabel: string
  namaTabel: string
  deskripsi: string | null
  levelPengisi: string
  wajibUploadBukti: boolean
  formatKolom: string | null
  statusAktif: boolean
}

interface KriteriaItem {
  id: string
  nomorUrut: number
  kode: string
  nama: string
  deskripsi: string | null
  levelWewenang: string
  statusAktif: boolean
  tabelList: TabelItem[]
}

interface RegulasiItem {
  id: string
  nama: string
  tahunAkademik: string
  statusAktif: boolean
  keterangan: string | null
  kriteriaList: KriteriaItem[]
}

export default function HalamanKonfigurasi() {
  const { peran } = useInfoLkps()

  // Akses penuh untuk mengatur kriteria & tabel (Admin UPPS / Fakultas)
  const canManage = peran === 'ADMIN'

  const [regulasiList, setRegulasiList] = useState<RegulasiItem[]>([])
  const [selectedRegulasiId, setSelectedRegulasiId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [wewenangFilter, setWewenangFilter] = useState<'ALL' | 'UPPS' | 'PRODI' | 'BERSAMA'>('ALL')
  const [selectedKriteriaPill, setSelectedKriteriaPill] = useState<string>('ALL')

  // Accordion collapsed state for criteria (defaults to true so all criteria fit nicely on screen)
  const [collapsedKriteria, setCollapsedKriteria] = useState<Record<string, boolean>>({})

  // Modal States
  const [regulasiModalOpen, setRegulasiModalOpen] = useState(false)
  const [regulasiForm, setRegulasiForm] = useState({
    id: '',
    nama: '',
    tahunAkademik: '',
    keterangan: '',
    statusAktif: true,
    cloneFromId: '',
  })

  const [kriteriaModalOpen, setKriteriaModalOpen] = useState(false)
  const [kriteriaForm, setKriteriaForm] = useState({
    id: '',
    nomorUrut: 1,
    kode: '',
    nama: '',
    deskripsi: '',
    levelWewenang: 'PRODI',
    statusAktif: true,
  })

  const [tabelModalOpen, setTabelModalOpen] = useState(false)
  const [targetKriteriaId, setTargetKriteriaId] = useState('')
  const [tabelForm, setTabelForm] = useState({
    id: '',
    nomorTabel: '',
    sheetRef: '',
    namaTabel: '',
    deskripsi: '',
    levelPengisi: 'PRODI',
    targetJenjang: 'Semua Jenjang',
    konvensiWaktu: 'TS-2 s.d. TS',
    kolomInput: '',
    dokumenBukti: '',
    rumusPenilaian: '',
    wajibUploadBukti: true,
    statusAktif: true,
  })

  // Ketentuan Drawer / Detail Modal
  const [ketentuanModalOpen, setKetentuanModalOpen] = useState(false)
  const [selectedKetentuanTabel, setSelectedKetentuanTabel] = useState<{
    tabel: TabelItem
    kriteriaKode: string
    kriteriaNama: string
    ketentuan: ParsedKetentuan
  } | null>(null)

  // Template Modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [replaceExistingTemplate, setReplaceExistingTemplate] = useState(true)

  // Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    open: boolean
    type: 'kriteria' | 'tabel'
    id: string
    name: string
    subText?: string
  }>({
    open: false,
    type: 'kriteria',
    id: '',
    name: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/lkps/konfigurasi?_t=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRegulasiList(data.regulasiList || [])
        if (data.regulasiList && data.regulasiList.length > 0) {
          const active = data.regulasiList.find((r: RegulasiItem) => r.statusAktif)
          setSelectedRegulasiId(active ? active.id : data.regulasiList[0].id)
        }
      } else {
        const err = await res.json()
        setError(err.pesan || 'Gagal memuat data konfigurasi')
      }
    } catch {
      setError('Terjadi kendala koneksi saat mengambil konfigurasi')
    } finally {
      setLoading(false)
    }
  }

  const currentRegulasi = regulasiList.find((r) => r.id === selectedRegulasiId) || regulasiList[0]

  // KPI Calculations
  const totalKriteria = currentRegulasi?.kriteriaList?.length || 0
  const totalTabel = currentRegulasi?.kriteriaList?.reduce((acc, k) => acc + (k.tabelList?.length || 0), 0) || 0
  const totalUPPS = currentRegulasi?.kriteriaList?.filter((k) => k.levelWewenang === 'UPPS').length || 0
  const totalProdi = currentRegulasi?.kriteriaList?.filter((k) => k.levelWewenang === 'PRODI').length || 0
  const totalBuktiWajib = currentRegulasi?.kriteriaList?.reduce(
    (acc, k) => acc + (k.tabelList?.filter((t) => t.wajibUploadBukti).length || 0),
    0
  ) || 0

  function parseFormatKolom(formatKolom: string | null): ParsedKetentuan {
    if (!formatKolom) return {}
    try {
      const parsed = JSON.parse(formatKolom)
      return parsed
    } catch {
      return { kolom: formatKolom }
    }
  }

  function toggleCollapse(kriteriaId: string) {
    setCollapsedKriteria((prev) => {
      const current = prev[kriteriaId] !== undefined ? prev[kriteriaId] : true
      return {
        ...prev,
        [kriteriaId]: !current,
      }
    })
  }

  function handleCollapseAll(collapsed: boolean) {
    if (!currentRegulasi?.kriteriaList) return
    const newState: Record<string, boolean> = {}
    currentRegulasi.kriteriaList.forEach((k) => {
      newState[k.id] = collapsed
    })
    setCollapsedKriteria(newState)
  }

  const standardCriteriaUrls: Record<number, string> = {
    1: '/kerjasama',
    2: '/mahasiswa',
    3: '/sdm',
    4: '/keuangan',
    5: '/pendidikan',
    6: '/penelitian',
    7: '/pkm',
    8: '/luaran',
    9: '/penjaminan',
  }

  function getCriteriaPageUrl(nomorUrut: number, id: string) {
    return standardCriteriaUrls[nomorUrut] || `/kriteria/${id}`
  }

  // ─── REGULASI HANDLERS ────────────────────────────────────────────────
  function handleOpenCreateRegulasi() {
    setRegulasiForm({
      id: '',
      nama: 'Instrumen Akreditasi LAM Teknik ' + new Date().getFullYear(),
      tahunAkademik: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      keterangan: '',
      statusAktif: true,
      cloneFromId: currentRegulasi?.id || '',
    })
    setRegulasiModalOpen(true)
  }

  function handleOpenEditRegulasi(reg: RegulasiItem) {
    setRegulasiForm({
      id: reg.id,
      nama: reg.nama,
      tahunAkademik: reg.tahunAkademik,
      keterangan: reg.keterangan || '',
      statusAktif: reg.statusAktif,
      cloneFromId: '',
    })
    setRegulasiModalOpen(true)
  }

  async function handleSaveRegulasi(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const isEdit = Boolean(regulasiForm.id)
      const res = await fetch('/api/lkps/konfigurasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEdit ? 'updateRegulasi' : 'createRegulasi',
          payload: regulasiForm,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(isEdit ? 'Regulasi berhasil diperbarui!' : 'Regulasi & tahun baru berhasil ditambahkan!')
        setRegulasiModalOpen(false)
        await fetchData()
        if (data.regulasi?.id) setSelectedRegulasiId(data.regulasi.id)
      } else {
        setError(data.pesan || 'Gagal menyimpan regulasi')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSetActiveRegulasi(id: string) {
    try {
      const res = await fetch('/api/lkps/konfigurasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setActiveRegulasi', payload: { id } }),
      })
      if (res.ok) {
        setSuccess('Tahun regulasi aktif berhasil diubah!')
        await fetchData()
      }
    } catch {
      setError('Gagal mengubah regulasi aktif')
    }
  }

  async function handleDeleteRegulasi(id: string) {
    if (!confirm('Hapus versi regulasi ini beserta seluruh struktur kriteria dan tabel di dalamnya?')) return
    try {
      const res = await fetch('/api/lkps/konfigurasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteRegulasi', payload: { id } }),
      })
      if (res.ok) {
        setSuccess('Regulasi berhasil dihapus!')
        await fetchData()
      }
    } catch {
      setError('Gagal menghapus regulasi')
    }
  }

  async function handleLoadTemplateLAMTeknik() {
    if (!currentRegulasi?.id) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/lkps/konfigurasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'loadTemplateLAMTeknik',
          payload: {
            regulasiId: currentRegulasi.id,
            replaceExisting: replaceExistingTemplate,
          },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(data.message || 'Template Baku LAM Teknik berhasil dimuat!')
        setTemplateModalOpen(false)
        await fetchData()
      } else {
        setError(data.pesan || 'Gagal memuat template')
      }
    } finally {
      setSaving(false)
    }
  }

  // ─── KRITERIA HANDLERS ────────────────────────────────────────────────
  function handleOpenCreateKriteria() {
    const nextNomor = (currentRegulasi?.kriteriaList?.length || 0) + 1
    setKriteriaForm({
      id: '',
      nomorUrut: nextNomor,
      kode: `Kriteria ${nextNomor}`,
      nama: '',
      deskripsi: '',
      levelWewenang: 'PRODI',
      statusAktif: true,
    })
    setKriteriaModalOpen(true)
  }

  function handleOpenEditKriteria(k: KriteriaItem) {
    setKriteriaForm({
      id: k.id,
      nomorUrut: k.nomorUrut,
      kode: k.kode,
      nama: k.nama,
      deskripsi: k.deskripsi || '',
      levelWewenang: k.levelWewenang,
      statusAktif: k.statusAktif,
    })
    setKriteriaModalOpen(true)
  }

  async function handleSaveKriteria(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const isEdit = Boolean(kriteriaForm.id)
      const res = await fetch('/api/lkps/konfigurasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEdit ? 'updateKriteria' : 'createKriteria',
          payload: {
            ...kriteriaForm,
            regulasiId: currentRegulasi.id,
          },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(isEdit ? 'Kriteria berhasil diperbarui!' : 'Kriteria baru berhasil ditambahkan!')
        setKriteriaModalOpen(false)
        await fetchData()
        const targetId = data.kriteria?.id || kriteriaForm.id
        if (targetId) {
          setCollapsedKriteria((prev) => ({ ...prev, [targetId]: false }))
          setTimeout(() => {
            const el = document.getElementById(`kriteria-${targetId}`)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 300)
        }
      } else {
        setError(data.pesan || 'Gagal menyimpan kriteria')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatusKriteria(id: string, currentStatus: boolean) {
    try {
      const res = await fetch('/api/lkps/konfigurasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleStatusKriteria',
          payload: { id, statusAktif: !currentStatus },
        }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      setError('Gagal mengubah status kriteria')
    }
  }

  function handleOpenDeleteKriteriaModal(k: KriteriaItem) {
    setDeleteConfirmModal({
      open: true,
      type: 'kriteria',
      id: k.id,
      name: `${k.kode}: ${k.nama}`,
      subText: `Seluruh ${k.tabelList?.length || 0} tabel di dalam kriteria ini juga akan dihapus permanen.`,
    })
  }

  function handleOpenDeleteTabelModal(t: TabelItem) {
    setDeleteConfirmModal({
      open: true,
      type: 'tabel',
      id: t.id,
      name: `Tabel ${t.nomorTabel}: ${t.namaTabel}`,
      subText: 'Tabel instrumen ini akan dihapus dari kriteria.',
    })
  }

  async function handleExecuteDelete() {
    if (!deleteConfirmModal.id) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const action = deleteConfirmModal.type === 'kriteria' ? 'deleteKriteria' : 'deleteTabel'
      const res = await fetch('/api/lkps/konfigurasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          payload: { id: deleteConfirmModal.id },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(
          deleteConfirmModal.type === 'kriteria'
            ? 'Kriteria berhasil dihapus!'
            : 'Tabel berhasil dihapus!'
        )
        setDeleteConfirmModal({ open: false, type: 'kriteria', id: '', name: '' })
        await fetchData()
      } else {
        setError(data.pesan || 'Gagal menghapus data')
      }
    } catch {
      setError('Terjadi kendala koneksi saat menghapus data')
    } finally {
      setSaving(false)
    }
  }

  // ─── TABEL HANDLERS ───────────────────────────────────────────────────
  function handleOpenCreateTabel(kriteriaId: string) {
    setTargetKriteriaId(kriteriaId)
    setTabelForm({
      id: '',
      nomorTabel: '',
      sheetRef: '',
      namaTabel: '',
      deskripsi: '',
      levelPengisi: 'PRODI',
      targetJenjang: 'Semua Jenjang',
      konvensiWaktu: 'TS-2 s.d. TS',
      kolomInput: '',
      dokumenBukti: '',
      rumusPenilaian: '',
      wajibUploadBukti: true,
      statusAktif: true,
    })
    setTabelModalOpen(true)
  }

  function handleOpenEditTabel(t: TabelItem, kriteriaId: string) {
    setTargetKriteriaId(kriteriaId)
    const parsed = parseFormatKolom(t.formatKolom)
    const kolomStr = Array.isArray(parsed.kolom)
      ? parsed.kolom.join(', ')
      : typeof parsed.kolom === 'string'
      ? parsed.kolom
      : ''

    setTabelForm({
      id: t.id,
      nomorTabel: t.nomorTabel,
      sheetRef: parsed.sheetRef || '',
      namaTabel: t.namaTabel,
      deskripsi: t.deskripsi || '',
      levelPengisi: t.levelPengisi,
      targetJenjang: parsed.targetJenjang || 'Semua Jenjang',
      konvensiWaktu: parsed.konvensiWaktu || 'TS-2 s.d. TS',
      kolomInput: kolomStr,
      dokumenBukti: parsed.dokumenBukti || '',
      rumusPenilaian: parsed.rumusPenilaian || '',
      wajibUploadBukti: t.wajibUploadBukti,
      statusAktif: t.statusAktif,
    })
    setTabelModalOpen(true)
  }

  function handleOpenKetentuanModal(t: TabelItem, k: KriteriaItem) {
    const parsed = parseFormatKolom(t.formatKolom)
    setSelectedKetentuanTabel({
      tabel: t,
      kriteriaKode: k.kode,
      kriteriaNama: k.nama,
      ketentuan: parsed,
    })
    setKetentuanModalOpen(true)
  }

  async function handleSaveTabel(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const isEdit = Boolean(tabelForm.id)

      // Split kolom by comma / newline
      const kolomList = tabelForm.kolomInput
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)

      const formatKolomObj: ParsedKetentuan = {
        sheetRef: tabelForm.sheetRef || undefined,
        targetJenjang: tabelForm.targetJenjang || 'Semua Jenjang',
        konvensiWaktu: tabelForm.konvensiWaktu || 'TS-2 s.d. TS',
        kolom: kolomList.length > 0 ? kolomList : undefined,
        dokumenBukti: tabelForm.dokumenBukti || undefined,
        rumusPenilaian: tabelForm.rumusPenilaian || undefined,
      }

      const res = await fetch('/api/lkps/konfigurasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEdit ? 'updateTabel' : 'createTabel',
          payload: {
            id: tabelForm.id,
            kriteriaId: targetKriteriaId,
            nomorTabel: tabelForm.nomorTabel,
            namaTabel: tabelForm.namaTabel,
            deskripsi: tabelForm.deskripsi,
            levelPengisi: tabelForm.levelPengisi,
            wajibUploadBukti: tabelForm.wajibUploadBukti,
            formatKolom: formatKolomObj,
            statusAktif: tabelForm.statusAktif,
          },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(isEdit ? 'Tabel LKPS berhasil diperbarui!' : 'Tabel LKPS baru berhasil ditambahkan!')
        setTabelModalOpen(false)
        await fetchData()
        if (targetKriteriaId) {
          setCollapsedKriteria((prev) => ({ ...prev, [targetKriteriaId]: false }))
          setTimeout(() => {
            const el = document.getElementById(`kriteria-${targetKriteriaId}`)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 300)
        }
      } else {
        setError(data.pesan || 'Gagal menyimpan tabel')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatusTabel(id: string, currentStatus: boolean) {
    try {
      const res = await fetch('/api/lkps/konfigurasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleStatusTabel',
          payload: { id, statusAktif: !currentStatus },
        }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      setError('Gagal mengubah status tabel')
    }
  }

  // Filtered criteria & tables
  const filteredKriteriaList = useMemo(() => {
    if (!currentRegulasi?.kriteriaList) return []
    return currentRegulasi.kriteriaList
      .filter((k) => {
        if (selectedKriteriaPill !== 'ALL' && k.id !== selectedKriteriaPill) return false
        if (wewenangFilter === 'ALL') return true
        return k.levelWewenang === wewenangFilter
      })
      .map((k) => {
        if (!searchQuery.trim()) return k
        const query = searchQuery.toLowerCase()
        const matchesKriteria = k.nama.toLowerCase().includes(query) || k.kode.toLowerCase().includes(query)
        const matchingTables = (k.tabelList || []).filter(
          (t) =>
            t.namaTabel.toLowerCase().includes(query) ||
            t.nomorTabel.toLowerCase().includes(query) ||
            (t.deskripsi && t.deskripsi.toLowerCase().includes(query)) ||
            (t.formatKolom && t.formatKolom.toLowerCase().includes(query))
        )
        if (matchesKriteria) return k
        return {
          ...k,
          tabelList: matchingTables,
        }
      })
      .filter((k) => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        return (
          k.nama.toLowerCase().includes(query) ||
          k.kode.toLowerCase().includes(query) ||
          (k.tabelList && k.tabelList.length > 0)
        )
      })
  }, [currentRegulasi, searchQuery, wewenangFilter, selectedKriteriaPill])

  // Fallback view for unauthorized roles (Operator Prodi / Asesor)
  if (!canManage) {
    return (
      <>
        <JudulHalaman judul="Struktur Kriteria & Tabel LKPS" />
        <div className="page-content animate-fade-in">
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: '650px', margin: '40px auto' }}>
            <div style={{ margin: '0 auto 16px', display: 'flex', justifyContent: 'center' }}>
              <IconBadge color="rose" size="xl">
                <ShieldAlert size={36} />
              </IconBadge>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--lkps-text-primary)', marginBottom: '8px' }}>
              Akses Dibatasi Khusus Admin UPPS
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--lkps-text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              Halaman konfigurasi struktur kriteria dan tabel LKPS dinamis hanya dapat diakses oleh
              <strong> Admin UPPS (Fakultas)</strong> sesuai dengan regulasi instrumen akreditasi LAM Teknik yang berlaku.
            </p>
            <div style={{ display: 'inline-flex', padding: '8px 16px', background: 'var(--lkps-bg-secondary)', borderRadius: 'var(--lkps-radius-md)', border: '1px solid var(--lkps-border-color)', fontSize: '12px', color: 'var(--lkps-text-muted)' }}>
              Peran Anda saat ini: <strong style={{ marginLeft: '4px', color: 'var(--lkps-text-primary)' }}>{peran}</strong>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <JudulHalaman judul="Struktur Kriteria & Tabel LKPS" />

      <div className="page-content animate-fade-in">
        {/* Tab Navigasi Khusus Super Admin & Admin UPPS */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary">
            <SlidersHorizontal size={15} />
            <span>Struktur Kriteria, Tabel & Ketentuan LKPS</span>
          </button>
        </div>

        {/* Banner Penjelasan & Aksi Utama */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <IconBadge color="blue" size="md">
                <SlidersHorizontal size={20} />
              </IconBadge>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--lkps-text-primary)' }}>
                    Manajemen Kriteria, Tabel & Ketentuan LAM Teknik
                  </h2>
                  <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                    Admin UPPS (Fakultas)
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)', maxWidth: '780px', lineHeight: 1.5 }}>
                  Admin UPPS dan Super Admin berwenang menyesuaikan struktur 9 kriteria akreditasi, menambah tabel baru,
                  mengatur pembagian wewenang pengisian (UPPS/Prodi), serta merumuskan ketentuan kolom data & dokumen bukti
                  sesuai perubahan panduan akreditasi LAM Teknik tahun berjalan.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setTemplateModalOpen(true)}
                title="Terapkan template baku standar LAM Teknik lengkap dengan 60 tabel dan seluruh ketentuan"
              >
                <Sparkles size={14} style={{ color: 'var(--lkps-accent-amber)' }} />
                <span>Template Baku LAM Teknik</span>
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleOpenCreateRegulasi}>
                <Calendar size={14} />
                <span>+ Versi Regulasi Baru</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleOpenCreateKriteria}>
                <Plus size={14} />
                <span>+ Tambah Kriteria</span>
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* Filter Versi Regulasi & KPI Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--lkps-text-secondary)' }}>
              Versi Regulasi:
            </label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '340px', fontWeight: 600 }}
              value={selectedRegulasiId}
              onChange={(e) => setSelectedRegulasiId(e.target.value)}
            >
              {regulasiList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama} ({r.tahunAkademik}) {r.statusAktif ? '★ AKTIF' : ''}
                </option>
              ))}
            </select>

            {currentRegulasi && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {!currentRegulasi.statusAktif && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '12px', color: 'var(--lkps-accent-emerald)' }}
                    onClick={() => handleSetActiveRegulasi(currentRegulasi.id)}
                    title="Jadikan regulasi ini sebagai acuan aktif sistem"
                  >
                    ★ Jadikan Aktif
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '12px' }}
                  onClick={() => handleOpenEditRegulasi(currentRegulasi)}
                  title="Edit Nama / Tahun Regulasi"
                >
                  <Edit2 size={13} /> Edit
                </button>
                {regulasiList.length > 1 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '12px', color: 'var(--lkps-accent-rose)' }}
                    onClick={() => handleDeleteRegulasi(currentRegulasi.id)}
                    title="Hapus versi regulasi ini"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)' }}>
              Total Kriteria: <strong style={{ color: 'var(--lkps-accent-blue)' }}>{totalKriteria}</strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)' }}>
              Total Tabel: <strong style={{ color: 'var(--lkps-accent-purple)' }}>{totalTabel}</strong>
            </div>
          </div>
        </div>

        {/* KPI Mini Cards */}
        <div className="grid-4" style={{ gap: '14px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)', marginBottom: '4px' }}>Tahun Panduan Aktif</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--lkps-text-primary)' }}>
              {currentRegulasi?.tahunAkademik || '-'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--lkps-accent-emerald)', marginTop: '4px', fontWeight: 600 }}>
              {currentRegulasi?.statusAktif ? '● Digunakan Seluruh Prodi' : '○ Arsip Cadangan'}
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)', marginBottom: '4px' }}>Kriteria Wewenang UPPS</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--lkps-accent-blue)' }}>
              {totalUPPS} Kriteria
            </div>
            <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginTop: '4px' }}>
              Tata Kelola, Keuangan, SPMI
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)', marginBottom: '4px' }}>Kriteria Wewenang Prodi</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--lkps-accent-emerald)' }}>
              {totalProdi} Kriteria
            </div>
            <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginTop: '4px' }}>
              Mhs, Kurikulum, Riset, Luaran
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)', marginBottom: '4px' }}>Tabel Wajib Bukti PDF</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--lkps-accent-amber)' }}>
              {totalBuktiWajib} Tabel
            </div>
            <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginTop: '4px' }}>
              Memerlukan MoU / SK / Dokumen
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div
          className="card"
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
            <Search size={16} style={{ color: 'var(--lkps-text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: '13px', width: '100%' }}
              placeholder="Cari kriteria, nomor tabel (contoh: 3a1, 1.1), nama tabel, atau ketentuan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px' }}
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} style={{ color: 'var(--lkps-text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)', fontWeight: 600 }}>Filter Wewenang:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['ALL', 'UPPS', 'PRODI', 'BERSAMA'] as const).map((filter) => (
                <button
                  key={filter}
                  className={`btn btn-sm ${wewenangFilter === filter ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => setWewenangFilter(filter)}
                >
                  {filter === 'ALL' ? 'Semua' : filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Criteria Quick Jump Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--lkps-text-muted)', fontWeight: 600, flexShrink: 0 }}>
            Lompat Cepat:
          </span>
          <button
            className={`btn btn-sm ${selectedKriteriaPill === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '11px', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}
            onClick={() => setSelectedKriteriaPill('ALL')}
          >
            Semua ({currentRegulasi?.kriteriaList?.length || 0})
          </button>
          {currentRegulasi?.kriteriaList?.map((k) => {
            const isCustom = k.nomorUrut > 9
            return (
              <button
                key={k.id}
                className={`btn btn-sm ${selectedKriteriaPill === k.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  fontSize: '11px',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  whiteSpace: 'nowrap',
                  border: isCustom ? '1px dashed var(--lkps-accent-purple)' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onClick={() => {
                  setSelectedKriteriaPill(k.id)
                  setCollapsedKriteria((prev) => ({ ...prev, [k.id]: false }))
                  setTimeout(() => {
                    const el = document.getElementById(`kriteria-${k.id}`)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 100)
                }}
              >
                <span>{k.kode}</span>
                {isCustom && (
                  <span style={{ fontSize: '9px', opacity: 0.85, fontWeight: 700 }}>
                    ({k.nama.length > 12 ? k.nama.slice(0, 12) + '...' : k.nama})
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Section Header with Expand / Collapse All */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)' }}>
            Menampilkan <strong>{filteredKriteriaList.length}</strong> Kriteria Akreditasi
            {selectedKriteriaPill !== 'ALL' && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11px', marginLeft: '8px', color: 'var(--lkps-accent-blue)', padding: '2px 6px' }}
                onClick={() => setSelectedKriteriaPill('ALL')}
              >
                (Tampilkan Semua)
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => handleCollapseAll(true)}
            >
              Ciutkan Semua
            </button>
            <button
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => handleCollapseAll(false)}
            >
              Buka Semua
            </button>
          </div>
        </div>

        {/* Daftar Kriteria & Tabel Accordion */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--lkps-text-secondary)' }}>
            <Loader2 className="spin" size={28} style={{ margin: '0 auto 12px', color: 'var(--lkps-accent-blue)' }} />
            <div>Memuat konfigurasi kriteria, tabel dan ketentuan...</div>
          </div>
        ) : filteredKriteriaList.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
              Tidak ada kriteria yang sesuai filter atau pencarian
            </div>
            <p style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)', marginBottom: '16px' }}>
              Coba atur ulang pencarian atau klik tombol di bawah untuk menambahkan kriteria akreditasi.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('')
                  setWewenangFilter('ALL')
                  setSelectedKriteriaPill('ALL')
                }}
              >
                Reset Filter
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleOpenCreateKriteria}>
                <Plus size={14} /> Tambah Kriteria
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredKriteriaList.map((kriteria) => {
              const isCollapsed = collapsedKriteria[kriteria.id] !== undefined ? collapsedKriteria[kriteria.id] : true
              const isCustom = kriteria.nomorUrut > 9
              const wewenangBadge =
                kriteria.levelWewenang === 'UPPS'
                  ? 'badge-blue'
                  : kriteria.levelWewenang === 'PRODI'
                  ? 'badge-emerald'
                  : 'badge-purple'

              return (
                <div
                  key={kriteria.id}
                  id={`kriteria-${kriteria.id}`}
                  className="card"
                  style={{
                    padding: '0',
                    overflow: 'hidden',
                    borderColor: isCustom ? 'rgba(139,92,246,0.4)' : undefined,
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      padding: '16px 20px',
                      background: 'var(--lkps-bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      borderBottom: isCollapsed ? 'none' : '1px solid var(--lkps-border-color)',
                    }}
                    onClick={() => toggleCollapse(kriteria.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: 'var(--lkps-text-muted)' }}>
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      </span>
                      <span className="badge badge-purple" style={{ fontWeight: 700 }}>
                        {kriteria.kode}
                      </span>
                      <div>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: 'var(--lkps-text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>{kriteria.nama}</span>
                          {isCustom && (
                            <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                              Kustom
                            </span>
                          )}
                          {!kriteria.statusAktif && (
                            <span className="badge badge-secondary" style={{ fontSize: '10px' }}>
                              Non-Aktif
                            </span>
                          )}
                        </div>
                        {kriteria.deskripsi && (
                          <div style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)', marginTop: '2px' }}>
                            {kriteria.deskripsi}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={getCriteriaPageUrl(kriteria.nomorUrut, kriteria.id)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Buka halaman pengisian data kriteria"
                      >
                        <ExternalLink size={12} />
                        <span>Buka Halaman</span>
                      </Link>
                      <span
                        className={`badge ${wewenangBadge}`}
                        style={{ fontSize: '11px', textTransform: 'uppercase' }}
                      >
                        {kriteria.levelWewenang}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--lkps-text-muted)' }}>
                        {kriteria.tabelList?.length || 0} Tabel
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px' }}
                        title="Edit Kriteria"
                        onClick={() => handleOpenEditKriteria(kriteria)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px', color: 'var(--lkps-accent-rose)' }}
                        title="Hapus Kriteria"
                        onClick={() => handleOpenDeleteKriteriaModal(kriteria)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Card Body: List of Tables */}
                  {!isCollapsed && (
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--lkps-text-secondary)' }}>
                          Daftar Tabel & Ketentuan di Bawah {kriteria.kode}
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                          onClick={() => handleOpenCreateTabel(kriteria.id)}
                        >
                          <Plus size={13} /> Tambah Tabel
                        </button>
                      </div>

                      {kriteria.tabelList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', background: 'var(--lkps-bg-primary)', borderRadius: 'var(--lkps-radius-md)', border: '1px dashed var(--lkps-border-color)', color: 'var(--lkps-text-muted)', fontSize: '13px' }}>
                          Belum ada tabel data di kriteria ini. Klik "+ Tambah Tabel" untuk mendefinisikan instrumen baru.
                        </div>
                      ) : (
                        <div className="table-container">
                          <table className="data-table" style={{ fontSize: '13px' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '130px' }}>Nomor & Sheet</th>
                                <th>Nama Tabel LKPS & Ketentuan</th>
                                <th style={{ width: '140px' }}>Target Jenjang & Waktu</th>
                                <th style={{ width: '130px' }}>Pengisi Data</th>
                                <th style={{ width: '110px' }}>Upload Bukti</th>
                                <th style={{ width: '110px', textAlign: 'center' }}>Ketentuan</th>
                                <th style={{ width: '90px', textAlign: 'center' }}>Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {kriteria.tabelList.map((t) => {
                                const parsed = parseFormatKolom(t.formatKolom)
                                return (
                                  <tr key={t.id} style={{ opacity: t.statusAktif ? 1 : 0.6 }}>
                                    <td>
                                      <div>
                                        <span style={{ fontWeight: 700, color: 'var(--lkps-accent-blue)' }}>
                                          {t.nomorTabel}
                                        </span>
                                        {parsed.sheetRef && (
                                          <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginTop: '2px' }}>
                                            Sheet: <code>{parsed.sheetRef}</code>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <div>
                                        <strong style={{ color: 'var(--lkps-text-primary)' }}>{t.namaTabel}</strong>
                                        {t.deskripsi && (
                                          <div style={{ color: 'var(--lkps-text-secondary)', fontSize: '12px', marginTop: '2px', maxWidth: '340px' }}>
                                            {t.deskripsi}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ fontSize: '11px' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--lkps-text-primary)' }}>
                                          {parsed.targetJenjang || 'Semua Jenjang'}
                                        </div>
                                        <div style={{ color: 'var(--lkps-text-muted)', marginTop: '2px' }}>
                                          {parsed.konvensiWaktu || 'TS-2 s.d. TS'}
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className={`badge ${t.levelPengisi === 'UPPS' ? 'badge-blue' : 'badge-emerald'}`} style={{ fontSize: '11px' }}>
                                        {t.levelPengisi === 'UPPS' ? 'UPPS (Fakultas)' : 'Operator Prodi'}
                                      </span>
                                    </td>
                                    <td>
                                      {t.wajibUploadBukti ? (
                                        <span className="badge badge-amber" style={{ fontSize: '11px' }}>Wajib PDF</span>
                                      ) : (
                                        <span className="badge badge-secondary" style={{ fontSize: '11px' }}>Opsional</span>
                                      )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ fontSize: '11px', padding: '3px 8px' }}
                                        onClick={() => handleOpenKetentuanModal(t, kriteria)}
                                        title="Buka panduan ketentuan kolom, bukti dokumen, dan rumus penilaian"
                                      >
                                        <Info size={12} />
                                        <span>Ketentuan</span>
                                      </button>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                                        <button
                                          className="btn btn-ghost btn-sm"
                                          style={{ padding: '4px', color: 'var(--lkps-accent-blue)' }}
                                          title="Edit Tabel & Ketentuan"
                                          onClick={() => handleOpenEditTabel(t, kriteria.id)}
                                        >
                                          <Edit2 size={13} />
                                        </button>
                                        <button
                                          className="btn btn-ghost btn-sm"
                                          style={{ padding: '4px', color: 'var(--lkps-accent-rose)' }}
                                          title="Hapus Tabel"
                                          onClick={() => handleOpenDeleteTabelModal(t)}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
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
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL 1: REGULASI / TAHUN ────────────────────────────────────────── */}
      {regulasiModalOpen && (
        <div className="modal-overlay" onClick={() => setRegulasiModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconBadge color="blue" size="sm">
                  <Calendar size={16} />
                </IconBadge>
                <div className="modal-title">
                  {regulasiForm.id ? 'Edit Versi Regulasi' : 'Tambah Versi Regulasi Baru'}
                </div>
              </div>
              <button onClick={() => setRegulasiModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lkps-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRegulasi}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Regulasi / Instrumen <span className="required">*</span></label>
                  <input
                    className="form-input"
                    required
                    value={regulasiForm.nama}
                    onChange={(e) => setRegulasiForm({ ...regulasiForm, nama: e.target.value })}
                    placeholder="Contoh: Instrumen LAM Teknik 2024 (Diploma III / Sarjana Terapan)"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tahun Akademik <span className="required">*</span></label>
                    <input
                      className="form-input"
                      required
                      value={regulasiForm.tahunAkademik}
                      onChange={(e) => setRegulasiForm({ ...regulasiForm, tahunAkademik: e.target.value })}
                      placeholder="Contoh: 2024/2025"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status Acuan</label>
                    <select
                      className="form-select"
                      value={regulasiForm.statusAktif ? 'true' : 'false'}
                      onChange={(e) => setRegulasiForm({ ...regulasiForm, statusAktif: e.target.value === 'true' })}
                    >
                      <option value="true">Jadikan Regulasi Aktif</option>
                      <option value="false">Simpan sebagai Draf / Arsip</option>
                    </select>
                  </div>
                </div>

                {!regulasiForm.id && regulasiList.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Duplikasi Struktur Dari Versi Sebelumnya</label>
                    <select
                      className="form-select"
                      value={regulasiForm.cloneFromId}
                      onChange={(e) => setRegulasiForm({ ...regulasiForm, cloneFromId: e.target.value })}
                    >
                      <option value="">-- Buat Dari Kosong --</option>
                      {regulasiList.map((r) => (
                        <option key={r.id} value={r.id}>
                          Salin dari: {r.nama} ({r.tahunAkademik})
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginTop: '4px' }}>
                      Jika dipilih, seluruh kriteria dan tabel pada versi tersebut akan disalin otomatis ke regulasi baru ini.
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Catatan / Keterangan</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={regulasiForm.keterangan}
                    onChange={(e) => setRegulasiForm({ ...regulasiForm, keterangan: e.target.value })}
                    placeholder="Keterangan SK atau catatan perubahan aturan LAM Teknik..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setRegulasiModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                  {saving ? 'Menyimpan...' : 'Simpan Regulasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: KRITERIA ─────────────────────────────────────────────────── */}
      {kriteriaModalOpen && (
        <div className="modal-overlay" onClick={() => setKriteriaModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconBadge color="purple" size="sm">
                  <Layers size={16} />
                </IconBadge>
                <div className="modal-title">
                  {kriteriaForm.id ? 'Edit Kriteria' : 'Tambah Kriteria Baru'}
                </div>
              </div>
              <button onClick={() => setKriteriaModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lkps-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveKriteria}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group" style={{ flex: '0 0 100px' }}>
                    <label className="form-label">No. Urut <span className="required">*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      required
                      min={1}
                      max={99}
                      value={kriteriaForm.nomorUrut}
                      onChange={(e) => setKriteriaForm({ ...kriteriaForm, nomorUrut: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kode Kriteria <span className="required">*</span></label>
                    <input
                      className="form-input"
                      required
                      value={kriteriaForm.kode}
                      onChange={(e) => setKriteriaForm({ ...kriteriaForm, kode: e.target.value })}
                      placeholder="Contoh: Kriteria 1 atau K1"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tingkat Wewenang <span className="required">*</span></label>
                    <select
                      className="form-select"
                      value={kriteriaForm.levelWewenang}
                      onChange={(e) => setKriteriaForm({ ...kriteriaForm, levelWewenang: e.target.value })}
                    >
                      <option value="UPPS">UPPS (Fakultas / Makro)</option>
                      <option value="PRODI">Operator Prodi (Mikro)</option>
                      <option value="BERSAMA">Bersama (UPPS & Prodi)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Kriteria <span className="required">*</span></label>
                  <input
                    className="form-input"
                    required
                    value={kriteriaForm.nama}
                    onChange={(e) => setKriteriaForm({ ...kriteriaForm, nama: e.target.value })}
                    placeholder="Contoh: Tata Pamong, Tata Kelola & Kerjasama"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi Lingkup Kriteria</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={kriteriaForm.deskripsi}
                    onChange={(e) => setKriteriaForm({ ...kriteriaForm, deskripsi: e.target.value })}
                    placeholder="Penjelasan ringkas cakupan materi penilaian pada kriteria ini..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status Kriteria</label>
                  <select
                    className="form-select"
                    value={kriteriaForm.statusAktif ? 'true' : 'false'}
                    onChange={(e) => setKriteriaForm({ ...kriteriaForm, statusAktif: e.target.value === 'true' })}
                  >
                    <option value="true">Aktif (Ditampilkan dalam instrumen)</option>
                    <option value="false">Non-Aktif (Disembunyikan)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setKriteriaModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                  {saving ? 'Menyimpan...' : 'Simpan Kriteria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: TABEL LKPS & KETENTUAN ─────────────────────────────────── */}
      {tabelModalOpen && (
        <div className="modal-overlay" onClick={() => setTabelModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconBadge color="emerald" size="sm">
                  <TableProperties size={16} />
                </IconBadge>
                <div className="modal-title">
                  {tabelForm.id ? 'Edit Tabel & Ketentuan LKPS' : 'Tambah Tabel & Ketentuan Baru'}
                </div>
              </div>
              <button onClick={() => setTabelModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lkps-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTabel}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {/* Bagian 1: Identitas Tabel */}
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--lkps-text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TableProperties size={15} style={{ color: 'var(--lkps-accent-blue)' }} />
                  <span>1. Identitas & Penanggung Jawab Tabel</span>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: '0 0 130px' }}>
                    <label className="form-label">Nomor Tabel <span className="required">*</span></label>
                    <input
                      className="form-input"
                      required
                      value={tabelForm.nomorTabel}
                      onChange={(e) => setTabelForm({ ...tabelForm, nomorTabel: e.target.value })}
                      placeholder="Tabel 1.1 / 2.a"
                    />
                  </div>

                  <div className="form-group" style={{ flex: '0 0 110px' }}>
                    <label className="form-label">Sheet Ref LKPS</label>
                    <input
                      className="form-input"
                      value={tabelForm.sheetRef}
                      onChange={(e) => setTabelForm({ ...tabelForm, sheetRef: e.target.value })}
                      placeholder="1-1, 2a1, 3a1"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Penanggung Jawab Pengisi <span className="required">*</span></label>
                    <select
                      className="form-select"
                      value={tabelForm.levelPengisi}
                      onChange={(e) => setTabelForm({ ...tabelForm, levelPengisi: e.target.value })}
                    >
                      <option value="PRODI">Operator Program Studi (Mikro)</option>
                      <option value="UPPS">Admin UPPS (Fakultas / Makro)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Tabel LKPS <span className="required">*</span></label>
                  <input
                    className="form-input"
                    required
                    value={tabelForm.namaTabel}
                    onChange={(e) => setTabelForm({ ...tabelForm, namaTabel: e.target.value })}
                    placeholder="Contoh: Kerjasama Bidang Pendidikan"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi & Petunjuk Pengisian Data</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={tabelForm.deskripsi}
                    onChange={(e) => setTabelForm({ ...tabelForm, deskripsi: e.target.value })}
                    placeholder="Instruksi dan cakupan data yang harus diisikan pada tabel ini..."
                  />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--lkps-border-color)', margin: '16px 0' }} />

                {/* Bagian 2: Ketentuan & Validasi */}
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--lkps-text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={15} style={{ color: 'var(--lkps-accent-purple)' }} />
                  <span>2. Ketentuan Sasaran & Konvensi Waktu</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Target Jenjang Pendidikan</label>
                    <select
                      className="form-select"
                      value={tabelForm.targetJenjang}
                      onChange={(e) => setTabelForm({ ...tabelForm, targetJenjang: e.target.value })}
                    >
                      <option value="Semua Jenjang">Semua Jenjang (D3, D4, S1, S2, S3)</option>
                      <option value="Diploma 3 (D3)">Diploma 3 (D3)</option>
                      <option value="Sarjana Terapan (D4)">Sarjana Terapan (D4)</option>
                      <option value="Sarjana Teknik (S1)">Sarjana Teknik (S1)</option>
                      <option value="Sarjana & Sarjana Terapan">Sarjana & Sarjana Terapan</option>
                      <option value="Magister (S2) & Doktor (S3)">Magister (S2) & Doktor (S3)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Konvensi Waktu (Cohort Year)</label>
                    <select
                      className="form-select"
                      value={tabelForm.konvensiWaktu}
                      onChange={(e) => setTabelForm({ ...tabelForm, konvensiWaktu: e.target.value })}
                    >
                      <option value="TS">TS (Tahun Saat Pengajuan)</option>
                      <option value="TS-1 s.d. TS">TS-1 s.d. TS (2 Tahun)</option>
                      <option value="TS-2 s.d. TS">TS-2 s.d. TS (3 Tahun Terakhir)</option>
                      <option value="TS-4 s.d. TS">TS-4 s.d. TS (5 Tahun Terakhir)</option>
                      <option value="TS-6 s.d. TS">TS-6 s.d. TS (Kohor Kelulusan 7 Tahun)</option>
                      <option value="Dokumen Aktif Berlaku">Dokumen Aktif Berlaku</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: '0 0 160px' }}>
                    <label className="form-label">Upload Bukti PDF</label>
                    <select
                      className="form-select"
                      value={tabelForm.wajibUploadBukti ? 'true' : 'false'}
                      onChange={(e) => setTabelForm({ ...tabelForm, wajibUploadBukti: e.target.value === 'true' })}
                    >
                      <option value="true">Wajib Upload PDF</option>
                      <option value="false">Opsional (Jika Ada)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status Tabel</label>
                    <select
                      className="form-select"
                      value={tabelForm.statusAktif ? 'true' : 'false'}
                      onChange={(e) => setTabelForm({ ...tabelForm, statusAktif: e.target.value === 'true' })}
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Non-Aktif (Arsip)</option>
                    </select>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--lkps-border-color)', margin: '16px 0' }} />

                {/* Bagian 3: Ketentuan Kolom, Bukti & Rumus */}
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--lkps-text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calculator size={15} style={{ color: 'var(--lkps-accent-emerald)' }} />
                  <span>3. Ketentuan Kolom, Bukti Dokumen & Rumus Penilaian</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Daftar Kolom / Field Data Utama</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={tabelForm.kolomInput}
                    onChange={(e) => setTabelForm({ ...tabelForm, kolomInput: e.target.value })}
                    placeholder="Contoh: Lembaga Mitra, Tingkat, Judul Kegiatan, Manfaat bagi PS, Waktu, Bukti Kerjasama (pisahkan dengan koma)"
                  />
                  <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginTop: '4px' }}>
                    Tuliskan atribut kolom yang harus dilaporkan, pisahkan dengan tanda koma (,) atau baris baru.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ketentuan Dokumen Bukti Sahih yang Disyaratkan</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={tabelForm.dokumenBukti}
                    onChange={(e) => setTabelForm({ ...tabelForm, dokumenBukti: e.target.value })}
                    placeholder="Contoh: Dokumen MoU / MoA bertanda tangan pimpinan, SK Dekan, Sertifikat Akreditasi..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ketentuan Rumus / Indikator Penilaian LAM Teknik</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={tabelForm.rumusPenilaian}
                    onChange={(e) => setTabelForm({ ...tabelForm, rumusPenilaian: e.target.value })}
                    placeholder="Contoh: Rasio Kerjasama (RK) = (2×N1 + 1×N2 + 3×N3) / NDTPS. Skor maksimal 4 jika RK ≥ 1.0"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setTabelModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                  {saving ? 'Menyimpan...' : 'Simpan Tabel & Ketentuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: DETAIL KETENTUAN DRAWER / POPUP ──────────────────────────── */}
      {ketentuanModalOpen && selectedKetentuanTabel && (
        <div className="modal-overlay" onClick={() => setKetentuanModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconBadge color="blue" size="sm">
                  <BookOpen size={16} />
                </IconBadge>
                <div>
                  <div className="modal-title">
                    Ketentuan: {selectedKetentuanTabel.tabel.nomorTabel}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)' }}>
                    {selectedKetentuanTabel.kriteriaKode} – {selectedKetentuanTabel.kriteriaNama}
                  </div>
                </div>
              </div>
              <button onClick={() => setKetentuanModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lkps-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--lkps-text-primary)', marginBottom: '4px' }}>
                  {selectedKetentuanTabel.tabel.namaTabel}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)', lineHeight: 1.5 }}>
                  {selectedKetentuanTabel.tabel.deskripsi || 'Tidak ada deskripsi khusus.'}
                </p>
              </div>

              <div className="grid-2" style={{ gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--lkps-bg-secondary)', padding: '12px', borderRadius: 'var(--lkps-radius-md)', border: '1px solid var(--lkps-border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginBottom: '2px' }}>Penanggung Jawab</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--lkps-accent-blue)' }}>
                    {selectedKetentuanTabel.tabel.levelPengisi === 'UPPS' ? 'Admin UPPS (Fakultas)' : 'Operator Program Studi'}
                  </div>
                </div>

                <div style={{ background: 'var(--lkps-bg-secondary)', padding: '12px', borderRadius: 'var(--lkps-radius-md)', border: '1px solid var(--lkps-border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginBottom: '2px' }}>Target Jenjang</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--lkps-accent-emerald)' }}>
                    {selectedKetentuanTabel.ketentuan.targetJenjang || 'Semua Jenjang'}
                  </div>
                </div>

                <div style={{ background: 'var(--lkps-bg-secondary)', padding: '12px', borderRadius: 'var(--lkps-radius-md)', border: '1px solid var(--lkps-border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginBottom: '2px' }}>Konvensi Waktu</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--lkps-text-primary)' }}>
                    {selectedKetentuanTabel.ketentuan.konvensiWaktu || 'TS-2 s.d. TS'}
                  </div>
                </div>

                <div style={{ background: 'var(--lkps-bg-secondary)', padding: '12px', borderRadius: 'var(--lkps-radius-md)', border: '1px solid var(--lkps-border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginBottom: '2px' }}>Kewajiban Bukti Sahih</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: selectedKetentuanTabel.tabel.wajibUploadBukti ? 'var(--lkps-accent-amber)' : 'var(--lkps-text-secondary)' }}>
                    {selectedKetentuanTabel.tabel.wajibUploadBukti ? 'Wajib PDF Asli' : 'Opsional'}
                  </div>
                </div>
              </div>

              {/* Kolom-kolom Input */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--lkps-text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TableProperties size={14} style={{ color: 'var(--lkps-accent-blue)' }} />
                  <span>Daftar Kolom & Field yang Wajib Dilaporkan:</span>
                </div>
                {Array.isArray(selectedKetentuanTabel.ketentuan.kolom) ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedKetentuanTabel.ketentuan.kolom.map((col, idx) => (
                      <span key={idx} className="badge badge-secondary" style={{ fontSize: '12px', padding: '5px 10px' }}>
                        {idx + 1}. {col}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)' }}>
                    {selectedKetentuanTabel.ketentuan.kolom || 'Format standar tabel LKPS.'}
                  </p>
                )}
              </div>

              {/* Dokumen Bukti */}
              {selectedKetentuanTabel.ketentuan.dokumenBukti && (
                <div style={{ marginBottom: '16px', background: 'rgba(238, 174, 33, 0.06)', padding: '12px 14px', borderRadius: 'var(--lkps-radius-md)', border: '1px solid rgba(238, 174, 33, 0.25)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--lkps-accent-amber)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck size={14} />
                    <span>Ketentuan Dokumen Bukti Sahih:</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--lkps-text-primary)', lineHeight: 1.5 }}>
                    {selectedKetentuanTabel.ketentuan.dokumenBukti}
                  </div>
                </div>
              )}

              {/* Rumus Penilaian */}
              {selectedKetentuanTabel.ketentuan.rumusPenilaian && (
                <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '12px 14px', borderRadius: 'var(--lkps-radius-md)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--lkps-accent-emerald)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calculator size={14} />
                    <span>Ketentuan Rumus / Indikator Penilaian LAM Teknik:</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--lkps-text-primary)', lineHeight: 1.5, fontFamily: 'monospace' }}>
                    {selectedKetentuanTabel.ketentuan.rumusPenilaian}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setKetentuanModalOpen(false)
                  const targetKriteria = currentRegulasi.kriteriaList.find((k) =>
                    k.tabelList.some((t) => t.id === selectedKetentuanTabel.tabel.id)
                  )
                  if (targetKriteria) {
                    handleOpenEditTabel(selectedKetentuanTabel.tabel, targetKriteria.id)
                  }
                }}
              >
                <Edit2 size={13} />
                <span>Ubah Ketentuan Tabel Ini</span>
              </button>
              <button className="btn btn-primary" onClick={() => setKetentuanModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: KONFIRMASI MUAT TEMPLATE BAKU LAM TEKNIK ─────────────────── */}
      {templateModalOpen && (
        <div className="modal-overlay" onClick={() => setTemplateModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconBadge color="amber" size="sm">
                  <Sparkles size={16} />
                </IconBadge>
                <div className="modal-title">
                  Terapkan Template Baku LAM Teknik
                </div>
              </div>
              <button onClick={() => setTemplateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lkps-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                Fitur ini akan memuat seluruh struktur <strong>9 Kriteria Akreditasi</strong> dan seluruh <strong>tabel LKPS baku LAM Teknik</strong> (sesuai Panduan & Instrumen Akreditasi Vokasi/Akademik) lengkap dengan penanggung jawab UPPS/Prodi, target jenjang, konvensi waktu kohor, dokumen bukti, dan rumus penilaian.
              </p>

              <div style={{ background: 'var(--lkps-bg-secondary)', padding: '14px', borderRadius: 'var(--lkps-radius-md)', border: '1px solid var(--lkps-border-color)', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--lkps-text-primary)', marginBottom: '8px' }}>
                  Regulasi Target:
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--lkps-accent-blue)' }}>
                  {currentRegulasi?.nama} ({currentRegulasi?.tahunAkademik})
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={replaceExistingTemplate}
                    onChange={(e) => setReplaceExistingTemplate(e.target.checked)}
                  />
                  <span>Gantikan seluruh kriteria yang ada saat ini pada regulasi target</span>
                </label>
                <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginLeft: '22px' }}>
                  Centang untuk me-reset struktur ke template resmi bersih.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setTemplateModalOpen(false)}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleLoadTemplateLAMTeknik}
                disabled={saving}
              >
                {saving ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
                {saving ? 'Memuat Template...' : 'Terapkan Template Baku'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: KONFIRMASI HAPUS ────────────────────────────────────────── */}
      {deleteConfirmModal.open && (
        <div
          className="modal-overlay"
          onClick={() => !saving && setDeleteConfirmModal((prev) => ({ ...prev, open: false }))}
        >
          <div className="modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconBadge color="rose" size="md">
                  <Trash2 size={18} />
                </IconBadge>
                <h3 className="modal-title">
                  Hapus {deleteConfirmModal.type === 'kriteria' ? 'Kriteria' : 'Tabel'}
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px' }}
                onClick={() => !saving && setDeleteConfirmModal((prev) => ({ ...prev, open: false }))}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--lkps-text-secondary)',
                  marginBottom: '14px',
                  lineHeight: 1.5,
                }}
              >
                Apakah Anda yakin ingin menghapus data berikut secara permanen?
              </p>
              <div
                style={{
                  background: 'rgba(244,63,94,0.08)',
                  border: '1px solid rgba(244,63,94,0.25)',
                  borderRadius: 'var(--lkps-radius-md)',
                  padding: '12px 14px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--lkps-accent-rose)', fontSize: '14px' }}>
                  {deleteConfirmModal.name}
                </div>
                {deleteConfirmModal.subText && (
                  <div style={{ fontSize: '12px', color: 'var(--lkps-text-muted)', marginTop: '4px' }}>
                    {deleteConfirmModal.subText}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--lkps-text-muted)' }}>
                Tindakan ini tidak dapat dibatalkan.
              </div>
            </div>

            <div
              className="modal-footer"
              style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => setDeleteConfirmModal((prev) => ({ ...prev, open: false }))}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--lkps-accent-rose)', borderColor: 'var(--lkps-accent-rose)' }}
                disabled={saving}
                onClick={handleExecuteDelete}
              >
                {saving ? (
                  <>
                    <Loader2 className="spin" size={14} /> Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Ya, Hapus Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
