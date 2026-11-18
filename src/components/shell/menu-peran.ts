import { berandaLed, berandaPeran, type Peran } from "@/modules/bersama/peran";
import type { GrupNav, ItemNav } from "./nav-sidebar";

/**
 * Menu sidebar per peran (desain form 2, 2 Nov 2026, disesuaikan atas permintaan Adrianne): tombol LKPS | LED di kepala
 * halaman memindahkan antara fitur khusus LKPS dan khusus LED; fitur yang sama atau harus selaras untuk keduanya
 * (dashboard, program studi, akun, kunci API, instrumen, penugasan reviewer, identitas prodi) ada di grup "Bersama" yang
 * tampil di kedua modul. D4: sidebar tidak pernah mencampur grup LED dan LKPS; di halaman bersama (mis. Dashboard) yang
 * tampil adalah modul terakhir yang dibuka (cookie KUKI_MODUL, diisi tombol LKPS | LED).
 */

export type KonteksMenu = "led" | "lkps";

/** Cookie modul terakhir yang dibuka; dibaca halaman bersama supaya sidebar tetap Bersama + modul itu. */
export const KUKI_MODUL = "modul_terakhir";

export function modulDariKuki(nilai: string | undefined): KonteksMenu {
  return nilai === "lkps" ? "lkps" : "led";
}

const LABEL_BERSAMA = "Bersama (LED & LKPS)";
const LABEL_LED = "LED · Laporan Evaluasi Diri";
const LABEL_LKPS = "LKPS · Laporan Kinerja Prodi";

// ---------------------------------------------------------------- Admin UPPS

export const MENU_BERSAMA_ADMIN: GrupNav = {
  label: LABEL_BERSAMA,
  item: [
    { judul: "Dashboard akreditasi", href: "/dashboard", ikon: "dasbor" },
    { judul: "Identitas institusi", href: "/pengaturan/institusi", ikon: "institusi" },
    { judul: "Program studi", href: "/pengaturan/prodi", ikon: "prodi" },
    { judul: "Instrumen LAM Teknik", href: "/led/instrumen", ikon: "instrumen" },
    { judul: "Penugasan reviewer LPMPP", href: "/admin/penugasan", ikon: "review" },
    { judul: "Kelola akun", href: "/admin/akun", ikon: "akun" },
    { judul: "Kunci API dan model AI", href: "/admin/kunci-api", ikon: "kunci" },
  ],
};

export const MENU_LED_ADMIN: GrupNav = {
  label: LABEL_LED,
  item: [
    { judul: "Pantau LED prodi", href: "/led/pantau", ikon: "proyek" },
    { judul: "Basis Pengetahuan fakultas", href: "/led/dokumen-bersama", ikon: "dokumen" },
    { judul: "Logo sampul LED", href: "/led/logo-sampul", ikon: "gambar" },
  ],
};



// ---------------------------------------------------------------- Tim Prodi

export const MENU_BERSAMA_TIM: GrupNav = {
  label: LABEL_BERSAMA,
  item: [{ judul: "Identitas prodi", href: "/led/identitas-prodi", ikon: "prodi" }],
};

export const MENU_LED_TIM: GrupNav = {
  label: LABEL_LED,
  item: [{ judul: "LED prodi", href: "/led", ikon: "proyek", persis: true }],
};


// ---------------------------------------------------------------- Reviewer LPMPP (peran ASESOR)

export const MENU_ASESOR: GrupNav = {
  label: LABEL_LED,
  item: [{ judul: "LED ditugaskan", href: "/led/asesor", ikon: "proyek", persis: true }],
};


// ---------------------------------------------------------------- Modul LKPS (Gabung LKPS G5)

/** Kriteria 1–9 modul LKPS; alamat dan ikon dari sidebar kode asal (Achmadghalib725/LKPS_LAM-TEKNIK@c718eff). */
export const KRITERIA_LKPS: ItemNav[] = [
  { kode: "K1", judul: "Tata Pamong & Kerjasama", href: "/lkps/kerjasama", ikon: "kerjasama" },
  { kode: "K2", judul: "Mahasiswa", href: "/lkps/mahasiswa", ikon: "mahasiswa" },
  { kode: "K3", judul: "Sumber Daya Manusia", href: "/lkps/sdm", ikon: "sdm" },
  { kode: "K4", judul: "Keuangan & Sarana", href: "/lkps/keuangan", ikon: "keuangan" },
  { kode: "K5", judul: "Pendidikan", href: "/lkps/pendidikan", ikon: "pendidikan" },
  { kode: "K6", judul: "Penelitian", href: "/lkps/penelitian", ikon: "penelitian" },
  { kode: "K7", judul: "PkM", href: "/lkps/pkm", ikon: "pkm" },
  { kode: "K8", judul: "Luaran & Capaian", href: "/lkps/luaran", ikon: "luaran" },
  { kode: "K9", judul: "SPMI", href: "/lkps/penjaminan", ikon: "spmi" },
];

/** Kriteria tambahan dari konfigurasi aktif (nomor urut di luar 1–9), seperti sidebar kode asal. */
export interface KriteriaMenuLkps {
  id: string;
  kode: string;
  nama: string;
}

/**
 * Menu modul LKPS (RENCANA-GABUNG-LKPS G5 butir 3), menggantikan "Data LKPS" dan "Kelengkapan LKPS prodi". Sama untuk
 * ketiga peran; "Struktur kriteria & tabel" khusus Admin UPPS. Hak ubah tiap halaman diatur lapisan data.
 */
export function menuLkps(peran: Exclude<Peran, "TAMU">, tambahan: KriteriaMenuLkps[] = []): GrupNav {
  return {
    label: LABEL_LKPS,
    item: [
      { judul: "Beranda LKPS", href: "/lkps", ikon: "lkps", persis: true },
      { judul: "Identitas & tim", href: "/lkps/identitas", ikon: "prodi" },
      ...KRITERIA_LKPS,
      ...tambahan.map((k): ItemNav => ({ kode: k.kode.slice(0, 4), judul: k.nama, href: `/lkps/kriteria/${k.id}`, ikon: "bab" })),
      { judul: "Impor One Data", href: "/lkps/impor", ikon: "impor" },
      { judul: "Ekspor Excel", href: "/lkps/ekspor", ikon: "ekspor" },
      ...(peran === "ADMIN" ? [{ judul: "Struktur kriteria & tabel", href: "/lkps/konfigurasi", ikon: "struktur" } satisfies ItemNav] : []),
    ],
  };
}

// ---------------------------------------------------------------- Tamu (Gabung LKPS G1 = Rencana 18 Nov S1)

export const MENU_TAMU: GrupNav = {
  label: "Akreditasi",
  item: [{ judul: "Dashboard akreditasi", href: "/dashboard", ikon: "dasbor" }],
};

function grupPeran(peran: Exclude<Peran, "TAMU">): { bersama: GrupNav | null; led: GrupNav } {
  if (peran === "ADMIN") return { bersama: MENU_BERSAMA_ADMIN, led: MENU_LED_ADMIN };
  if (peran === "ASESOR") return { bersama: null, led: MENU_ASESOR };
  return { bersama: MENU_BERSAMA_TIM, led: MENU_LED_TIM };
}

/**
 * Sidebar menurut peran dan modul yang sedang dibuka: Bersama + LED atau Bersama + LKPS. `kriteriaLkps`: kriteria
 * tambahan konfigurasi LKPS aktif (diisi ShellLkps; halaman bersama tanpa daftar ini hanya menampilkan K1–K9).
 */
export function menuPeran(peran: Peran, konteks: KonteksMenu, kriteriaLkps: KriteriaMenuLkps[] = []): GrupNav[] {
  if (peran === "TAMU") return [MENU_TAMU];
  const g = grupPeran(peran);
  const modul = konteks === "lkps" ? menuLkps(peran, kriteriaLkps) : g.led;
  return g.bersama ? [g.bersama, modul] : [modul];
}

// beranda disatukan di @/modules/bersama/peran (Gabung LKPS G1); diekspor ulang untuk pemakai lama
export { berandaLed, berandaPeran };
