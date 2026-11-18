"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/mahasiswa/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim"
import { useState, useEffect } from 'react'
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran"
import { Zap, Users, Globe, CheckCircle2, Loader2, Save, Info } from 'lucide-react'

const TAHUN_LIST = ['TS', 'TS-1', 'TS-2', 'TS-3', 'TS-4']

interface SeleksiRow {
  tahun: string
  dayaTampung: number
  jumlahPendaftar: number
  jumlahLulusSeleksi: number
  mbReguler: number
  mbTransfer: number
  maReguler: number
  maTransfer: number
}

interface AsingRow {
  tahun: string
  fullTime: number
  partTime: number
}

const initSeleksi = (): SeleksiRow[] =>
  TAHUN_LIST.map(t => ({
    tahun: t, dayaTampung: 0, jumlahPendaftar: 0,
    jumlahLulusSeleksi: 0, mbReguler: 0, mbTransfer: 0,
    maReguler: 0, maTransfer: 0,
  }))

const initAsing = (): AsingRow[] =>
  ['TS', 'TS-1', 'TS-2'].map(t => ({ tahun: t, fullTime: 0, partTime: 0 }))

function hitungRMD(maReguler: number, maTransfer: number, ndtps: number): number {
  if (ndtps === 0) return 0
  return (maReguler + maTransfer) / ndtps
}

function getSkorRMD(rmd: number): { skor: number; label: string; cls: string } {
  if (rmd >= 10 && rmd <= 20) return { skor: 4, label: 'Ideal (10–20)', cls: 'score-excellent' }
  if ((rmd >= 5 && rmd < 10) || (rmd > 20 && rmd <= 30)) return { skor: 3, label: 'Baik', cls: 'score-good' }
  if (rmd > 0) return { skor: 2, label: 'Cukup', cls: 'score-average' }
  return { skor: 1, label: 'Kurang', cls: 'score-poor' }
}

function NumberInput({
  value,
  onChange,
  min = 0,
  disabled = false,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  disabled?: boolean
}) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      disabled={disabled}
      onChange={e => onChange(parseInt(e.target.value) || 0)}
      style={{
        width: '100%', minWidth: '70px',
        background: 'var(--lkps-bg-primary)', border: '1px solid var(--lkps-border-color)',
        borderRadius: 'var(--lkps-radius-sm)', color: 'var(--lkps-text-primary)',
        padding: '6px 8px', fontSize: '13px', textAlign: 'center', outline: 'none',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--lkps-accent-blue)')}
      onBlur={e => (e.target.style.borderColor = 'var(--lkps-border-color)')}
    />
  )
}

export default function HalamanMahasiswa() {
  const { canEdit } = useModulePermission('mahasiswa')
  const [activeTab, setActiveTab] = useState<'seleksi' | 'asing'>('seleksi')
  const [seleksi, setSeleksi] = useState<SeleksiRow[]>(initSeleksi())
  const [asing, setAsing] = useState<AsingRow[]>(initAsing())
  const [ndtps, setNdtps] = useState(10)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await kirimLkps('/api/lkps/mahasiswa')
      if (res.ok) {
        const data = await res.json()
        if (data.seleksi && data.seleksi.length > 0) {
          setSeleksi(TAHUN_LIST.map(t => {
            const found = data.seleksi.find((s: any) => s.tahunSemester === t)
            return {
              tahun: t,
              dayaTampung: found?.dayaTampung ?? 0,
              jumlahPendaftar: found?.jumlahPendaftar ?? 0,
              jumlahLulusSeleksi: found?.jumlahLulusSeleksi ?? 0,
              mbReguler: found?.mahasiswaBaruReguler ?? 0,
              mbTransfer: found?.mahasiswaBaruTransfer ?? 0,
              maReguler: found?.mahasiswaAktifReguler ?? 0,
              maTransfer: found?.mahasiswaAktifTransfer ?? 0,
            }
          }))
        }
        if (data.asing && data.asing.length > 0) {
          setAsing(['TS', 'TS-1', 'TS-2'].map(t => {
            const found = data.asing.find((a: any) => a.tahunSemester === t)
            return {
              tahun: t,
              fullTime: found?.jumlahFullTime ?? 0,
              partTime: found?.jumlahPartTime ?? 0,
            }
          }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch Mahasiswa data:', err)
    } finally {
      setLoading(false)
    }
  }

  function updateSeleksi(tahun: string, field: keyof SeleksiRow, value: number) {
    setSeleksi(prev => prev.map(r => r.tahun === tahun ? { ...r, [field]: value } : r))
  }

  function updateAsing(tahun: string, field: keyof AsingRow, value: number) {
    setAsing(prev => prev.map(r => r.tahun === tahun ? { ...r, [field]: value } : r))
  }

  const tsMahasiswa = seleksi.find(r => r.tahun === 'TS')
  const totalMA = (tsMahasiswa?.maReguler ?? 0) + (tsMahasiswa?.maTransfer ?? 0)
  const rmd = hitungRMD(tsMahasiswa?.maReguler ?? 0, tsMahasiswa?.maTransfer ?? 0, ndtps)
  const { skor: skorRMD, label: labelRMD, cls: clsRMD } = getSkorRMD(rmd)

  const totalAsingTS = asing.filter(r => r.tahun === 'TS').reduce((a, r) => a + r.fullTime + r.partTime, 0)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await kirimLkps('/api/lkps/mahasiswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seleksi, asing }),
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
      <JudulHalaman judul="Kriteria 2: Mahasiswa" />
      <div className="page-content animate-fade-in">

        <div style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Data Mahasiswa</h2>
          <p className="section-subtitle">
            Tabel 2.a & 2.b LKPS – Seleksi mahasiswa baru dan mahasiswa asing. Sistem otomatis menghitung RMD.
          </p>
        </div>

        <RoleNotice module="mahasiswa" />

        {/* Formula Card */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(6,182,212,0.04)', borderColor: 'rgba(6,182,212,0.15)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconBadge color="cyan" size="sm">
                <Zap size={18} strokeWidth={2} />
              </IconBadge>
              <div>
                <div className="card-title">Rasio Mahasiswa Dosen (RMD) – Real-time</div>
                <div className="card-subtitle">Dihitung dari data Mahasiswa Aktif TS dan jumlah DTPS</div>
              </div>
            </div>
            <div className={`score-display ${clsRMD}`}>
              Skor: {skorRMD}/4 – {labelRMD}
            </div>
          </div>

          <div className="formula-display" style={{ borderColor: 'rgba(6,182,212,0.2)', color: '#06b6d4' }}>
            RMD = Jumlah MA (TS) / NDTPS = {totalMA} / {ndtps} = <strong>{rmd.toFixed(2)}</strong>
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              {[
                { label: 'MA Reguler (TS)', value: tsMahasiswa?.maReguler ?? 0, color: '#06b6d4' },
                { label: 'MA Transfer (TS)', value: tsMahasiswa?.maTransfer ?? 0, color: '#4f8ef7' },
                { label: 'Total MA (TS)', value: totalMA, color: '#8b5cf6' },
                { label: 'MA Asing (TS)', value: totalAsingTS, color: '#10b981' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--lkps-text-secondary)' }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)' }}>Jumlah DTPS:</span>
              <input type="number" min="1" disabled={!canEdit} value={ndtps} onChange={e => setNdtps(parseInt(e.target.value) || 1)}
                style={{
                  width: '70px', background: 'var(--lkps-bg-primary)', border: '1px solid var(--lkps-border-color)',
                  borderRadius: 'var(--lkps-radius-sm)', color: 'var(--lkps-text-primary)', padding: '6px 10px',
                  fontSize: '14px', fontWeight: 600, textAlign: 'center',
                }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--lkps-border-color)', marginBottom: '20px' }}>
          {[
            { key: 'seleksi', label: 'Tabel 2.a – Seleksi Mahasiswa Baru', icon: Users },
            { key: 'asing', label: 'Tabel 2.b – Mahasiswa Asing', icon: Globe },
          ].map(tab => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid var(--lkps-accent-blue)' : '2px solid transparent',
                color: isActive ? 'var(--lkps-accent-blue)' : 'var(--lkps-text-secondary)',
                fontWeight: isActive ? 600 : 400, fontSize: '14px',
                cursor: 'pointer', transition: 'var(--lkps-transition-fast)', marginBottom: '-1px',
              }}>
                <TabIcon size={16} strokeWidth={1.75} style={{ opacity: isActive ? 1 : 0.7 }} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tabel 2.a Seleksi */}
        {activeTab === 'seleksi' && (
          <div className="card animate-fade-in">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconBadge color="cyan" size="md">
                  <Users size={20} strokeWidth={1.75} />
                </IconBadge>
                <div>
                  <div className="card-title">Tabel 2.a – Data Seleksi Mahasiswa Baru</div>
                  <div className="card-subtitle">Input data per tahun akademik dari TS sampai TS-4</div>
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ width: '60px' }}>Tahun</th>
                    <th rowSpan={2}>Daya Tampung</th>
                    <th rowSpan={2}>Jml. Pendaftar</th>
                    <th rowSpan={2}>Lulus Seleksi</th>
                    <th colSpan={2} style={{ textAlign: 'center', background: 'rgba(79,142,247,0.08)' }}>Mahasiswa Baru</th>
                    <th colSpan={2} style={{ textAlign: 'center', background: 'rgba(16,185,129,0.08)' }}>Mahasiswa Aktif</th>
                  </tr>
                  <tr>
                    <th style={{ background: 'rgba(79,142,247,0.05)', fontSize: '11px' }}>Reguler</th>
                    <th style={{ background: 'rgba(79,142,247,0.05)', fontSize: '11px' }}>Transfer</th>
                    <th style={{ background: 'rgba(16,185,129,0.05)', fontSize: '11px' }}>Reguler</th>
                    <th style={{ background: 'rgba(16,185,129,0.05)', fontSize: '11px' }}>Transfer</th>
                  </tr>
                </thead>
                <tbody>
                  {seleksi.map(row => (
                    <tr key={row.tahun}>
                      <td>
                        <span className="badge" style={{
                          background: row.tahun === 'TS' ? '#eff6ff' : 'var(--lkps-bg-secondary)',
                          color: row.tahun === 'TS' ? 'var(--lkps-accent-blue)' : 'var(--lkps-text-secondary)',
                          border: row.tahun === 'TS' ? '1px solid #bfdbfe' : '1px solid var(--lkps-border-color)',
                        }}>
                          {row.tahun}
                        </span>
                      </td>
                      {(['dayaTampung', 'jumlahPendaftar', 'jumlahLulusSeleksi', 'mbReguler', 'mbTransfer', 'maReguler', 'maTransfer'] as const).map(field => (
                        <td key={field} className="input-cell">
                          <NumberInput value={row[field]} disabled={!canEdit} onChange={v => updateSeleksi(row.tahun, field, v)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabel 2.b Asing */}
        {activeTab === 'asing' && (
          <div className="card animate-fade-in">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconBadge color="emerald" size="md">
                  <Globe size={20} strokeWidth={1.75} />
                </IconBadge>
                <div>
                  <div className="card-title">Tabel 2.b – Data Mahasiswa Asing</div>
                  <div className="card-subtitle">Jumlah mahasiswa asing full-time dan part-time pada TS, TS-1, TS-2</div>
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Tahun</th>
                    <th>Jumlah Mahasiswa Asing (Full-time)</th>
                    <th>Jumlah Mahasiswa Asing (Part-time)</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {asing.map(row => (
                    <tr key={row.tahun}>
                      <td>
                        <span className="badge" style={{
                          background: row.tahun === 'TS' ? '#ecfdf5' : 'var(--lkps-bg-secondary)',
                          color: row.tahun === 'TS' ? '#059669' : 'var(--lkps-text-secondary)',
                          border: row.tahun === 'TS' ? '1px solid #a7f3d0' : '1px solid var(--lkps-border-color)',
                        }}>
                          {row.tahun}
                        </span>
                      </td>
                      <td className="input-cell">
                        <NumberInput value={row.fullTime} disabled={!canEdit} onChange={v => updateAsing(row.tahun, 'fullTime', v)} />
                      </td>
                      <td className="input-cell">
                        <NumberInput value={row.partTime} disabled={!canEdit} onChange={v => updateAsing(row.tahun, 'partTime', v)} />
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: row.tahun === 'TS' ? '#10b981' : 'var(--lkps-text-primary)' }}>
                          {row.fullTime + row.partTime}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="alert alert-info" style={{ marginTop: '16px', alignItems: 'center' }}>
              <Info size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span>Mahasiswa asing full-time berkontribusi dalam perhitungan skor internasionalisasi program studi.</span>
            </div>
          </div>
        )}

        {/* Save */}
        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            {saved && (
              <div className="badge badge-emerald" style={{ fontSize: '13px', padding: '8px 14px' }}>
                <CheckCircle2 size={14} strokeWidth={2} />
                Data berhasil disimpan!
              </div>
            )}
            <button id="btn-save-mahasiswa" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="spin" size={16} strokeWidth={2} />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={16} strokeWidth={1.75} />
                  Simpan Data Mahasiswa
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

