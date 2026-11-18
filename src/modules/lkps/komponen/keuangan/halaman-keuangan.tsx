"use client";
/* eslint-disable react/no-unescaped-entities -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/keuangan/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim"
import { useState, useEffect } from 'react'
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran"
import { Wallet, Coins, Microscope, Zap, Plus, Edit3, Trash2, Save, Loader2, CheckCircle2, X } from 'lucide-react'

interface DanaRow {
  id: string
  tahunSemester: string
  biayaOperasionalPendidikan: number
  biayaPenelitianDosen: number
  biayaPkmDosen: number
  investasiSdm: number
  investasiSarana: number
  investasiPrasarana: number
}

interface LabRow {
  id: string
  namaLab: string
  jenisPeralatan: string
  kepemilikan: string
  kondisi: string
  jamPenggunaan: number
  luasRuangan: number
}

export default function HalamanKeuangan() {
  const { canEdit } = useModulePermission('keuangan')
  const [danaList, setDanaList] = useState<DanaRow[]>([
    { id: 'temp_ts2', tahunSemester: 'TS-2', biayaOperasionalPendidikan: 0, biayaPenelitianDosen: 0, biayaPkmDosen: 0, investasiSdm: 0, investasiSarana: 0, investasiPrasarana: 0 },
    { id: 'temp_ts1', tahunSemester: 'TS-1', biayaOperasionalPendidikan: 0, biayaPenelitianDosen: 0, biayaPkmDosen: 0, investasiSdm: 0, investasiSarana: 0, investasiPrasarana: 0 },
    { id: 'temp_ts', tahunSemester: 'TS', biayaOperasionalPendidikan: 0, biayaPenelitianDosen: 0, biayaPkmDosen: 0, investasiSdm: 0, investasiSarana: 0, investasiPrasarana: 0 },
  ])
  const [labList, setLabList] = useState<LabRow[]>([])
  const [activeTab, setActiveTab] = useState<'dana' | 'lab'>('dana')

  const [showLabModal, setShowLabModal] = useState(false)
  const [editingLab, setEditingLab] = useState<LabRow | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await kirimLkps('/api/lkps/keuangan')
      if (res.ok) {
        const data = await res.json()
        if (data.dana && data.dana.length > 0) {
          setDanaList(data.dana)
        }
        setLabList(data.lab || [])
      }
    } catch (err) {
      console.error('Failed to fetch Keuangan data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Real-time calculations
  const totalOperasional = danaList.reduce((acc, d) => acc + (d.biayaOperasionalPendidikan || 0), 0)
  const totalPenelitian = danaList.reduce((acc, d) => acc + (d.biayaPenelitianDosen || 0), 0)
  const totalPkm = danaList.reduce((acc, d) => acc + (d.biayaPkmDosen || 0), 0)

  async function handleSaveDana() {
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/keuangan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveDana', payload: { rows: danaList } }),
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

  function openAddLab() {
    setEditingLab({
      id: `temp_${Date.now()}`,
      namaLab: '',
      jenisPeralatan: '',
      kepemilikan: 'Milik Sendiri',
      kondisi: 'Baik',
      jamPenggunaan: 30,
      luasRuangan: 72,
    })
    setShowLabModal(true)
  }

  function openEditLab(row: LabRow) {
    setEditingLab({ ...row })
    setShowLabModal(true)
  }

  async function handleSaveLab() {
    if (!editingLab) return
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/keuangan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveLab', payload: editingLab }),
      })
      if (res.ok) {
        await fetchData()
        setShowLabModal(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteLab(id: string) {
    if (!confirm('Hapus data sarana/laboratorium ini?')) return
    try {
      const res = await kirimLkps('/api/lkps/keuangan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteLab', payload: { id } }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  function formatRp(val: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <>
      <JudulHalaman judul="Kriteria 4: Keuangan, Sarana & Prasarana" />
      <div className="page-content animate-fade-in">
        <div style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Keuangan, Sarana, dan Prasarana</h2>
          <p className="section-subtitle">
            Tabel 4.a–4.c LKPS – Penggunaan dana operasional, penelitian, PkM, serta kecukupan sarana prasarana laboratorium.
          </p>
        </div>

        <RoleNotice module="keuangan" />

        {/* Realtime Summary Card */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.15)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconBadge icon={Zap} variant="emerald" size="md" glow />
              <div>
                <div className="card-title">Ringkasan Penggunaan Dana Tridharma</div>
                <div className="card-subtitle">Akumulasi Biaya Operasional (TS-2 s.d TS)</div>
              </div>
            </div>
            <div className="score-display score-excellent">
              {labList.length} Lab/Studio Terdaftar
            </div>
          </div>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>Operasional Pendidikan</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{formatRp(totalOperasional)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>Penelitian Dosen</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>{formatRp(totalPenelitian)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>PkM Dosen</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6' }}>{formatRp(totalPkm)}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button className={`btn ${activeTab === 'dana' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('dana')}>
            <Coins size={16} /> Tabel 4.a – Penggunaan Dana
          </button>
          <button className={`btn ${activeTab === 'lab' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('lab')}>
            <Microscope size={16} /> Tabel 4.b & 4.c – Sarana & Laboratorium
          </button>
        </div>

        {saved && (
          <div className="badge badge-emerald" style={{ marginBottom: '16px', fontSize: '13px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> Data Keuangan berhasil disimpan!
          </div>
        )}

        {/* Tab 1: Dana */}
        {activeTab === 'dana' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Data Penggunaan Dana (Tabel 4.a LKPS)</div>
                <div className="card-subtitle">Dalam Rupiah (IDR)</div>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th>Operasional Pendidikan</th>
                    <th>Penelitian Dosen</th>
                    <th>PkM Dosen</th>
                    <th>Investasi SDM</th>
                    <th>Investasi Sarana</th>
                    <th>Investasi Prasarana</th>
                  </tr>
                </thead>
                <tbody>
                  {danaList.map((d, idx) => (
                    <tr key={d.id || idx}>
                      <td style={{ fontWeight: 700, color: 'var(--lkps-accent-blue)' }}>{d.tahunSemester}</td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '130px' }}
                          disabled={!canEdit}
                          value={d.biayaOperasionalPendidikan}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setDanaList(prev => prev.map((item, i) => i === idx ? { ...item, biayaOperasionalPendidikan: val } : item))
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '130px' }}
                          disabled={!canEdit}
                          value={d.biayaPenelitianDosen}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setDanaList(prev => prev.map((item, i) => i === idx ? { ...item, biayaPenelitianDosen: val } : item))
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '130px' }}
                          disabled={!canEdit}
                          value={d.biayaPkmDosen}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setDanaList(prev => prev.map((item, i) => i === idx ? { ...item, biayaPkmDosen: val } : item))
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '130px' }}
                          disabled={!canEdit}
                          value={d.investasiSdm}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setDanaList(prev => prev.map((item, i) => i === idx ? { ...item, investasiSdm: val } : item))
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '130px' }}
                          disabled={!canEdit}
                          value={d.investasiSarana}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setDanaList(prev => prev.map((item, i) => i === idx ? { ...item, investasiSarana: val } : item))
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '130px' }}
                          disabled={!canEdit}
                          value={d.investasiPrasarana}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setDanaList(prev => prev.map((item, i) => i === idx ? { ...item, investasiPrasarana: val } : item))
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canEdit && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button id="btn-save-dana" className="btn btn-primary" onClick={handleSaveDana} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {saving ? 'Menyimpan...' : 'Simpan Data Penggunaan Dana'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Lab */}
        {activeTab === 'lab' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Sarana & Laboratorium (Tabel 4.b & 4.c LKPS)</div>
                <div className="card-subtitle">Daftar Ruang Praktikum, Peralatan Utama & Kondisi</div>
              </div>
              {canEdit && (
                <button id="btn-add-lab" className="btn btn-primary" onClick={openAddLab}>
                  <Plus size={16} />
                  Tambah Lab / Sarana
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--lkps-text-secondary)' }}>Memuat data Sarana...</div>
            ) : labList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Belum ada data laboratorium</div>
                <div className="empty-state-desc">Klik "Tambah Lab / Sarana" untuk mendaftarkan ruang laboratorium.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Laboratorium / Studio</th>
                      <th>Peralatan Utama</th>
                      <th>Kepemilikan</th>
                      <th>Kondisi</th>
                      <th>Luas (m²)</th>
                      <th>Jam Pakai/Minggu</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labList.map((l, idx) => (
                      <tr key={l.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{l.namaLab}</td>
                        <td>{l.jenisPeralatan}</td>
                        <td><span className="badge badge-blue">{l.kepemilikan}</span></td>
                        <td>
                          {l.kondisi === 'Baik' ? (
                            <span className="badge badge-emerald">Baik</span>
                          ) : (
                            <span className="badge badge-amber">{l.kondisi}</span>
                          )}
                        </td>
                        <td>{l.luasRuangan} m²</td>
                        <td>{l.jamPenggunaan} Jam</td>
                        <td>
                          {canEdit ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditLab(l)}>
                                <Edit3 size={14} /> Edit
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteLab(l.id)}>
                                <Trash2 size={14} /> Hapus
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

      {/* Lab Modal */}
      {showLabModal && editingLab && canEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLabModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editingLab.id.startsWith('temp_') ? 'Tambah Laboratorium / Sarana' : 'Edit Laboratorium / Sarana'}</div>
              <button onClick={() => setShowLabModal(false)} style={{ background: 'none', border: 'none', color: 'var(--lkps-text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Laboratorium / Studio / Ruang Praktikum <span className="required">*</span></label>
                <input className="form-input" value={editingLab.namaLab} onChange={e => setEditingLab({ ...editingLab, namaLab: e.target.value })} placeholder="Laboratorium Pemrograman & AI" />
              </div>
              <div className="form-group">
                <label className="form-label">Jenis Peralatan Utama</label>
                <input className="form-input" value={editingLab.jenisPeralatan} onChange={e => setEditingLab({ ...editingLab, jenisPeralatan: e.target.value })} placeholder="PC Workstation GPU, Router Cisco, IoT Kit..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status Kepemilikan</label>
                  <select className="form-select" value={editingLab.kepemilikan} onChange={e => setEditingLab({ ...editingLab, kepemilikan: e.target.value })}>
                    <option>Milik Sendiri</option>
                    <option>Sewa / Kerjasama</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kondisi Peralatan</label>
                  <select className="form-select" value={editingLab.kondisi} onChange={e => setEditingLab({ ...editingLab, kondisi: e.target.value })}>
                    <option>Baik</option>
                    <option>Rusak Ringan</option>
                    <option>Rusak Berat</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Luas Ruangan (m²)</label>
                  <input type="number" className="form-input" value={editingLab.luasRuangan} onChange={e => setEditingLab({ ...editingLab, luasRuangan: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rata-rata Jam Pakai / Minggu</label>
                  <input type="number" className="form-input" value={editingLab.jamPenggunaan} onChange={e => setEditingLab({ ...editingLab, jamPenggunaan: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowLabModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveLab} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? 'Menyimpan...' : 'Simpan Sarana'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
