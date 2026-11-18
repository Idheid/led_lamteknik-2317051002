// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/lib/templates/types.ts. Dipindah tanpa perubahan isi (Gabung LKPS G3).
// Definisi Tipe Template Baku LKPS LAM Teknik

export interface TabelTemplateDef {
  nomorTabel: string
  sheetRef: string
  namaTabel: string
  levelPengisi: "UPPS" | "PRODI" | "BERSAMA"
  wajibUploadBukti: boolean
  targetJenjang: string
  konvensiWaktu: string
  deskripsi: string
  kolom: string[]
  dokumenBukti: string
  rumusPenilaian: string
}

export interface KriteriaTemplateDef {
  nomorUrut: number
  kode: string
  nama: string
  levelWewenang: "UPPS" | "PRODI" | "BERSAMA"
  deskripsi: string
  bobotNilai?: number
  syaratPerlu?: boolean
  tabelList: TabelTemplateDef[]
}
