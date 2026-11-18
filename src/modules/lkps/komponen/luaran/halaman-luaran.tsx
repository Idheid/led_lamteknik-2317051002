"use client";
/* eslint-disable react/no-unescaped-entities -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/luaran/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim"
import { useState, useEffect } from 'react'
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran"
import { Award, Trophy, GraduationCap, Briefcase, Plus, Edit3, Trash2, Save, Loader2, CheckCircle2, X } from 'lucide-react'

interface IpkRow {
  id: string
  tahunSemester: string
  ipkMinimum: number
  ipkRataRata: number
  ipkMaksimum: number
}

interface PrestasiRow {
  id: string
  namaMahasiswa: string
  namaKegiatan: string
  tingkat: string
  penghargaan: string
  tahun: number
  jenis: string
}

interface EfektivitasRow {
  id: string
  angkatan: number
  jumlahMasuk: number
  jumlahLulusTepat: number
}

interface TracerRow {
  id: string
  tahun: number
  jumlahResponden: number
  rataWaktuTunggu: number
  persenSesuaiBidang: number
  persenTempatKerjaLokal: number
  persenTempatKerjaNasional: number
  persenTempatKerjaInternasional: number
  skorKepuasanPengguna: number
}

export default function HalamanLuaran() {
  const { canEdit } = useModulePermission('luaran')
  const [activeTab, setActiveTab] = useState<'ipk' | 'prestasi' | 'efektivitas' | 'tracer'>('ipk')

  const [ipkList, setIpkList] = useState<IpkRow[]>([
    { id: 'temp_ts2', tahunSemester: 'TS-2', ipkMinimum: 2.75, ipkRataRata: 3.25, ipkMaksimum: 3.85 },
    { id: 'temp_ts1', tahunSemester: 'TS-1', ipkMinimum: 2.80, ipkRataRata: 3.30, ipkMaksimum: 3.90 },
    { id: 'temp_ts', tahunSemester: 'TS', ipkMinimum: 2.85, ipkRataRata: 3.35, ipkMaksimum: 3.95 },
  ])
  const [prestasiList, setPrestasiList] = useState<PrestasiRow[]>([])
  const [efektivitasList, setEfektivitasList] = useState<EfektivitasRow[]>([])
  const [tracerList, setTracerList] = useState<TracerRow[]>([])

  const [showPrestasiModal, setShowPrestasiModal] = useState(false)
  const [editingPrestasi, setEditingPrestasi] = useState<PrestasiRow | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await kirimLkps('/api/lkps/luaran')
      if (res.ok) {
        const data = await res.json()
        if (data.ipk && data.ipk.length > 0) setIpkList(data.ipk)
        setPrestasiList(data.prestasi || [])
        setEfektivitasList(data.efektivitas || [])
        setTracerList(data.tracer || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Formula Calculations
  const avgIpk = ipkList.length > 0 ? (ipkList.reduce((acc, i) => acc + (i.ipkRataRata || 0), 0) / ipkList.length) : 0
  const totalPrestasi = prestasiList.length

  async function handleSaveIpk() {
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/luaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveIpk', payload: { rows: ipkList } }),
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

  function openAddPrestasi() {
    setEditingPrestasi({
      id: `temp_${Date.now()}`,
      namaMahasiswa: '',
      namaKegiatan: '',
      tingkat: 'Nasional',
      penghargaan: 'Juara 1',
      tahun: new Date().getFullYear(),
      jenis: 'Akademik',
    })
    setShowPrestasiModal(true)
  }

  function openEditPrestasi(row: PrestasiRow) {
    setEditingPrestasi({ ...row })
    setShowPrestasiModal(true)
  }

  async function handleSavePrestasi() {
    if (!editingPrestasi) return
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/luaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'savePrestasi', payload: editingPrestasi }),
      })
      if (res.ok) {
        await fetchData()
        setShowPrestasiModal(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePrestasi(id: string) {
    if (!confirm('Hapus prestasi ini?')) return
    try {
      const res = await kirimLkps('/api/lkps/luaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletePrestasi', payload: { id } }),
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      <JudulHalaman judul="Kriteria 8: Luaran & Capaian Tridharma" />
      <div className="page-content animate-fade-in">
        <div style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Luaran dan Capaian Tridharma</h2>
          <p className="section-subtitle">
            Tabel 8.a–8.f LKPS – Indeks Prestasi Kumulatif (IPK), Prestasi Mahasiswa, Masa Studi, Tracer Study & Pengguna Lulusan.
          </p>
        </div>

        <RoleNotice module="luaran" />

        {/* Realtime Calculation Card */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.15)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconBadge icon={Trophy} variant="amber" size="md" glow />
              <div>
                <div className="card-title">Indikator Luaran & Capaian Lulusan – Real-time</div>
                <div className="card-subtitle">Matriks Penilaian LAM Teknik</div>
              </div>
            </div>
            <div className="score-display score-excellent">
              Rata-rata IPK: {avgIpk.toFixed(2)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>Prestasi Mahasiswa</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{totalPrestasi} Penghargaan</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>Status Tracer Study</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{tracerList.length} Tahun Data</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button className={`btn ${activeTab === 'ipk' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('ipk')}>
            <GraduationCap size={16} /> Tabel 8.a – IPK Lulusan
          </button>
          <button className={`btn ${activeTab === 'prestasi' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('prestasi')}>
            <Trophy size={16} /> Tabel 8.b – Prestasi Mahasiswa
          </button>
          <button className={`btn ${activeTab === 'tracer' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('tracer')}>
            <Briefcase size={16} /> Tabel 8.d-e – Tracer Study
          </button>
        </div>

        {saved && (
          <div className="badge badge-emerald" style={{ marginBottom: '16px', fontSize: '13px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> Data Luaran berhasil diperbarui!
          </div>
        )}

        {/* Tab 1: IPK */}
        {activeTab === 'ipk' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Indeks Prestasi Kumulatif / IPK (Tabel 8.a LKPS)</div>
                <div className="card-subtitle">Rekapitulasi IPK Minimum, Rata-rata, dan Maksimum Lulusan</div>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tahun / Semester</th>
                    <th>IPK Minimum</th>
                    <th>IPK Rata-Rata</th>
                    <th>IPK Maksimum</th>
                  </tr>
                </thead>
                <tbody>
                  {ipkList.map((row, idx) => (
                    <tr key={row.id || idx}>
                      <td style={{ fontWeight: 700, color: 'var(--lkps-accent-blue)' }}>{row.tahunSemester}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="4"
                          disabled={!canEdit}
                          className="form-input"
                          style={{ width: '120px' }}
                          value={row.ipkMinimum}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setIpkList(prev => prev.map((item, i) => i === idx ? { ...item, ipkMinimum: val } : item))
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="4"
                          disabled={!canEdit}
                          className="form-input"
                          style={{ width: '120px', fontWeight: 700, color: 'var(--lkps-accent-emerald)' }}
                          value={row.ipkRataRata}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setIpkList(prev => prev.map((item, i) => i === idx ? { ...item, ipkRataRata: val } : item))
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="4"
                          disabled={!canEdit}
                          className="form-input"
                          style={{ width: '120px' }}
                          value={row.ipkMaksimum}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setIpkList(prev => prev.map((item, i) => i === idx ? { ...item, ipkMaksimum: val } : item))
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
                <button id="btn-save-ipk" className="btn btn-primary" onClick={handleSaveIpk} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {saving ? 'Menyimpan...' : 'Simpan Data IPK'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Prestasi */}
        {activeTab === 'prestasi' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Prestasi Mahasiswa (Tabel 8.b LKPS)</div>
                <div className="card-subtitle">Akademik & Non-Akademik (Wilayah, Nasional, Internasional)</div>
              </div>
              {canEdit && (
                <button id="btn-add-prestasi" className="btn btn-primary" onClick={openAddPrestasi}>
                  <Plus size={16} />
                  Tambah Prestasi
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--lkps-text-secondary)' }}>Memuat data Prestasi...</div>
            ) : prestasiList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Belum ada data prestasi mahasiswa</div>
                <div className="empty-state-desc">Klik "Tambah Prestasi" untuk memasukkan data penghargaan lomba.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Mahasiswa</th>
                      <th>Nama Kegiatan / Lomba</th>
                      <th>Tingkat</th>
                      <th>Penghargaan</th>
                      <th>Jenis</th>
                      <th>Tahun</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prestasiList.map((p, idx) => (
                      <tr key={p.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{p.namaMahasiswa}</td>
                        <td>{p.namaKegiatan}</td>
                        <td><span className="badge badge-purple">{p.tingkat}</span></td>
                        <td><span className="badge badge-emerald">{p.penghargaan}</span></td>
                        <td>{p.jenis}</td>
                        <td>{p.tahun}</td>
                        <td>
                          {canEdit ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditPrestasi(p)}>
                                <Edit3 size={14} /> Edit
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeletePrestasi(p.id)}>
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

        {/* Tab 3: Tracer Study */}
        {activeTab === 'tracer' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Tracer Study & Kepuasan Pengguna Lulusan (Tabel 8.d–8.e LKPS)</div>
                <div className="card-subtitle">Waktu Tunggu Kerja, Kesesuaian Bidang, & Tingkat Tempat Kerja</div>
              </div>
            </div>

            {tracerList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Data Tracer Study Terhubung</div>
                <div className="empty-state-desc">Form pengisian tracer study aktif dan siap divalidasi.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tahun</th>
                      <th>Responden</th>
                      <th>Waktu Tunggu (Bulan)</th>
                      <th>Sesuai Bidang (%)</th>
                      <th>Tempat Kerja (Lokal/Nasional/Int)</th>
                      <th>Skor Kepuasan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracerList.map((t) => (
                      <tr key={t.id}>
                        <td>{t.tahun}</td>
                        <td>{t.jumlahResponden} Orang</td>
                        <td style={{ fontWeight: 600 }}>{t.rataWaktuTunggu} Bulan</td>
                        <td style={{ color: 'var(--lkps-accent-emerald)', fontWeight: 600 }}>{t.persenSesuaiBidang}%</td>
                        <td>{t.persenTempatKerjaLokal}% / {t.persenTempatKerjaNasional}% / {t.persenTempatKerjaInternasional}%</td>
                        <td><span className="badge badge-amber">{t.skorKepuasanPengguna} / 4.0</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prestasi Modal */}
      {showPrestasiModal && editingPrestasi && canEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPrestasiModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editingPrestasi.id.startsWith('temp_') ? 'Tambah Prestasi' : 'Edit Prestasi'}</div>
              <button onClick={() => setShowPrestasiModal(false)} style={{ background: 'none', border: 'none', color: 'var(--lkps-text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nama Mahasiswa <span className="required">*</span></label>
                  <input className="form-input" value={editingPrestasi.namaMahasiswa} onChange={e => setEditingPrestasi({ ...editingPrestasi, namaMahasiswa: e.target.value })} placeholder="Nama Mahasiswa" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tingkat Prestasi</label>
                  <select className="form-select" value={editingPrestasi.tingkat} onChange={e => setEditingPrestasi({ ...editingPrestasi, tingkat: e.target.value })}>
                    <option>Wilayah/Lokal</option>
                    <option>Nasional</option>
                    <option>Internasional</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nama Kegiatan / Kompetisi <span className="required">*</span></label>
                <input className="form-input" value={editingPrestasi.namaKegiatan} onChange={e => setEditingPrestasi({ ...editingPrestasi, namaKegiatan: e.target.value })} placeholder="Lomba Kontes Robot Indonesia (KRI)" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Capaian / Penghargaan</label>
                  <input className="form-input" value={editingPrestasi.penghargaan} onChange={e => setEditingPrestasi({ ...editingPrestasi, penghargaan: e.target.value })} placeholder="Juara 1 / Gold Medal" />
                </div>
                <div className="form-group">
                  <label className="form-label">Jenis Prestasi</label>
                  <select className="form-select" value={editingPrestasi.jenis} onChange={e => setEditingPrestasi({ ...editingPrestasi, jenis: e.target.value })}>
                    <option>Akademik</option>
                    <option>Non-Akademik</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPrestasiModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSavePrestasi} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? 'Menyimpan...' : 'Simpan Prestasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

