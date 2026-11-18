"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/pendidikan/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim"
import { useState, useEffect } from 'react'
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran"
import {
  BookOpen,
  Rocket,
  Zap,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  Save,
  Loader2,
  ExternalLink,
} from 'lucide-react'

interface MKRow {
  id: string
  kode: string
  nama: string
  sksTeori: number
  sksPraktikum: number
  cpl: string
  linkRps: string | null
  unitPenyelenggara: string
}

interface MBKMRow {
  id: string
  namaMahasiswa: string
  nim: string
  namaMitra: string
  sksKonversi: number
  dosenPembimbing: string
  tahun: number
}

export default function HalamanPendidikan() {
  const { canEdit } = useModulePermission('pendidikan')
  const [mkList, setMkList] = useState<MKRow[]>([])
  const [mbkmList, setMbkmList] = useState<MBKMRow[]>([])
  const [activeTab, setActiveTab] = useState<'mk' | 'mbkm'>('mk')

  const [showMkModal, setShowMkModal] = useState(false)
  const [editingMk, setEditingMk] = useState<MKRow | null>(null)

  const [showMbkmModal, setShowMbkmModal] = useState(false)
  const [editingMbkm, setEditingMbkm] = useState<MBKMRow | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await kirimLkps('/api/lkps/pendidikan')
      if (res.ok) {
        const data = await res.json()
        setMkList(data.mk || [])
        setMbkmList(data.mbkm || [])
      }
    } catch (err) {
      console.error('Failed to fetch Pendidikan data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Realtime calculations
  const totalSksTeori = mkList.reduce((acc, m) => acc + (m.sksTeori || 0), 0)
  const totalSksPraktikum = mkList.reduce((acc, m) => acc + (m.sksPraktikum || 0), 0)
  const totalSks = totalSksTeori + totalSksPraktikum
  const persenPraktikum = totalSks > 0 ? (totalSksPraktikum / totalSks) * 100 : 0

  function openAddMk() {
    setEditingMk({
      id: `temp_${Date.now()}`,
      kode: '',
      nama: '',
      sksTeori: 2,
      sksPraktikum: 1,
      cpl: 'CPL-01, CPL-03',
      linkRps: '',
      unitPenyelenggara: 'Prodi',
    })
    setShowMkModal(true)
  }

  function openEditMk(row: MKRow) {
    setEditingMk({ ...row })
    setShowMkModal(true)
  }

  async function handleSaveMk() {
    if (!editingMk) return
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/pendidikan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveMK', payload: editingMk }),
      })
      if (res.ok) {
        await fetchData()
        setShowMkModal(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMk(id: string) {
    if (!confirm('Hapus mata kuliah ini?')) return
    try {
      const res = await kirimLkps('/api/lkps/pendidikan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteMK', payload: { id } }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  function openAddMbkm() {
    setEditingMbkm({
      id: `temp_${Date.now()}`,
      namaMahasiswa: '',
      nim: '',
      namaMitra: 'PT Telekomunikasi Indonesia',
      sksKonversi: 20,
      dosenPembimbing: 'Dosen Pembimbing',
      tahun: new Date().getFullYear(),
    })
    setShowMbkmModal(true)
  }

  function openEditMbkm(row: MBKMRow) {
    setEditingMbkm({ ...row })
    setShowMbkmModal(true)
  }

  async function handleSaveMbkm() {
    if (!editingMbkm) return
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/pendidikan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveMBKM', payload: editingMbkm }),
      })
      if (res.ok) {
        await fetchData()
        setShowMbkmModal(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMbkm(id: string) {
    if (!confirm('Hapus data peserta MBKM ini?')) return
    try {
      const res = await kirimLkps('/api/lkps/pendidikan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteMBKM', payload: { id } }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      <JudulHalaman judul="Kriteria 5: Pendidikan & MBKM" />
      <div className="page-content animate-fade-in">
        <div style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Pendidikan</h2>
          <p className="section-subtitle">
            Tabel 5.a–5.b LKPS – Kurikulum, Struktur SKS, Capaian Pembelajaran Lulusan (CPL), Dokumen RPS, dan Kegiatan MBKM.
          </p>
        </div>

        <RoleNotice module="pendidikan" />

        {/* Realtime Summary Card */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconBadge color="amber" size="sm">
                <Zap size={18} strokeWidth={2} />
              </IconBadge>
              <div>
                <div className="card-title">Struktur Kurikulum & Praktikum – Real-time</div>
                <div className="card-subtitle">Matriks Penilaian Kurikulum Diploma III / Vokasi Teknik</div>
              </div>
            </div>
            <div className="score-display score-excellent">
              Total: {totalSks} SKS
            </div>
          </div>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginTop: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>SKS Teori</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>{totalSksTeori} SKS</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>SKS Praktikum / Lapangan</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{totalSksPraktikum} SKS ({persenPraktikum.toFixed(1)}%)</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>Peserta MBKM Terdaftar</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6' }}>{mbkmList.length} Mahasiswa</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[
            { key: 'mk', label: 'Tabel 5.a.1 – Struktur Kurikulum & RPS', icon: BookOpen },
            { key: 'mbkm', label: 'Tabel 5.b – Penyelenggaraan MBKM', icon: Rocket },
          ].map(tab => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button key={tab.key} className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab.key as any)}>
                <TabIcon size={16} strokeWidth={1.75} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {saved && (
          <div className="badge badge-emerald" style={{ marginBottom: '16px', fontSize: '13px', padding: '8px 14px' }}>
            <CheckCircle2 size={14} strokeWidth={2} />
            Data Pendidikan berhasil diperbarui!
          </div>
        )}

        {/* Tab 1: Kurikulum */}
        {activeTab === 'mk' && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconBadge color="amber" size="md">
                  <BookOpen size={20} strokeWidth={1.75} />
                </IconBadge>
                <div>
                  <div className="card-title">Struktur Kurikulum (Tabel 5.a.1 LKPS)</div>
                  <div className="card-subtitle">Total: {mkList.length} Mata Kuliah</div>
                </div>
              </div>
              {canEdit && (
                <button id="btn-add-mk" className="btn btn-primary" onClick={openAddMk}>
                  <Plus size={16} strokeWidth={2} />
                  Tambah Mata Kuliah
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--lkps-text-secondary)' }}>Memuat data Kurikulum...</div>
            ) : mkList.length === 0 ? (
              <div className="empty-state">
                <IconBadge color="amber" size="lg" style={{ marginBottom: '16px' }}>
                  <BookOpen size={28} strokeWidth={1.5} />
                </IconBadge>
                <div className="empty-state-title">Belum ada data mata kuliah</div>
                <div className="empty-state-desc">Klik "Tambah Mata Kuliah" untuk menginput struktur kurikulum.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Kode MK</th>
                      <th>Nama Mata Kuliah</th>
                      <th>Bobot SKS (T/P)</th>
                      <th>CPL Dipetakan</th>
                      <th>Unit Penyelenggara</th>
                      <th>RPS Dokumen</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mkList.map((m, idx) => (
                      <tr key={m.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: 'var(--lkps-accent-blue)' }}>{m.kode}</td>
                        <td style={{ fontWeight: 600 }}>{m.nama}</td>
                        <td>{m.sksTeori} / {m.sksPraktikum} SKS</td>
                        <td><span className="badge badge-purple">{m.cpl}</span></td>
                        <td>{m.unitPenyelenggara}</td>
                        <td>
                          {m.linkRps ? (
                            <a href={m.linkRps} target="_blank" rel="noreferrer" className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>Lihat RPS</span>
                              <ExternalLink size={10} strokeWidth={2} />
                            </a>
                          ) : (
                            <span className="badge badge-amber" style={{ fontSize: '11px' }}>Berkas belum diinputkan</span>
                          )}
                        </td>
                        <td>
                          {canEdit ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditMk(m)}>
                                <Edit3 size={13} strokeWidth={1.75} />
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMk(m.id)}>
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
        )}

        {/* Tab 2: MBKM */}
        {activeTab === 'mbkm' && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconBadge color="purple" size="md">
                  <Rocket size={20} strokeWidth={1.75} />
                </IconBadge>
                <div>
                  <div className="card-title">Penyelenggaraan MBKM (Tabel 5.b LKPS)</div>
                  <div className="card-subtitle">Magang Industri, Pertukaran Pelajar, Riset</div>
                </div>
              </div>
              {canEdit && (
                <button id="btn-add-mbkm" className="btn btn-primary" onClick={openAddMbkm}>
                  <Plus size={16} strokeWidth={2} />
                  Tambah Peserta MBKM
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--lkps-text-secondary)' }}>Memuat data MBKM...</div>
            ) : mbkmList.length === 0 ? (
              <div className="empty-state">
                <IconBadge color="purple" size="lg" style={{ marginBottom: '16px' }}>
                  <Rocket size={28} strokeWidth={1.5} />
                </IconBadge>
                <div className="empty-state-title">Belum ada data peserta MBKM</div>
                <div className="empty-state-desc">Klik "Tambah Peserta MBKM" untuk menginput data mahasiswa.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Mahasiswa</th>
                      <th>NIM</th>
                      <th>Nama Mitra MBKM</th>
                      <th>SKS Konversi</th>
                      <th>Dosen Pembimbing</th>
                      <th>Tahun</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mbkmList.map((mb, idx) => (
                      <tr key={mb.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{mb.namaMahasiswa}</td>
                        <td>{mb.nim}</td>
                        <td><span className="badge badge-blue">{mb.namaMitra}</span></td>
                        <td style={{ fontWeight: 600, color: 'var(--lkps-accent-emerald)' }}>{mb.sksKonversi} SKS</td>
                        <td>{mb.dosenPembimbing}</td>
                        <td>{mb.tahun}</td>
                        <td>
                          {canEdit ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditMbkm(mb)}>
                                <Edit3 size={13} strokeWidth={1.75} />
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMbkm(mb.id)}>
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
        )}
      </div>

      {/* MK Modal */}
      {showMkModal && editingMk && canEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMkModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editingMk.id.startsWith('temp_') ? 'Tambah Mata Kuliah' : 'Edit Mata Kuliah'}</div>
              <button onClick={() => setShowMkModal(false)} style={{ background: 'none', border: 'none', color: 'var(--lkps-text-secondary)', cursor: 'pointer' }}>
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kode Mata Kuliah <span className="required">*</span></label>
                  <input className="form-input" value={editingMk.kode} onChange={e => setEditingMk({ ...editingMk, kode: e.target.value })} placeholder="TKN1201" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Mata Kuliah <span className="required">*</span></label>
                  <input className="form-input" value={editingMk.nama} onChange={e => setEditingMk({ ...editingMk, nama: e.target.value })} placeholder="Pemrograman Web Lanjut" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">SKS Teori</label>
                  <input type="number" className="form-input" value={editingMk.sksTeori} onChange={e => setEditingMk({ ...editingMk, sksTeori: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">SKS Praktikum</label>
                  <input type="number" className="form-input" value={editingMk.sksPraktikum} onChange={e => setEditingMk({ ...editingMk, sksPraktikum: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Pemetaan Capaian Pembelajaran (CPL)</label>
                <input className="form-input" value={editingMk.cpl} onChange={e => setEditingMk({ ...editingMk, cpl: e.target.value })} placeholder="CPL-01, CPL-04, CPL-07" />
              </div>
              <div className="form-group">
                <label className="form-label">Link Dokumen RPS (Google Drive / PDF)</label>
                <input className="form-input" value={editingMk.linkRps || ''} onChange={e => setEditingMk({ ...editingMk, linkRps: e.target.value })} placeholder="https://drive.google.com/..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowMkModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveMk} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="spin" size={16} strokeWidth={2} />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} strokeWidth={1.75} />
                    Simpan MK
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MBKM Modal */}
      {showMbkmModal && editingMbkm && canEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMbkmModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editingMbkm.id.startsWith('temp_') ? 'Tambah Peserta MBKM' : 'Edit Peserta MBKM'}</div>
              <button onClick={() => setShowMbkmModal(false)} style={{ background: 'none', border: 'none', color: 'var(--lkps-text-secondary)', cursor: 'pointer' }}>
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nama Mahasiswa <span className="required">*</span></label>
                  <input className="form-input" value={editingMbkm.namaMahasiswa} onChange={e => setEditingMbkm({ ...editingMbkm, namaMahasiswa: e.target.value })} placeholder="Ahmad Ghalib" />
                </div>
                <div className="form-group">
                  <label className="form-label">NIM <span className="required">*</span></label>
                  <input className="form-input" value={editingMbkm.nim} onChange={e => setEditingMbkm({ ...editingMbkm, nim: e.target.value })} placeholder="2015061001" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nama Mitra Penyelenggara MBKM</label>
                <input className="form-input" value={editingMbkm.namaMitra} onChange={e => setEditingMbkm({ ...editingMbkm, namaMitra: e.target.value })} placeholder="PT PLN (Persero) Indonesia" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">SKS Konversi</label>
                  <input type="number" className="form-input" value={editingMbkm.sksKonversi} onChange={e => setEditingMbkm({ ...editingMbkm, sksKonversi: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Dosen Pembimbing Lapangan</label>
                  <input className="form-input" value={editingMbkm.dosenPembimbing} onChange={e => setEditingMbkm({ ...editingMbkm, dosenPembimbing: e.target.value })} placeholder="Nama DPL" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowMbkmModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveMbkm} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="spin" size={16} strokeWidth={2} />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} strokeWidth={1.75} />
                    Simpan MBKM
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

