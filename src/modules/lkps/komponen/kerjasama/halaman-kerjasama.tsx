"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react/no-unescaped-entities -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/kerjasama/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim"
import { useState, useEffect } from 'react'
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran"
import {
  Zap,
  Plus,
  Handshake,
  FileText,
  Edit3,
  Trash2,
  UploadCloud,
  Check,
  X,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────

interface KerjasamaRow {
  id: string
  namaLembaga: string
  tingkat: string
  judulKegiatan: string
  manfaat: string
  tanggalMulai: string
  tanggalAkhir: string
  jenisKerjasama: string // N1, N2, N3
  fileMou: string | null
  fileName: string | null
}

// ─── Formula ──────────────────────────────────────────────────

function hitungRK(rows: KerjasamaRow[], ndtps: number): number {
  if (ndtps === 0) return 0
  const n1 = rows.filter(r => r.jenisKerjasama === 'N1').length
  const n2 = rows.filter(r => r.jenisKerjasama === 'N2').length
  const n3 = rows.filter(r => r.jenisKerjasama === 'N3').length
  return (2 * n1 + 1 * n2 + 3 * n3) / ndtps
}

function getSkorRK(rk: number): { skor: number; label: string; cls: string } {
  if (rk >= 3) return { skor: 4, label: 'Sangat Baik', cls: 'score-excellent' }
  if (rk >= 2) return { skor: 3, label: 'Baik', cls: 'score-good' }
  if (rk >= 1) return { skor: 2, label: 'Cukup', cls: 'score-average' }
  return { skor: 1, label: 'Kurang', cls: 'score-poor' }
}

const tingkatColors: Record<string, { bg: string; text: string }> = {
  Internasional: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa' },
  Nasional: { bg: 'rgba(79,142,247,0.12)', text: '#60a5fa' },
  'Wilayah/Lokal': { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
}

const jenisLabels: Record<string, string> = {
  N1: 'Pendidikan',
  N2: 'Penelitian',
  N3: 'PkM',
}

const jenisColors: Record<string, { bg: string; text: string }> = {
  N1: { bg: 'rgba(79,142,247,0.12)', text: '#60a5fa' },
  N2: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa' },
  N3: { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
}

// ─── Component ────────────────────────────────────────────────

export default function HalamanKerjasama() {
  const { canEdit } = useModulePermission('kerjasama')
  const [rows, setRows] = useState<KerjasamaRow[]>([])
  const [ndtps, setNdtps] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [editingRow, setEditingRow] = useState<KerjasamaRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingPdf, setUploadingPdf] = useState(false)

  async function fetchData() {
    try {
      const res = await kirimLkps('/api/lkps/kerjasama')
      if (res.ok) {
        const data = await res.json()
        const formatted = data.map((d: any) => ({
          id: d.id,
          namaLembaga: d.namaLembaga,
          tingkat: d.tingkat,
          judulKegiatan: d.judulKegiatan,
          manfaat: d.manfaat || '',
          tanggalMulai: d.tanggalMulai ? d.tanggalMulai.split('T')[0] : '',
          tanggalAkhir: d.tanggalAkhir ? d.tanggalAkhir.split('T')[0] : '',
          jenisKerjasama: d.jenisKerjasama,
          fileMou: d.fileMou || null,
          fileName: d.fileMou ? d.fileMou.split('/').pop() : null,
        }))
        setRows(formatted)
      }
    } catch (err) {
      console.error('Failed to fetch kerjasama data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const blankRow = (): KerjasamaRow => ({
    id: Date.now().toString(),
    namaLembaga: '',
    tingkat: 'Nasional',
    judulKegiatan: '',
    manfaat: '',
    tanggalMulai: '',
    tanggalAkhir: '',
    jenisKerjasama: 'N1',
    fileMou: null,
    fileName: null,
  })

  const rk = hitungRK(rows, ndtps)
  const { skor, label, cls } = getSkorRK(rk)

  const n1Count = rows.filter(r => r.jenisKerjasama === 'N1').length
  const n2Count = rows.filter(r => r.jenisKerjasama === 'N2').length
  const n3Count = rows.filter(r => r.jenisKerjasama === 'N3').length
  const intCount = rows.filter(r => r.tingkat === 'Internasional').length
  const natCount = rows.filter(r => r.tingkat === 'Nasional').length
  const lokCount = rows.filter(r => r.tingkat === 'Wilayah/Lokal').length

  function openAdd() {
    setEditingRow(blankRow())
    setShowModal(true)
  }

  function openEdit(row: KerjasamaRow) {
    setEditingRow({ ...row })
    setShowModal(true)
  }

  async function handleSaveRow() {
    if (!editingRow) return
    const newRows = (() => {
      const exists = rows.find(r => r.id === editingRow.id)
      if (exists) return rows.map(r => r.id === editingRow.id ? editingRow : r)
      return [...rows, editingRow]
    })()
    setRows(newRows)
    setShowModal(false)
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/kerjasama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: newRows }),
      })
      if (res.ok) {
        await fetchData()
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRow(id: string) {
    if (!confirm('Hapus data kerjasama ini?')) return
    const newRows = rows.filter(r => r.id !== id)
    setRows(newRows)
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/kerjasama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: newRows }),
      })
      if (res.ok) {
        await fetchData()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAll() {
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/kerjasama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      if (res.ok) {
        await fetchData()
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <JudulHalaman judul="Kriteria 1: Tata Pamong & Kerjasama" />
      <div className="page-content animate-fade-in">

        <div style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Tata Pamong, Tata Kelola & Kerjasama</h2>
          <p className="section-subtitle">
            Tabel 1 LKPS – Data kerjasama institusional. Sistem otomatis menghitung Rasio Kerjasama (RK).
          </p>
        </div>

        <RoleNotice module="kerjasama" />

        {/* Formula Card */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(79,142,247,0.05)', borderColor: 'rgba(79,142,247,0.15)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconBadge color="amber" size="sm">
                <Zap size={18} strokeWidth={2} />
              </IconBadge>
              <div>
                <div className="card-title">Kalkulasi Rasio Kerjasama (RK) – Real-time</div>
                <div className="card-subtitle">Formula sesuai Matriks Penilaian LAM Teknik Diploma III</div>
              </div>
            </div>
            <div className={`score-display ${cls}`}>
              Skor: {skor}/4 – {label}
            </div>
          </div>

          <div className="formula-display">
            RK = (2 × N1 + 1 × N2 + 3 × N3) / NDTPS = (2×{n1Count} + 1×{n2Count} + 3×{n3Count}) / {ndtps} = <strong>{rk.toFixed(3)}</strong>
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { label: `N1 Pendidikan`, value: n1Count, color: '#60a5fa' },
                { label: `N2 Penelitian`, value: n2Count, color: '#a78bfa' },
                { label: `N3 PkM`, value: n3Count, color: '#34d399' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ height: '40px', width: '1px', background: 'var(--lkps-border-color)' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { label: 'Internasional', value: intCount, color: '#a78bfa' },
                { label: 'Nasional', value: natCount, color: '#60a5fa' },
                { label: 'Lokal', value: lokCount, color: '#34d399' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)' }}>Jumlah DTPS:</span>
              <input
                type="number"
                min="1"
                disabled={!canEdit}
                value={ndtps}
                onChange={e => setNdtps(parseInt(e.target.value) || 1)}
                style={{
                  width: '70px', background: 'var(--lkps-bg-primary)', border: '1px solid var(--lkps-border-color)',
                  borderRadius: 'var(--lkps-radius-sm)', color: 'var(--lkps-text-primary)', padding: '6px 10px',
                  fontSize: '14px', fontWeight: 600, textAlign: 'center',
                }}
              />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconBadge color="blue" size="md">
                <Handshake size={20} strokeWidth={1.75} />
              </IconBadge>
              <div>
                <div className="card-title">Data Kerjasama (Tabel 1 LKPS)</div>
                <div className="card-subtitle">Total: {rows.length} data kerjasama</div>
              </div>
            </div>
            {canEdit && (
              <button id="btn-add-kerjasama" className="btn btn-primary" onClick={openAdd}>
                <Plus size={16} strokeWidth={2} />
                Tambah Kerjasama
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="empty-state">
              <IconBadge color="blue" size="lg" style={{ marginBottom: '16px' }}>
                <Handshake size={28} strokeWidth={1.5} />
              </IconBadge>
              <div className="empty-state-title">Belum ada data kerjasama</div>
              <div className="empty-state-desc">
                Klik "Tambah Kerjasama" untuk menambahkan data kerjasama institusional sesuai Tabel 1 LKPS.
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Lembaga Mitra</th>
                    <th>Tingkat</th>
                    <th>Jenis</th>
                    <th>Judul Kegiatan</th>
                    <th>Periode</th>
                    <th>MoU/MoA</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td style={{ color: 'var(--lkps-text-muted)', width: '40px' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{row.namaLembaga || '–'}</td>
                      <td>
                        <span className="badge" style={{
                          background: tingkatColors[row.tingkat]?.bg,
                          color: tingkatColors[row.tingkat]?.text,
                          border: '1px solid ' + tingkatColors[row.tingkat]?.text + '33',
                        }}>
                          {row.tingkat}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: jenisColors[row.jenisKerjasama]?.bg,
                          color: jenisColors[row.jenisKerjasama]?.text,
                          border: '1px solid ' + jenisColors[row.jenisKerjasama]?.text + '33',
                        }}>
                          {row.jenisKerjasama} – {jenisLabels[row.jenisKerjasama]}
                        </span>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.judulKegiatan || '–'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)', whiteSpace: 'nowrap' }}>
                        {row.tanggalMulai ? new Date(row.tanggalMulai).getFullYear() : '–'}
                        {' – '}
                        {row.tanggalAkhir ? new Date(row.tanggalAkhir).getFullYear() : '–'}
                      </td>
                      <td>
                        {row.fileMou && row.fileMou.startsWith('/uploads') ? (
                          <a
                            href={row.fileMou}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="badge badge-emerald"
                            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Unduh / Lihat Dokumen MoU"
                          >
                            <FileText size={12} strokeWidth={2} />
                            {row.fileName || 'Lihat PDF'}
                          </a>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge badge-amber" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={11} />
                              Berkas belum diinputkan
                            </span>
                            {row.fileMou && (
                              <span style={{ fontSize: '10px', color: 'var(--lkps-text-muted)' }} title={row.fileMou}>
                                Ref: {row.fileMou}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {canEdit ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>
                              <Edit3 size={13} strokeWidth={1.75} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRow(row.id)}>
                              <Trash2 size={13} strokeWidth={1.75} />
                            </button>
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

        {/* Save */}
        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            {saved && (
              <div className="badge badge-emerald" style={{ fontSize: '13px', padding: '8px 14px' }}>
                <CheckCircle2 size={14} strokeWidth={2} />
                Data berhasil disimpan!
              </div>
            )}
            <button id="btn-save-kerjasama" className="btn btn-primary" onClick={handleSaveAll} disabled={saving || rows.length === 0}>
              {saving ? (
                <>
                  <Loader2 className="spin" size={16} strokeWidth={2} />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={16} strokeWidth={1.75} />
                  Simpan Data Kerjasama
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && editingRow && canEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                {rows.find(r => r.id === editingRow.id) ? 'Edit Data Kerjasama' : 'Tambah Data Kerjasama Baru'}
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--lkps-text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Lembaga/Institusi Mitra <span className="required">*</span></label>
                <input className="form-input" placeholder="Nama instansi mitra..."
                  value={editingRow.namaLembaga} onChange={e => setEditingRow(p => p ? { ...p, namaLembaga: e.target.value } : p)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tingkat Kerjasama <span className="required">*</span></label>
                  <select className="form-select" value={editingRow.tingkat}
                    onChange={e => setEditingRow(p => p ? { ...p, tingkat: e.target.value } : p)}>
                    <option>Internasional</option>
                    <option>Nasional</option>
                    <option>Wilayah/Lokal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jenis Kerjasama <span className="required">*</span></label>
                  <select className="form-select" value={editingRow.jenisKerjasama}
                    onChange={e => setEditingRow(p => p ? { ...p, jenisKerjasama: e.target.value } : p)}>
                    <option value="N1">N1 – Pendidikan</option>
                    <option value="N2">N2 – Penelitian</option>
                    <option value="N3">N3 – Pengabdian kepada Masyarakat</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Judul/Nama Kegiatan Kerjasama <span className="required">*</span></label>
                <input className="form-input" placeholder="Judul MoU atau kegiatan..."
                  value={editingRow.judulKegiatan} onChange={e => setEditingRow(p => p ? { ...p, judulKegiatan: e.target.value } : p)} />
              </div>

              <div className="form-group">
                <label className="form-label">Manfaat Kerjasama</label>
                <textarea className="form-textarea" placeholder="Deskripsikan manfaat kerjasama bagi prodi..." rows={2}
                  value={editingRow.manfaat} onChange={e => setEditingRow(p => p ? { ...p, manfaat: e.target.value } : p)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tanggal Mulai</label>
                  <input type="date" className="form-input" value={editingRow.tanggalMulai}
                    onChange={e => setEditingRow(p => p ? { ...p, tanggalMulai: e.target.value } : p)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal Berakhir</label>
                  <input type="date" className="form-input" value={editingRow.tanggalAkhir}
                    onChange={e => setEditingRow(p => p ? { ...p, tanggalAkhir: e.target.value } : p)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Upload Dokumen MoU/MoA (PDF)</label>
                <div className="upload-zone">
                  <IconBadge color="blue" size="md" style={{ margin: '0 auto 10px' }}>
                    <UploadCloud size={20} strokeWidth={1.75} />
                  </IconBadge>
                  <p style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)', marginBottom: '4px' }}>
                    Drag & drop file PDF, atau <span style={{ color: 'var(--lkps-accent-blue)' }}>klik untuk browse</span>
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--lkps-text-muted)' }}>PDF, maksimal 10MB</p>
                  <input
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingPdf(true)
                      try {
                        const fd = new FormData()
                        fd.append('file', file)
                        const res = await fetch('/api/lkps/bukti', {
                          method: 'POST',
                          body: fd,
                        })
                        const data = await res.json()
                        if (res.ok && data.url) {
                          setEditingRow((p) => (p ? { ...p, fileMou: data.url, fileName: file.name } : p))
                        } else {
                          alert(data.pesan || 'Gagal mengunggah berkas')
                        }
                      } catch (err: any) {
                        alert(err.message || 'Gagal mengunggah berkas')
                      } finally {
                        setUploadingPdf(false)
                      }
                    }}
                  />
                </div>
                {uploadingPdf && (
                  <p style={{ fontSize: '12px', color: 'var(--lkps-accent-blue)', marginTop: '8px' }}>
                    Mengunggah dokumen PDF ke server...
                  </p>
                )}
                {editingRow.fileName && (
                  <div className="badge badge-emerald" style={{ marginTop: '8px' }}>
                    <FileText size={12} strokeWidth={2} />
                    {editingRow.fileName}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button id="btn-save-modal-kerjasama" className="btn btn-primary" onClick={handleSaveRow}>
                <Check size={16} strokeWidth={2} />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

