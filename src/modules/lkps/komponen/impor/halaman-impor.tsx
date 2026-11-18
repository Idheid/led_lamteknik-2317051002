"use client";
/* eslint-disable @typescript-eslint/no-explicit-any -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/import/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { useState } from 'react'
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Database,
  RefreshCw,
  Globe2,
} from 'lucide-react'

export default function HalamanImpor() {
  const [file, setFile] = useState<File | null>(null)
  const [domain, setDomain] = useState<string>('auto')
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)

  const handleLiveSync = async () => {
    setSyncLoading(true)
    setError(null)
    setSyncResult(null)

    try {
      const res = await fetch('/api/lkps/onedata/sinkron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'all' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.pesan || 'Gagal sinkronisasi data prodi')

      setSyncResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSyncLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('domain', domain)

      const res = await fetch('/api/lkps/impor', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.pesan || 'Gagal memproses file')
      }

      setResult(data.result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyIngestion = async () => {
    if (!result || !result.items) return
    setApplyLoading(true)
    setError(null)
    setApplySuccess(null)

    try {
      const res = await fetch('/api/lkps/impor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          domain: result.domain,
          items: result.items,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.pesan || 'Gagal menerapkan data ke LKPS')

      setApplySuccess(data.message || 'Data berhasil disimpan ke basis data!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setApplyLoading(false)
    }
  }

  return (
    <>
      <JudulHalaman judul="Hybrid Data Ingestion" />
      <div className="page-content animate-fade-in">
        <div style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Import & Sinkronisasi One Data UNILA</h2>
          <p className="section-subtitle">
            Tarik data terbaru otomatis via API One Data UNILA (terisolasi khusus untuk program studi aktif), 
            atau unggah berkas ekspor spreadsheet (.xlsx, .csv, .json).
          </p>
        </div>

        {/* Live Sync One Data Card */}
        <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(79,142,247,0.06), rgba(6,182,212,0.06))', border: '1px solid rgba(79,142,247,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Globe2 size={20} color="#4f8ef7" />
                Sinkronisasi Langsung dari API One Data (Per Prodi)
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)', margin: '6px 0 0 0' }}>
                Hanya menarik data milik Program Studi Anda. Menghindari duplikasi dan menjaga integritas borang akreditasi.
              </p>
              <p style={{ fontSize: '11px', color: 'var(--lkps-accent-amber)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={13} />
                Catatan: API One Data hanya menyediakan metadata teks. Berkas fisik (PDF MoU, SK, Sertifikat, RPS) perlu diunggah manual pada modul masing-masing.
              </p>
            </div>
            <button
              onClick={handleLiveSync}
              disabled={syncLoading}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 20px' }}
            >
              <RefreshCw size={16} className={syncLoading ? 'animate-spin' : ''} />
              {syncLoading ? 'Menghubungkan ke One Data...' : 'Tarik Data Terbaru Prodi'}
            </button>
          </div>

          {syncResult && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--lkps-bg-card)', borderRadius: '8px', border: '1px solid var(--lkps-border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--lkps-accent-emerald)', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                <CheckCircle size={18} />
                <span>{syncResult.message}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--lkps-text-secondary)' }}>
                {Object.entries(syncResult.details || syncResult.data?.details || {}).map(([key, msg]: any) => (
                  <li key={key}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Card Form Upload */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={20} color="#4f8ef7" />
              Unggah File One Data
            </h3>

            <form onSubmit={handleUpload}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Target Domain / Modul
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="input-select"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--lkps-border-color)', background: 'var(--lkps-bg-secondary)' }}
                >
                  <option value="auto">Otomatis Deteksi Struktur Kolom</option>
                  <option value="sdm">SDM Dosen (Tabel 3.a.1 & 3.a.4)</option>
                  <option value="mahasiswa">Seleksi Mahasiswa Baru (Tabel 2.a)</option>
                  <option value="kerjasama">Kerjasama Tridharma (Tabel 1.1-1.3)</option>
                  <option value="tracer">Tracer Study & Waktu Tunggu (Tabel 8.d)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Pilih File (.xlsx, .xls, .csv, .json)
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv, .json"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px dashed var(--lkps-border-color)', background: 'var(--lkps-bg-secondary)' }}
                />
              </div>

              <button
                type="submit"
                disabled={!file || loading}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />}
                {loading ? 'Mengekstrak Data...' : 'Mulai Ekstraksi Ingestion'}
              </button>
            </form>

            {error && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--lkps-accent-rose)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '13px' }}>{error}</span>
              </div>
            )}
          </div>

          {/* Card Hasil Ingestion */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={20} color="#10b981" />
              Hasil Pemetaan Kolom Baku
            </h3>

            {result ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: 'var(--lkps-bg-secondary)', borderRadius: '8px', fontSize: '13px' }}>
                    <strong>Domain Sumber:</strong> {result.domain}
                  </div>
                  <div style={{ padding: '12px', background: 'var(--lkps-bg-secondary)', borderRadius: '8px', fontSize: '13px' }}>
                    <strong>Target LKPS:</strong> {result.kriteriaTarget} ({result.tabelTarget})
                  </div>
                  <div style={{ padding: '12px', background: 'var(--lkps-bg-secondary)', borderRadius: '8px', fontSize: '13px' }}>
                    <strong>Baris Terproses:</strong> {result.recordsProcessed} entri data
                  </div>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--lkps-border-color)', borderRadius: '8px', padding: '8px' }}>
                  <pre style={{ fontSize: '11px', margin: 0 }}>
                    {JSON.stringify(result.items.slice(0, 3), null, 2)}
                  </pre>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginTop: '6px' }}>
                  * Menampilkan preview 3 entri pertama dari total {result.recordsProcessed} baris.
                </p>

                <div style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    disabled={applyLoading}
                    onClick={handleApplyIngestion}
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    {applyLoading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {applyLoading ? 'Menerapkan ke Basis Data...' : 'Terapkan ke Basis Data LKPS'}
                  </button>
                </div>

                {applySuccess && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--lkps-accent-emerald)', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
                    <CheckCircle size={16} />
                    <span>{applySuccess}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--lkps-text-muted)' }}>
                <FileSpreadsheet size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ fontSize: '13px' }}>Belum ada berkas diekstrak. Unggah berkas One Data untuk memulai pemetaan.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
