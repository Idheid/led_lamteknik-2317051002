"use client";
/* eslint-disable @typescript-eslint/no-explicit-any -- kode asal Ghalib dipindah apa adanya (Gabung LKPS G5); dirapikan saat G7 */

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/export/page.tsx.
// Gabung LKPS G5: dipindah ke kerangka LED (alamat /api/lkps, galat { pesan }, Header -> JudulHalaman, RoleNotice -> Petunjuk).

import { useState } from 'react'
import { JudulHalaman } from "@/components/judul-halaman"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import { FileSpreadsheet, Download, RefreshCw, CheckCircle2, Info } from 'lucide-react'

export default function HalamanEkspor() {
  const [downloading, setDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    setDownloadSuccess(false)
    try {
      const res = await fetch('/api/lkps/ekspor')
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.pesan || 'Gagal mengunduh file ekspor')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `LKPS_LAM_Teknik_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setDownloadSuccess(true)
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat ekspor')
    } finally {
      setDownloading(false)
    }
  }


  return (
    <>
      <JudulHalaman judul="Ekspor & Integrasi Dokumen" />
      <div className="page-content animate-fade-in">
        <div style={{ marginBottom: '24px' }}>
          <h2 className="section-title">Ekspor Borang LKPS</h2>
          <p className="section-subtitle">
            Unduh berkas LKPS format baku LAM Teknik (.xlsx).
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', maxWidth: '960px', margin: '0 auto' }}>
          {/* Card Ekspor Excel */}
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <IconBadge color="emerald" size="xl" glow style={{ margin: '0 auto 16px' }}>
              <FileSpreadsheet size={28} strokeWidth={1.75} />
            </IconBadge>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Unduh Berkas Excel (.xlsx)
            </h3>
            <p style={{ color: 'var(--lkps-text-secondary)', fontSize: '13px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              Mengisi otomatis data ke lembar kerja format baku <strong>LKPS_Akademik_Vokasi-1.xlsx</strong> siap diajukan ke LAM Teknik.
            </p>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 20px' }}
            >
              {downloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} strokeWidth={2} />}
              {downloading ? 'Membuat File...' : 'Unduh LKPS (.xlsx)'}
            </button>

            {downloadSuccess && (
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--lkps-accent-emerald)', fontSize: '13px' }}>
                <CheckCircle2 size={16} />
                <span>File LKPS berhasil diunduh!</span>
              </div>
            )}
          </div>

          {/* Gabung LKPS G5: kartu "Kirim ke Sistem LED" (/api/sync-led) dibuang; LED tetap membaca LKPS dari berkas yang diunggah */}
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <IconBadge color="blue" size="xl" style={{ margin: '0 auto 16px' }}>
              <Info size={28} strokeWidth={1.75} />
            </IconBadge>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Data LKPS untuk LED
            </h3>
            <p style={{ color: 'var(--lkps-text-secondary)', fontSize: '13px', margin: '0 auto', lineHeight: 1.6 }}>
              Data di modul LKPS belum dipakai LED. LED membaca LKPS dari berkas Excel/PDF yang diunggah di <strong>Data LKPS</strong> proyek LED.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

