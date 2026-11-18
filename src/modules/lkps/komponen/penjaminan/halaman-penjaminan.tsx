"use client";
/* eslint-disable react-hooks/immutability -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/penjaminan/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim"
import { useState, useEffect } from 'react'
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran"
import { ShieldCheck, CheckCircle2, Save, Loader2, CheckCheck, ExternalLink, FileText } from 'lucide-react'

interface DokumenSpmiRow {
  id: string
  jenisDokumen: string
  tersedia: boolean
  fileDokumen: string | null
  keterangan: string
}

const defaultDokumen: DokumenSpmiRow[] = [
  { id: 'temp_1', jenisDokumen: 'Kebijakan SPMI Institusi & UPPS', tersedia: true, fileDokumen: 'https://spmi.unila.ac.id/kebijakan', keterangan: 'SK Dekan No. 102/UN26/2024' },
  { id: 'temp_2', jenisDokumen: 'Manual SPMI (PPEPP)', tersedia: true, fileDokumen: 'https://spmi.unila.ac.id/manual', keterangan: 'Manual Penetapan, Pelaksanaan, Evaluasi, Pengendalian, Peningkatan' },
  { id: 'temp_3', jenisDokumen: 'Standar SPMI (Pendidikan, Penelitian, PkM)', tersedia: true, fileDokumen: 'https://spmi.unila.ac.id/standar', keterangan: '24 Standar Nasional Dikti + 8 Standar Tambahan' },
  { id: 'temp_4', jenisDokumen: 'Formulir SPMI & Checklist Monev', tersedia: true, fileDokumen: 'https://spmi.unila.ac.id/formulir', keterangan: 'Form Audit Internal & Evaluasi Dosen' },
  { id: 'temp_5', jenisDokumen: 'Laporan Lunas Audit Mutu Internal (AMI)', tersedia: true, fileDokumen: 'https://spmi.unila.ac.id/laporan-ami', keterangan: 'Laporan AMI Siklus Terakhir (TS)' },
  { id: 'temp_6', jenisDokumen: 'Bukti Rapat Tinjauan Manajemen (RTM)', tersedia: true, fileDokumen: 'https://spmi.unila.ac.id/rtm', keterangan: 'Notulen & Daftar Hadir RTM' },
]

export default function HalamanPenjaminan() {
  const { canEdit } = useModulePermission('penjaminan')
  const [list, setList] = useState<DokumenSpmiRow[]>(defaultDokumen)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await kirimLkps('/api/lkps/penjaminan')
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          setList(data)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const kelengkapan = list.filter(d => d.tersedia).length
  const persenTersedia = list.length > 0 ? (kelengkapan / list.length) * 100 : 0

  async function handleSave() {
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/penjaminan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveDokumen', payload: { rows: list } }),
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
      <JudulHalaman judul="Kriteria 9: Penjaminan Mutu Internal (SPMI)" />
      <div className="page-content animate-fade-in">
        <div style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Sistem Penjaminan Mutu Internal (SPMI)</h2>
          <p className="section-subtitle">
            Tabel 9.a & 9.b LKPS – Kelengkapan Dokumen Kebijakan SPMI, Manual, Standar, Formulir, Laporan AMI, dan Siklus PPEPP.
          </p>
        </div>

        <RoleNotice module="penjaminan" />

        {/* Realtime Score Card */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(20,184,166,0.05)', borderColor: 'rgba(20,184,166,0.15)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconBadge icon={ShieldCheck} variant="teal" size="md" glow />
              <div>
                <div className="card-title">Evaluasi Kelengkapan SPMI & AMI – Real-time</div>
                <div className="card-subtitle">Siklus Penetapan, Pelaksanaan, Evaluasi, Pengendalian, Peningkatan (PPEPP)</div>
              </div>
            </div>
            <div className="score-display score-excellent">
              Skor SPMI: {persenTersedia === 100 ? '4.0 (Unggul)' : '3.0 (Baik)'}
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCheck size={16} className="text-emerald-400" />
            Dokumen Sahih Terverifikasi: <strong>{kelengkapan} / {list.length} Dokumen ({persenTersedia.toFixed(0)}%)</strong>
          </div>
        </div>

        {saved && (
          <div className="badge badge-emerald" style={{ marginBottom: '16px', fontSize: '13px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> Data Penjaminan Mutu berhasil disimpan!
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Checklist Dokumen & Bukti SPMI (Tabel 9 LKPS)</div>
              <div className="card-subtitle">Verifikasi ketersediaan dan tautan berkas fisik PDF</div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Jenis Dokumen SPMI / Audit</th>
                  <th>Ketersediaan</th>
                  <th>Keterangan / Nomor SK</th>
                  <th>Status File PDF</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{row.jenisDokumen}</td>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: canEdit ? 'pointer' : 'default' }}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={row.tersedia}
                          onChange={e => {
                            const val = e.target.checked
                            setList(prev => prev.map((item, i) => i === idx ? { ...item, tersedia: val } : item))
                          }}
                        />
                        {row.tersedia ? (
                          <span className="badge badge-emerald">Tersedia</span>
                        ) : (
                          <span className="badge badge-rose">Tidak Ada</span>
                        )}
                      </label>
                    </td>
                    <td>
                      <input
                        className="form-input"
                        disabled={!canEdit}
                        value={row.keterangan || ''}
                        onChange={e => {
                          const val = e.target.value
                          setList(prev => prev.map((item, i) => i === idx ? { ...item, keterangan: val } : item))
                        }}
                        placeholder="Nomor SK / Catatan..."
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <a
                          href={row.fileDokumen || 'https://spmi.unila.ac.id'}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--lkps-accent-blue)',
                            background: 'rgba(79,142,247,0.12)',
                            border: '1px solid rgba(79,142,247,0.3)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            padding: '6px 12px',
                            borderRadius: '6px',
                            width: 'fit-content',
                            fontSize: '12px'
                          }}
                          title="Klik untuk membuka/melihat dokumen PDF secara langsung"
                        >
                          <FileText size={14} />
                          <span>Lihat Berkas PDF</span>
                          <ExternalLink size={12} />
                        </a>
                        {canEdit && (
                          <input
                            className="form-input"
                            style={{ fontSize: '11px', padding: '4px 8px', maxWidth: '240px' }}
                            value={row.fileDokumen || ''}
                            onChange={e => {
                              const val = e.target.value
                              setList(prev => prev.map((item, i) => i === idx ? { ...item, fileDokumen: val } : item))
                            }}
                            placeholder="Link URL PDF / SPMI UNILA..."
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEdit && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button id="btn-save-spmi" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? 'Menyimpan...' : 'Simpan Checklist SPMI'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

