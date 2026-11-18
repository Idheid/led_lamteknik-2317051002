"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/identitas/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { useState, useEffect } from 'react'
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import Link from "next/link"
import { Petunjuk } from "@/components/petunjuk"
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran"
import { useInfoLkps } from "@/modules/lkps/komponen/bersama/konteks"
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim"
import {
  Building2,
  GraduationCap,
  Users,
  Plus,
  Trash2,
  UploadCloud,
  Save,
  CheckCircle2,
  Loader2,
  Building,
  School,
  FileCheck,
} from 'lucide-react'

interface IdentitasPT {
  namaPT: string
  namaUPPS: string
  jenisProgram: string
  namaProdi: string
  alamat: string
  noSkPendirianPT: string
  tanggalSkPT: string
  noSkPembukaanPS: string
  tanggalSkPS: string
}

interface ProdiRow {
  id: string
  namaProdi: string
  jenjang: string
  peringkatAkreditasi: string
  jumlahMahasiswaAktif: string
}

interface TimPenyusunRow {
  id: string
  nama: string
  nidn: string
  jabatan: string
}

export default function HalamanIdentitas() {
  const { canEdit } = useModulePermission('identitas')
  const { peran } = useInfoLkps()
  const [activeTab, setActiveTab] = useState<'identitas' | 'prodi' | 'tim'>('identitas')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const [identitas, setIdentitas] = useState<IdentitasPT>({
    namaPT: '',
    namaUPPS: '',
    jenisProgram: 'Vokasi',
    namaProdi: '',
    alamat: '',
    noSkPendirianPT: '',
    tanggalSkPT: '',
    noSkPembukaanPS: '',
    tanggalSkPS: '',
  })

  const [prodiList, setProdiList] = useState<ProdiRow[]>([
    { id: '1', namaProdi: '', jenjang: 'D3', peringkatAkreditasi: '', jumlahMahasiswaAktif: '0' },
  ])

  const [timList, setTimList] = useState<TimPenyusunRow[]>([
    { id: '1', nama: '', nidn: '', jabatan: '' },
  ])


  function addTim() {
    setTimList(prev => [...prev, { id: Date.now().toString(), nama: '', nidn: '', jabatan: '' }])
  }

  function removeTim(id: string) {
    setTimList(prev => prev.filter(t => t.id !== id))
  }

  function updateTim(id: string, field: keyof TimPenyusunRow, value: string) {
    setTimList(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('/api/lkps/identitas')
      if (res.ok) {
        const data = await res.json()
        if (data.identitas) {
          setIdentitas({
            namaPT: data.identitas.namaPT || '',
            namaUPPS: data.identitas.namaUPPS || '',
            jenisProgram: data.identitas.jenisProgram || 'Vokasi',
            namaProdi: data.identitas.namaProdi || '',
            alamat: data.identitas.alamat || '',
            noSkPendirianPT: data.identitas.noSkPendirianPT || '',
            tanggalSkPT: data.identitas.tanggalSkPT ? data.identitas.tanggalSkPT.split('T')[0] : '',
            noSkPembukaanPS: data.identitas.noSkPembukaanPS || '',
            tanggalSkPS: data.identitas.tanggalSkPS ? data.identitas.tanggalSkPS.split('T')[0] : '',
          })
        }
        if (data.prodiList && data.prodiList.length > 0) {
          setProdiList(data.prodiList.map((p: any) => ({
            id: p.id,
            namaProdi: p.namaProdi || '',
            jenjang: p.jenjang || 'D3',
            peringkatAkreditasi: p.peringkatAkreditasi || '',
            jumlahMahasiswaAktif: (p.jumlahMahasiswaAktif ?? 0).toString(),
          })))
        }
        if (data.timList && data.timList.length > 0) {
          setTimList(data.timList.map((t: any) => ({
            id: t.id,
            nama: t.nama || '',
            nidn: t.nidn || '',
            jabatan: t.jabatan || 'Anggota Tim',
          })))
        }
      }
    } catch (err) {
      console.error('Failed to fetch Identitas data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!canEdit) return
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/identitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identitas, prodiList, timList }),
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
      <JudulHalaman judul="Identitas & Tim Penyusun" />
      <div className="page-content animate-fade-in">
        <div style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Identitas Pengusul & Tim Penyusun</h2>
          <p className="section-subtitle">
            Isi data identitas Program Studi, daftar prodi di bawah UPPS, dan tim penyusun dokumen LKPS.
          </p>
        </div>

        <RoleNotice module="identitas" />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--lkps-border-color)', marginBottom: '28px' }}>
          {[
            { key: 'identitas', label: 'Identitas PT & UPPS', icon: Building2 },
            { key: 'prodi', label: 'Prodi di UPPS', icon: GraduationCap },
            { key: 'tim', label: 'Tim Penyusun', icon: Users },
          ].map(tab => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--lkps-accent-blue)' : '2px solid transparent',
                  color: isActive ? 'var(--lkps-accent-blue)' : 'var(--lkps-text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'var(--lkps-transition-fast)',
                  marginBottom: '-1px',
                }}
              >
                <TabIcon size={16} strokeWidth={1.75} style={{ opacity: isActive ? 1 : 0.7 }} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Gabung LKPS G5: identitas PT/UPPS dan prodi dibaca dari data LED (hanya baca); tim penyusun tetap diisi di sini */}
        {activeTab !== 'tim' && (
          <div style={{ marginBottom: '16px' }}>
            <Petunjuk
              kunci="lkps-identitas-led"
              fungsi={<>Identitas institusi dan program studi diambil dari data LED dan hanya dapat dibaca di sini.{' '}
                {peran === 'ADMIN'
                  ? <>Ubah di <Link href="/pengaturan/institusi" className="font-medium text-primary underline-offset-4 hover:underline">Identitas institusi</Link> atau <Link href="/pengaturan/prodi" className="font-medium text-primary underline-offset-4 hover:underline">Program studi</Link>.</>
                  : peran === 'TIM_PRODI'
                    ? <>Ubah di <Link href="/led/identitas-prodi" className="font-medium text-primary underline-offset-4 hover:underline">Identitas prodi</Link>.</>
                    : null}
              </>}
              langkah={[]}
            />
          </div>
        )}

        {/* Tab: Identitas PT */}
        {activeTab === 'identitas' && (
          <div className="card animate-fade-in">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconBadge color="blue" size="md">
                  <Building size={20} strokeWidth={1.75} />
                </IconBadge>
                <div>
                  <div className="card-title">Data Identitas PT & UPPS</div>
                  <div className="card-subtitle">Sesuai SK Pendirian dari Kemendikbudristek</div>
                </div>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '18px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Perguruan Tinggi <span className="required">*</span></label>
                <input className="form-input" placeholder="Contoh: Universitas Teknik Nusantara"
                  disabled
                  value={identitas.namaPT} onChange={e => setIdentitas(p => ({ ...p, namaPT: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama UPPS (Fakultas/Departemen) <span className="required">*</span></label>
                <input className="form-input" placeholder="Contoh: Fakultas Teknik"
                  disabled
                  value={identitas.namaUPPS} onChange={e => setIdentitas(p => ({ ...p, namaUPPS: e.target.value }))} />
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '18px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Program Studi <span className="required">*</span></label>
                <input className="form-input" placeholder="Contoh: Teknik Elektro"
                  disabled
                  value={identitas.namaProdi} onChange={e => setIdentitas(p => ({ ...p, namaProdi: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Jenis Program <span className="required">*</span></label>
                <select className="form-select"
                  disabled
                  value={identitas.jenisProgram} onChange={e => setIdentitas(p => ({ ...p, jenisProgram: e.target.value }))}>
                  <option value="Vokasi">Vokasi</option>
                  <option value="Akademik">Akademik</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Alamat Perguruan Tinggi</label>
              <textarea className="form-textarea" placeholder="Jl. contoh No. 1, Kota, Provinsi"
                disabled
                value={identitas.alamat} onChange={e => setIdentitas(p => ({ ...p, alamat: e.target.value }))} rows={2} />
            </div>

            <hr className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <IconBadge color="cyan" size="sm">
                <FileCheck size={16} strokeWidth={1.75} />
              </IconBadge>
              <div className="card-title">SK Pendirian Perguruan Tinggi</div>
            </div>

            <div className="form-row" style={{ marginBottom: '18px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nomor SK Pendirian PT</label>
                <input className="form-input" placeholder="No. SK..."
                  disabled
                  value={identitas.noSkPendirianPT} onChange={e => setIdentitas(p => ({ ...p, noSkPendirianPT: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tanggal SK Pendirian PT</label>
                <input type="date" className="form-input"
                  disabled
                  value={identitas.tanggalSkPT} onChange={e => setIdentitas(p => ({ ...p, tanggalSkPT: e.target.value }))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nomor SK Pembukaan Prodi</label>
                <input className="form-input" placeholder="No. SK..."
                  disabled
                  value={identitas.noSkPembukaanPS} onChange={e => setIdentitas(p => ({ ...p, noSkPembukaanPS: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tanggal SK Pembukaan Prodi</label>
                <input type="date" className="form-input"
                  disabled
                  value={identitas.tanggalSkPS} onChange={e => setIdentitas(p => ({ ...p, tanggalSkPS: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Prodi di UPPS */}
        {activeTab === 'prodi' && (
          <div className="card animate-fade-in">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconBadge color="purple" size="md">
                  <School size={20} strokeWidth={1.75} />
                </IconBadge>
                <div>
                  <div className="card-title">Daftar Program Studi di bawah UPPS</div>
                  <div className="card-subtitle">Tabel 1 – Data seluruh prodi dalam UPPS beserta status akreditasi</div>
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Program Studi</th>
                    <th>Jenjang</th>
                    <th>Peringkat Akreditasi</th>
                    <th>Jml. Mahasiswa Aktif (TS)</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {prodiList.map((prodi, idx) => (
                    <tr key={prodi.id}>
                      <td style={{ color: 'var(--lkps-text-muted)', width: '40px' }}>{idx + 1}</td>
                      <td className="input-cell">
                        <input placeholder="Nama Prodi..." value={prodi.namaProdi} disabled
                          readOnly />
                      </td>
                      <td className="input-cell" style={{ width: '100px' }}>
                        <select className="form-select" style={{ padding: '6px 10px', fontSize: '13px' }}
                          disabled
                          value={prodi.jenjang}>
                          <option>D3</option><option>D4</option><option>S1</option>
                          <option>S2</option><option>S3</option>
                        </select>
                      </td>
                      <td className="input-cell" style={{ width: '180px' }}>
                        <select className="form-select" style={{ padding: '6px 10px', fontSize: '13px' }}
                          disabled
                          value={prodi.peringkatAkreditasi}>
                          <option value="">-- Pilih --</option>
                          <option>Unggul</option><option>Baik Sekali</option><option>Baik</option>
                          <option>A</option><option>B</option><option>C</option><option>Belum Terakreditasi</option>
                        </select>
                      </td>
                      <td className="input-cell" style={{ width: '180px' }}>
                        <input type="number" min="0" value={prodi.jumlahMahasiswaAktif} disabled
                          readOnly />
                      </td>
                      <td style={{ width: '60px' }}>
                        <span className="text-xs text-muted">–</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Tim Penyusun */}
        {activeTab === 'tim' && (
          <div className="card animate-fade-in">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconBadge color="emerald" size="md">
                  <Users size={20} strokeWidth={1.75} />
                </IconBadge>
                <div>
                  <div className="card-title">Tim Penyusun Dokumen LKPS</div>
                  <div className="card-subtitle">Data anggota tim penyusun beserta jabatan dan tanda tangan</div>
                </div>
              </div>
              {canEdit && (
                <button id="btn-add-tim" className="btn btn-primary btn-sm" onClick={addTim}>
                  <Plus size={15} strokeWidth={2} />
                  Tambah Anggota
                </button>
              )}
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Lengkap</th>
                    <th>NIDN/NIP</th>
                    <th>Jabatan dalam Tim</th>
                    <th>Tanda Tangan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {timList.map((t, idx) => (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--lkps-text-muted)' }}>{idx + 1}</td>
                      <td className="input-cell">
                        <input placeholder="Nama Dosen/Staf..." value={t.nama} disabled={!canEdit}
                          onChange={e => updateTim(t.id, 'nama', e.target.value)} />
                      </td>
                      <td className="input-cell" style={{ width: '150px' }}>
                        <input placeholder="0000000000" value={t.nidn} disabled={!canEdit}
                          onChange={e => updateTim(t.id, 'nidn', e.target.value)} />
                      </td>
                      <td className="input-cell">
                        <select className="form-select" style={{ padding: '6px 10px', fontSize: '13px' }}
                          disabled={!canEdit}
                          value={t.jabatan} onChange={e => updateTim(t.id, 'jabatan', e.target.value)}>
                          <option value="">-- Pilih Jabatan --</option>
                          <option>Ketua Tim Penyusun</option>
                          <option>Sekretaris</option>
                          <option>Anggota Tim</option>
                          <option>Ketua Program Studi</option>
                          <option>Dekan/Wakil Dekan</option>
                        </select>
                      </td>
                      <td style={{ width: '140px' }}>
                        {canEdit ? (
                          <label style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', background: 'rgba(79,142,247,0.08)',
                            border: '1px dashed rgba(79,142,247,0.3)', borderRadius: 'var(--lkps-radius-sm)',
                            cursor: 'pointer', fontSize: '12px', color: 'var(--lkps-accent-blue)',
                          }}>
                            <UploadCloud size={13} strokeWidth={2} />
                            Upload TTD
                            <input type="file" accept="image/*" style={{ display: 'none' }} />
                          </label>
                        ) : (
                          <span className="badge badge-gray" style={{ fontSize: '11px' }}>Tersimpan</span>
                        )}
                      </td>
                      <td>
                        {canEdit ? (
                          <button className="btn btn-danger btn-sm" onClick={() => removeTim(t.id)}
                            disabled={timList.length === 1}>
                            <Trash2 size={14} strokeWidth={1.75} />
                          </button>
                        ) : (
                          <span className="text-xs text-muted">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Save button */}
        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            {saved && (
              <div className="badge badge-emerald" style={{ fontSize: '13px', padding: '8px 14px' }}>
                <CheckCircle2 size={14} strokeWidth={2} />
                Data berhasil disimpan!
              </div>
            )}
            <button id="btn-save-identitas" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="spin" size={16} strokeWidth={2} />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={16} strokeWidth={1.75} />
                  Simpan Data
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </>
  )
}

