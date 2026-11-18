"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/kriteria/[id]/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useInfoLkps } from "@/modules/lkps/komponen/bersama/konteks"
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import {
  Layers,
  ArrowLeft,
  TableProperties,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  FileCheck,
  Building,
  GraduationCap,
  Calendar,
  ExternalLink,
  SlidersHorizontal,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react'

interface ParsedKetentuan {
  sheetRef?: string
  targetJenjang?: string
  konvensiWaktu?: string
  kolom?: string[] | string
  dokumenBukti?: string
  rumusPenilaian?: string
  rows?: any[]
  buktiList?: any[]
}

interface TabelConfigItem {
  id: string
  nomorTabel: string
  namaTabel: string
  deskripsi: string | null
  levelPengisi: string
  wajibUploadBukti: boolean
  formatKolom: string | null
  statusAktif: boolean
}

interface KriteriaDetail {
  id: string
  nomorUrut: number
  kode: string
  nama: string
  deskripsi: string | null
  levelWewenang: string
  statusAktif: boolean
  regulasi?: {
    id: string
    nama: string
    tahunAkademik: string
  }
  tabelList: TabelConfigItem[]
}

export default function HalamanKriteria({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const kriteriaId = resolvedParams.id

  const { peran } = useInfoLkps()
  // Akses ubah struktur kriteria (Admin UPPS / Fakultas)
  const canManageStructure = peran === 'ADMIN'
  // Akses isi & simpan baris data kriteria (Khusus Operator Prodi)
  const canEditData = peran === 'TIM_PRODI'

  const [kriteria, setKriteria] = useState<KriteriaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingTableId, setSavingTableId] = useState<string | null>(null)
  const [saveSuccessTableId, setSaveSuccessTableId] = useState<string | null>(null)

  // State data rows per table: { [tabelId]: Array<any> }
  const [tableData, setTableData] = useState<Record<string, any[]>>({})

  useEffect(() => {
    fetchKriteria()
  }, [kriteriaId])

  async function fetchKriteria() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/lkps/kriteria/${kriteriaId}`)
      if (res.ok) {
        const data: KriteriaDetail = await res.json()
        setKriteria(data)

        // Initialize table data
        const initialRows: Record<string, any[]> = {}
        data.tabelList?.forEach((t) => {
          const parsed = parseKetentuan(t.formatKolom)
          if (parsed.rows && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
            initialRows[t.id] = parsed.rows
          } else {
            // Default placeholder row
            initialRows[t.id] = [
              {
                id: 'row_1',
                namaKegiatan: '',
                kategori: '',
                tahun: data.regulasi?.tahunAkademik || '2024/2025',
                buktiDokumen: '',
                keterangan: '',
              },
            ]
          }
        })
        setTableData(initialRows)
      } else {
        const err = await res.json()
        setError(err.pesan || 'Gagal memuat detail kriteria')
      }
    } catch {
      setError('Terjadi kendala koneksi saat memuat kriteria')
    } finally {
      setLoading(false)
    }
  }

  function parseKetentuan(formatKolom: string | null): ParsedKetentuan {
    if (!formatKolom) return {}
    try {
      return JSON.parse(formatKolom)
    } catch {
      return { kolom: formatKolom }
    }
  }

  function handleAddRow(tabelId: string) {
    setTableData((prev) => {
      const current = prev[tabelId] || []
      const newRow = {
        id: `row_${Date.now()}`,
        namaKegiatan: '',
        kategori: '',
        tahun: kriteria?.regulasi?.tahunAkademik || '2024/2025',
        buktiDokumen: '',
        keterangan: '',
      }
      return {
        ...prev,
        [tabelId]: [...current, newRow],
      }
    })
  }

  function handleRemoveRow(tabelId: string, rowIndex: number) {
    setTableData((prev) => {
      const current = [...(prev[tabelId] || [])]
      current.splice(rowIndex, 1)
      return {
        ...prev,
        [tabelId]: current,
      }
    })
  }

  function handleCellChange(tabelId: string, rowIndex: number, field: string, value: any) {
    setTableData((prev) => {
      const current = [...(prev[tabelId] || [])]
      current[rowIndex] = {
        ...current[rowIndex],
        [field]: value,
      }
      return {
        ...prev,
        [tabelId]: current,
      }
    })
  }

  async function handleSaveTable(tabelId: string) {
    setSavingTableId(tabelId)
    setSaveSuccessTableId(null)
    setError('')
    try {
      const rows = tableData[tabelId] || []
      const res = await fetch(`/api/lkps/kriteria/${kriteriaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveTableRows',
          payload: {
            tabelId,
            rows,
          },
        }),
      })

      if (res.ok) {
        setSaveSuccessTableId(tabelId)
        setTimeout(() => setSaveSuccessTableId(null), 3000)
      } else {
        const data = await res.json()
        setError(data.pesan || 'Gagal menyimpan data tabel')
      }
    } catch {
      setError('Terjadi kendala koneksi saat menyimpan data')
    } finally {
      setSavingTableId(null)
    }
  }

  if (loading) {
    return (
      <>
        <JudulHalaman judul="Memuat Kriteria..." />
        <div className="page-content animate-fade-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Loader2 className="spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--lkps-accent-blue)' }} />
          <div style={{ color: 'var(--lkps-text-secondary)' }}>Mengambil data kriteria dan tabel LKPS...</div>
        </div>
      </>
    )
  }

  if (error || !kriteria) {
    return (
      <>
        <JudulHalaman judul="Kriteria Tidak Ditemukan" />
        <div className="page-content animate-fade-in">
          <div className="card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '40px 24px' }}>
            <AlertCircle size={40} style={{ color: 'var(--lkps-accent-rose)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              {error || 'Data kriteria tidak tersedia atau telah dihapus'}
            </h3>
            <p style={{ color: 'var(--lkps-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Pastikan ID kriteria yang Anda tuju valid dan terdaftar dalam regulasi aktif.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Link href="/dashboard" className="btn btn-secondary">
                <ArrowLeft size={15} /> Kembali ke Dashboard
              </Link>
              {canManageStructure && (
                <Link href="/konfigurasi" className="btn btn-primary">
                  <SlidersHorizontal size={15} /> Konfigurasi Regulasi
                </Link>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  const wewenangBadge =
    kriteria.levelWewenang === 'UPPS'
      ? 'badge-blue'
      : kriteria.levelWewenang === 'PRODI'
      ? 'badge-emerald'
      : 'badge-purple'

  return (
    <>
      <JudulHalaman
        judul={`${kriteria.kode}: ${kriteria.nama}`}
        deskripsi={`Instrumen Akreditasi: ${kriteria.regulasi?.nama || 'LAM Teknik 2024'}`}
      />

      <div className="page-content animate-fade-in">
        {/* Navigation & Action Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
              <ArrowLeft size={15} />
              <span>Dashboard</span>
            </Link>
            <span style={{ color: 'var(--lkps-border-color)' }}>/</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--lkps-text-primary)' }}>
              {kriteria.kode}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {canManageStructure && (
              <Link href="/konfigurasi" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                <SlidersHorizontal size={14} />
                <span>Atur Struktur di Konfigurasi</span>
              </Link>
            )}
          </div>
        </div>

        {/* Hero / Overview Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(79,142,247,0.08) 100%)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 'var(--lkps-radius-xl)',
            padding: '24px 28px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-purple" style={{ fontWeight: 800, fontSize: '13px', padding: '4px 10px' }}>
                {kriteria.kode}
              </span>
              <span className={`badge ${wewenangBadge}`} style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                Wewenang: {kriteria.levelWewenang}
              </span>
              <span className="badge badge-secondary" style={{ fontSize: '12px' }}>
                {kriteria.tabelList?.length || 0} Tabel Instrumen
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                Kriteria Kustom Aktif
              </span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--lkps-text-primary)', marginBottom: '6px' }}>
              {kriteria.nama}
            </h1>
            <p style={{ color: 'var(--lkps-text-secondary)', fontSize: '13.5px', maxWidth: '750px', lineHeight: 1.5 }}>
              {kriteria.deskripsi ||
                'Kriteria akreditasi tambahan yang dikonfigurasi secara dinamis untuk mendukung kelengkapan instrumen evaluasi diri dan LKPS LAM Teknik.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
            <div
              className="card"
              style={{
                padding: '12px 18px',
                textAlign: 'center',
                background: 'var(--lkps-bg-secondary)',
                border: '1px solid var(--lkps-border-color)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)', marginBottom: '2px' }}>Tahun Akademik</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--lkps-text-primary)' }}>
                {kriteria.regulasi?.tahunAkademik || '2024/2025'}
              </div>
            </div>
          </div>
        </div>

        {/* List of Tables */}
        {kriteria.tabelList?.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
            <TableProperties size={36} style={{ color: 'var(--lkps-text-muted)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Belum Ada Tabel di Bawah {kriteria.kode}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)', marginBottom: '16px' }}>
              Super Admin atau Admin UPPS dapat menambahkan tabel instrumen melalui halaman konfigurasi.
            </p>
            {canManageStructure && (
              <Link href="/konfigurasi" className="btn btn-primary btn-sm" style={{ display: 'inline-flex' }}>
                <Plus size={14} /> Tambahkan Tabel Sekarang
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {kriteria.tabelList.map((tabel) => {
              const parsed = parseKetentuan(tabel.formatKolom)
              const rows = tableData[tabel.id] || []
              const isSaving = savingTableId === tabel.id
              const isSaved = saveSuccessTableId === tabel.id

              return (
                <div key={tabel.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                  {/* Table Header */}
                  <div
                    style={{
                      padding: '18px 22px',
                      background: 'var(--lkps-bg-secondary)',
                      borderBottom: '1px solid var(--lkps-border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className="badge badge-purple" style={{ fontWeight: 700 }}>
                          Tabel {tabel.nomorTabel}
                        </span>
                        <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                          Pengisi: {tabel.levelPengisi}
                        </span>
                        {tabel.wajibUploadBukti && (
                          <span className="badge badge-amber" style={{ fontSize: '11px' }}>
                            Wajib Bukti PDF
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--lkps-text-primary)' }}>
                        {tabel.namaTabel}
                      </div>
                      {tabel.deskripsi && (
                        <div style={{ fontSize: '12.5px', color: 'var(--lkps-text-secondary)', marginTop: '2px' }}>
                          {tabel.deskripsi}
                        </div>
                      )}
                    </div>

                    {canEditData && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSaveTable(tabel.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="spin" size={14} /> Menyimpan...
                            </>
                          ) : isSaved ? (
                            <>
                              <CheckCircle2 size={14} style={{ color: '#fff' }} /> Tersimpan!
                            </>
                          ) : (
                            <>
                              <Save size={14} /> Simpan Data
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ketentuan Banner */}
                  {(parsed.sheetRef || parsed.targetJenjang || parsed.konvensiWaktu || parsed.dokumenBukti) && (
                    <div
                      style={{
                        padding: '12px 22px',
                        background: 'rgba(79,142,247,0.04)',
                        borderBottom: '1px solid var(--lkps-border-color)',
                        display: 'flex',
                        gap: '24px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--lkps-accent-blue)', fontWeight: 600 }}>
                        <Info size={14} /> Ketentuan Instrumen:
                      </div>
                      {parsed.sheetRef && (
                        <div>
                          <span style={{ color: 'var(--lkps-text-muted)' }}>Sheet Ref:</span>{' '}
                          <strong style={{ color: 'var(--lkps-text-primary)' }}>{parsed.sheetRef}</strong>
                        </div>
                      )}
                      {parsed.targetJenjang && (
                        <div>
                          <span style={{ color: 'var(--lkps-text-muted)' }}>Target Jenjang:</span>{' '}
                          <strong style={{ color: 'var(--lkps-text-primary)' }}>{parsed.targetJenjang}</strong>
                        </div>
                      )}
                      {parsed.konvensiWaktu && (
                        <div>
                          <span style={{ color: 'var(--lkps-text-muted)' }}>Konvensi Waktu:</span>{' '}
                          <strong style={{ color: 'var(--lkps-text-primary)' }}>{parsed.konvensiWaktu}</strong>
                        </div>
                      )}
                      {parsed.dokumenBukti && (
                        <div>
                          <span style={{ color: 'var(--lkps-text-muted)' }}>Dokumen Bukti:</span>{' '}
                          <strong style={{ color: 'var(--lkps-text-primary)' }}>{parsed.dokumenBukti}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interactive Table Grid */}
                  <div style={{ padding: '20px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--lkps-text-secondary)' }}>
                        Isian Baris Data ({rows.length} Baris)
                      </div>
                      {canEditData && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                          onClick={() => handleAddRow(tabel.id)}
                        >
                          <Plus size={13} /> Tambah Baris
                        </button>
                      )}
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '45px', textAlign: 'center' }}>No</th>
                            <th style={{ minWidth: '220px' }}>Judul / Nama Entitas</th>
                            <th style={{ minWidth: '150px' }}>Kategori / Jenis</th>
                            <th style={{ minWidth: '110px' }}>Tahun / Periode</th>
                            <th style={{ minWidth: '200px' }}>URL Bukti / Dokumen</th>
                            <th style={{ minWidth: '180px' }}>Keterangan / Catatan</th>
                            <th style={{ width: '50px', textAlign: 'center' }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, idx) => (
                            <tr key={row.id || idx}>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--lkps-text-muted)' }}>
                                {idx + 1}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '6px 8px', fontSize: '12.5px', width: '100%' }}
                                  placeholder="Contoh: Proposal Riset AI Keteknikan"
                                  value={row.namaKegiatan || ''}
                                  onChange={(e) => handleCellChange(tabel.id, idx, 'namaKegiatan', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '6px 8px', fontSize: '12.5px', width: '100%' }}
                                  placeholder="Kategori / Jenis"
                                  value={row.kategori || ''}
                                  onChange={(e) => handleCellChange(tabel.id, idx, 'kategori', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '6px 8px', fontSize: '12.5px', width: '100%' }}
                                  placeholder="TS / 2024"
                                  value={row.tahun || ''}
                                  onChange={(e) => handleCellChange(tabel.id, idx, 'tahun', e.target.value)}
                                />
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="text"
                                    className="form-input"
                                    style={{ padding: '6px 8px', fontSize: '12.5px', width: '100%' }}
                                    placeholder="https://drive.google.com/..."
                                    value={row.buktiDokumen || ''}
                                    onChange={(e) => handleCellChange(tabel.id, idx, 'buktiDokumen', e.target.value)}
                                  />
                                  {row.buktiDokumen && (
                                    <a
                                      href={row.buktiDokumen}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-ghost btn-sm"
                                      style={{ padding: '6px' }}
                                      title="Buka Link Dokumen"
                                    >
                                      <ExternalLink size={13} />
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '6px 8px', fontSize: '12.5px', width: '100%' }}
                                  placeholder="Catatan tambahan..."
                                  value={row.keterangan || ''}
                                  onChange={(e) => handleCellChange(tabel.id, idx, 'keterangan', e.target.value)}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '6px', color: 'var(--lkps-accent-rose)' }}
                                  title="Hapus Baris"
                                  onClick={() => handleRemoveRow(tabel.id, idx)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveTable(tabel.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="spin" size={14} /> Menyimpan...
                          </>
                        ) : isSaved ? (
                          <>
                            <CheckCircle2 size={14} /> Perubahan Tersimpan
                          </>
                        ) : (
                          <>
                            <Save size={14} /> Simpan Tabel Ini
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
