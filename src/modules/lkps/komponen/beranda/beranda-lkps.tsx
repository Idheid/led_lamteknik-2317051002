// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/dashboard/page.tsx.
// Gabung LKPS G5: menjadi beranda LKPS (/lkps). Data dihitung di src/modules/lkps/data/beranda.ts; bagian Tamu (data
// contoh) dibuang karena Tamu tidak membuka modul LKPS; alamat halaman di bawah /lkps.

import Link from "next/link"
import type { Peran } from "@/modules/bersama/peran"
import type { KriteriaTambahan } from "@/modules/lkps/data/beranda"
import IconBadge from "@/modules/lkps/komponen/bersama/ikon-lencana"
import {
  Layers, CheckCircle2, Edit3, Clock, Handshake, Users, UserCheck, Wallet, BookOpen, FlaskConical, HeartHandshake, Award,
  ShieldCheck, Sparkles, Lock, Zap, FileSpreadsheet, HelpCircle,
} from "lucide-react"

const KRITERIA_BAKU = [
  {
    id: 1,
    href: '/lkps/kerjasama',
    name: 'Tata Pamong, Tata Kelola & Kerjasama',
    desc: 'Data kerjasama institusional (N1/N2/N3)',
    icon: Handshake,
    colorName: 'blue' as const,
    color: '#4f8ef7',
    bgColor: 'rgba(79,142,247,0.12)',
    progress: 0,
  },
  {
    id: 2,
    href: '/lkps/mahasiswa',
    name: 'Mahasiswa',
    desc: 'Seleksi mahasiswa baru TS s/d TS-4',
    icon: Users,
    colorName: 'cyan' as const,
    color: '#06b6d4',
    bgColor: 'rgba(6,182,212,0.12)',
    progress: 0,
  },
  {
    id: 3,
    href: '/lkps/sdm',
    name: 'Sumber Daya Manusia',
    desc: 'Profil DTPS, EWMP, luaran dosen',
    icon: UserCheck,
    colorName: 'purple' as const,
    color: '#8b5cf6',
    bgColor: 'rgba(139,92,246,0.12)',
    progress: 0,
  },
  {
    id: 4,
    href: '/lkps/keuangan',
    name: 'Keuangan, Sarana & Prasarana',
    desc: 'Penggunaan dana & data laboratorium',
    icon: Wallet,
    colorName: 'emerald' as const,
    color: '#10b981',
    bgColor: 'rgba(16,185,129,0.12)',
    progress: 0,
  },
  {
    id: 5,
    href: '/lkps/pendidikan',
    name: 'Pendidikan',
    desc: 'Kurikulum, RPS, dan program MBKM',
    icon: BookOpen,
    colorName: 'amber' as const,
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.12)',
    progress: 0,
  },
  {
    id: 6,
    href: '/lkps/penelitian',
    name: 'Penelitian',
    desc: 'Pelibatan mahasiswa dalam penelitian dosen',
    icon: FlaskConical,
    colorName: 'pink' as const,
    color: '#ec4899',
    bgColor: 'rgba(236,72,153,0.12)',
    progress: 0,
  },
  {
    id: 7,
    href: '/lkps/pkm',
    name: 'Pengabdian kepada Masyarakat',
    desc: 'Pelibatan mahasiswa dalam PkM dosen',
    icon: HeartHandshake,
    colorName: 'orange' as const,
    color: '#f97316',
    bgColor: 'rgba(249,115,22,0.12)',
    progress: 0,
  },
  {
    id: 8,
    href: '/lkps/luaran',
    name: 'Luaran dan Capaian Tridharma',
    desc: 'IPK, prestasi, tracer study, luaran mahasiswa',
    icon: Award,
    colorName: 'teal' as const,
    color: '#14b8a6',
    bgColor: 'rgba(20,184,166,0.12)',
    progress: 0,
  },
  {
    id: 9,
    href: '/lkps/penjaminan',
    name: 'Sistem Penjaminan Mutu Internal',
    desc: 'Dokumen SPMI, AMI, dan siklus PPEPP',
    icon: ShieldCheck,
    colorName: 'indigo' as const,
    color: '#6366f1',
    bgColor: 'rgba(99,102,241,0.12)',
    progress: 0,
  },
]

function ProgressRing({ percent, color }: { percent: number; color: string }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--lkps-border-color)" strokeWidth="4" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {percent}%
      </text>
    </svg>
  )
}

export function BerandaLkps({
  nama, namaProdi, peran, progres, tambahan,
}: { nama: string; namaProdi: string; peran: Peran; progres: Record<number, number>; tambahan: KriteriaTambahan[] }) {
  const dynamicCriteriaList = [
    ...KRITERIA_BAKU.map((s) => ({ ...s, progress: progres[s.id] ?? 0, isCustom: false })),
    ...tambahan.map((k) => ({
      id: k.nomorUrut,
      href: `/lkps/kriteria/${k.id}`,
      name: k.nama,
      desc: k.deskripsi || `${k.jumlahTabel} tabel instrumen kriteria kustom`,
      icon: Layers,
      colorName: 'purple' as const,
      color: '#8b5cf6',
      bgColor: 'rgba(139,92,246,0.12)',
      progress: 0,
      isCustom: true,
    })),
  ]

  const totalKriteriaCount = dynamicCriteriaList.length
  const sumProgress = dynamicCriteriaList.reduce((acc, c) => acc + c.progress, 0)
  const overallProgress = totalKriteriaCount > 0 ? Math.round(sumProgress / totalKriteriaCount) : 0

  const statCards = [
    { label: 'Total Kriteria', value: String(totalKriteriaCount), icon: Layers, colorName: 'blue' as const, color: '#4f8ef7' },
    { label: 'Kriteria Selesai', value: String(dynamicCriteriaList.filter((c) => c.progress >= 100).length), icon: CheckCircle2, colorName: 'emerald' as const, color: '#10b981' },
    { label: 'Sedang Diisi', value: String(dynamicCriteriaList.filter((c) => c.progress > 0 && c.progress < 100).length), icon: Edit3, colorName: 'amber' as const, color: '#f59e0b' },
    { label: 'Belum Dimulai', value: String(dynamicCriteriaList.filter((c) => c.progress === 0).length), icon: Clock, colorName: 'rose' as const, color: '#f43f5e' },
  ]

  return (
    <div className="page-content animate-fade-in">
        {peran === 'ASESOR' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(234,88,12,0.08) 100%)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 'var(--lkps-radius-xl)',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <IconBadge color="amber" size="lg">
              <ShieldCheck size={24} />
            </IconBadge>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--lkps-text-primary)' }}>
                Mode reviewer LPMPP – hanya baca
              </div>
              <div style={{ fontSize: '13px', color: 'var(--lkps-text-secondary)', marginTop: '2px' }}>
                Anda membaca LKPS program studi yang LED-nya ditugaskan kepada Anda. Semua isian terkunci.
              </div>
            </div>
          </div>
        )}

        <div style={{
          background: 'linear-gradient(135deg, rgba(79,142,247,0.12) 0%, rgba(139,92,246,0.08) 100%)',
          border: '1px solid rgba(79,142,247,0.2)',
          borderRadius: 'var(--lkps-radius-xl)',
          padding: '28px 32px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>
                Selamat datang, {nama}!
              </h1>
              <IconBadge color="amber" size="sm">
                <Sparkles size={16} strokeWidth={2} />
              </IconBadge>
            </div>
            <p style={{ color: 'var(--lkps-text-secondary)', fontSize: '14px' }}>
              <>
                Menampilkan data LKPS Program Studi:{' '}
                <strong style={{ color: 'var(--lkps-accent-blue)' }}>{namaProdi}</strong>.
              </>
            </p>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '42px', fontWeight: 800, background: 'var(--lkps-gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {overallProgress}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--lkps-text-secondary)', marginTop: '4px' }}>Progres Keseluruhan</div>
            <div className="progress-bar-container" style={{ marginTop: '8px', width: '120px' }}>
              <div className="progress-bar-fill" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid-4" style={{ marginBottom: '28px' }}>
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="stat-card">
                <IconBadge color={stat.colorName} size="md" style={{ marginBottom: '16px' }}>
                  <Icon size={20} strokeWidth={1.75} />
                </IconBadge>
                <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            )
          })}
        </div>

        {/* Section title */}
        {(
          <>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h2 className="section-title">{totalKriteriaCount} Kriteria Akreditasi</h2>
                <p className="section-subtitle">
                  Klik pada kartu kriteria untuk mulai mengisi data. Data yang sudah tersimpan
                  akan ditampilkan sebagai progres.
                </p>
              </div>
              {peran === 'ADMIN' && (
                <Link href="/lkps/konfigurasi" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <Layers size={14} />
                  <span>Kelola Kriteria & Tabel</span>
                </Link>
              )}
            </div>

            {/* Criteria Cards Grid */}
            <div className="criteria-grid">
              {dynamicCriteriaList.map((c) => {
                const Icon = c.icon
                return (
                  <Link key={c.id} href={c.href} className="criteria-card">
                    <div className="criteria-number" style={{ background: c.bgColor, color: c.color }}>
                      <Icon size={20} strokeWidth={1.75} />
                    </div>
                    <div className="criteria-info">
                      <div className="criteria-name">
                        K{c.id}: {c.name}
                        {c.isCustom && (
                          <span className="badge badge-purple" style={{ marginLeft: '6px', fontSize: '10px' }}>Kustom</span>
                        )}
                      </div>
                      <div className="criteria-desc">{c.desc}</div>
                      <div style={{ marginTop: '10px' }}>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${c.progress}%` }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--lkps-text-muted)', marginTop: '4px' }}>
                          {c.progress}% selesai
                        </div>
                      </div>
                    </div>
                    <ProgressRing percent={c.progress} color={c.color} />
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Info card */}
        <div className="card" style={{ marginTop: '28px' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconBadge color="blue" size="md">
                <HelpCircle size={20} strokeWidth={1.75} />
              </IconBadge>
              <div>
                <div className="card-title">Petunjuk Pengisian LKPS</div>
                <div className="card-subtitle">Modul LKPS LAM Teknik</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '13.5px' }}>
            {[
              {
                icon: Lock,
                color: 'purple' as const,
                title: 'Hak Akses Sistem',
                desc: 'Tim Prodi mengisi LKPS prodinya. Admin UPPS memantau semua prodi dan mengatur struktur kriteria & tabel. Reviewer LPMPP hanya membaca.'
              },
              {
                icon: Zap,
                color: 'amber' as const,
                title: 'Kalkulasi Otomatis',
                desc: 'Sistem menghitung rumus RK, RMD, PDTT, dan skor masa studi secara real-time.'
              },
              {
                icon: FileSpreadsheet,
                color: 'emerald' as const,
                title: 'Ekspor Excel',
                desc: 'Setelah semua data terisi, gunakan fitur Ekspor untuk menghasilkan file LKPS format LAM Teknik.'
              },
            ].map((tip) => {
              const TipIcon = tip.icon
              return (
                <div key={tip.title} style={{
                  background: 'var(--lkps-bg-secondary)',
                  borderRadius: 'var(--lkps-radius-md)',
                  padding: '18px',
                  border: '1px solid var(--lkps-border-color)',
                }}>
                  <IconBadge color={tip.color} size="sm" style={{ marginBottom: '12px' }}>
                    <TipIcon size={18} strokeWidth={1.75} />
                  </IconBadge>
                  <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--lkps-text-primary)' }}>{tip.title}</div>
                  <div style={{ color: 'var(--lkps-text-secondary)', fontSize: '12.5px', lineHeight: 1.6 }}>{tip.desc}</div>
                </div>
              )
            })}
          </div>
        </div>

    </div>
  )
}
