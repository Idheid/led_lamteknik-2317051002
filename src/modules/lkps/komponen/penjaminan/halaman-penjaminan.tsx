"use client";

// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/(dashboard)/penjaminan/page.tsx.
// Gabung LKPS G5: alamat /api/lkps, galat { pesan }. Gabung LKPS G7: dibuat ulang dengan komponen LED (Table, Checkbox,
// Input, Badge, toast). Daftar enam jenis dokumen, hitungan kelengkapan, rumus skor, dan aksi saveDokumen tidak berubah.
// Perbedaan:
// - daftar awal (belum ada data) tidak lagi berisi data karangan: kode asal menandai keenam dokumen "Tersedia" dengan
//   nomor SK ("SK Dekan No. 102/UN26/2024") dan tautan contoh yang ikut tersimpan bila Simpan ditekan; kini "Tidak ada",
//   keterangan dan berkas kosong;
// - berkas dokumen diunggah sebagai PDF bukti prodi (G4: `fileDokumen` harus bukti LKPS), bukan URL bebas; tombol
//   "Lihat Berkas PDF" kode asal membuka spmi.unila.ac.id bila berkas kosong, kini tertulis "Belum diunggah".

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { JudulHalaman } from "@/components/judul-halaman";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RoleNotice, { useModulePermission } from "@/modules/lkps/komponen/bersama/pemberitahuan-peran";
import { kirimLkps } from "@/modules/lkps/komponen/bersama/kirim";
import {
  KartuHitung, KartuTabel, LencanaSkor, namaDariAlamatBukti, TautanBukti, TombolSimpan, UnggahBukti,
} from "@/modules/lkps/komponen/bersama/ui-lkps";

interface DokumenSpmiRow {
  id: string;
  jenisDokumen: string;
  tersedia: boolean;
  fileDokumen: string | null;
  keterangan: string;
}

const JENIS_DOKUMEN = [
  "Kebijakan SPMI Institusi & UPPS",
  "Manual SPMI (PPEPP)",
  "Standar SPMI (Pendidikan, Penelitian, PkM)",
  "Formulir SPMI & Checklist Monev",
  "Laporan Lunas Audit Mutu Internal (AMI)",
  "Bukti Rapat Tinjauan Manajemen (RTM)",
];
const daftarAwal = (): DokumenSpmiRow[] => JENIS_DOKUMEN.map((j, i) => ({ id: `temp_${i + 1}`, jenisDokumen: j, tersedia: false, fileDokumen: null, keterangan: "" }));

export default function HalamanPenjaminan() {
  const { canEdit } = useModulePermission("penjaminan");
  const [list, setList] = useState<DokumenSpmiRow[]>(daftarAwal());
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await kirimLkps("/api/lkps/penjaminan");
    if (!res.ok) return;
    const data = (await res.json()) as DokumenSpmiRow[];
    if (data?.length) setList(data.map((d) => ({ ...d, keterangan: d.keterangan ?? "" })));
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void fetchData(), 0);
    return () => clearTimeout(id);
  }, [fetchData]);

  // Hitungan dan skor kode asal (tanpa perubahan)
  const kelengkapan = list.filter((d) => d.tersedia).length;
  const persenTersedia = list.length > 0 ? (kelengkapan / list.length) * 100 : 0;
  const skor = persenTersedia === 100 ? { skor: 4, label: "Unggul" } : { skor: 3, label: "Baik" };

  const ubah = (i: number, p: Partial<DokumenSpmiRow>) => setList((l) => l.map((d, j) => (j === i ? { ...d, ...p } : d)));

  async function simpan() {
    setSaving(true);
    try {
      const res = await kirimLkps("/api/lkps/penjaminan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveDokumen", payload: { rows: list } }),
      });
      if (res.ok) {
        await fetchData();
        toast.success("Checklist SPMI tersimpan.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <JudulHalaman
        judul="Kriteria 9: Penjaminan Mutu Internal (SPMI)"
        deskripsi="Tabel 9.a dan 9.b LKPS: kelengkapan dokumen kebijakan, manual, standar, formulir SPMI, laporan AMI, dan siklus PPEPP."
      />
      <RoleNotice module="penjaminan" />

      <KartuHitung
        judul="Kelengkapan SPMI dan AMI"
        deskripsi="Siklus penetapan, pelaksanaan, evaluasi, pengendalian, peningkatan (PPEPP); dihitung langsung dari checklist."
        skor={<LencanaSkor skor={skor.skor} label={skor.label} />}
      >
        <p className="flex items-center gap-2 text-sm">
          <CheckCheck className="size-4 text-emerald-600" aria-hidden />
          Dokumen tersedia: <strong className="tabular-nums">{kelengkapan} / {list.length} dokumen ({persenTersedia.toFixed(0)}%)</strong>
        </p>
      </KartuHitung>

      <KartuTabel nomor={9} judul="Checklist dokumen dan bukti SPMI (Tabel 9 LKPS)" deskripsi="Tandai dokumen yang tersedia dan unggah berkas PDF-nya.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">No</TableHead>
              <TableHead>Jenis dokumen SPMI / audit</TableHead>
              <TableHead>Ketersediaan</TableHead>
              <TableHead className="min-w-56">Keterangan / nomor SK</TableHead>
              <TableHead className="pr-6">Berkas PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((d, i) => (
              <TableRow key={d.id || i}>
                <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="max-w-64 font-medium whitespace-normal">{d.jenisDokumen}</TableCell>
                <TableCell>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={d.tersedia} disabled={!canEdit} aria-label={`${d.jenisDokumen} tersedia`}
                      onCheckedChange={(v) => ubah(i, { tersedia: v === true })}
                    />
                    {d.tersedia
                      ? <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Tersedia</Badge>
                      : <Badge className="bg-destructive/10 text-destructive">Tidak ada</Badge>}
                  </label>
                </TableCell>
                <TableCell>
                  {canEdit
                    ? <Input aria-label={`Keterangan ${d.jenisDokumen}`} placeholder="Nomor SK / catatan" value={d.keterangan} onChange={(e) => ubah(i, { keterangan: e.target.value })} />
                    : d.keterangan || "–"}
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex min-w-40 flex-col items-start gap-2">
                    <TautanBukti url={d.fileDokumen} nama={namaDariAlamatBukti(d.fileDokumen)} />
                    {canEdit && (
                      <UnggahBukti
                        ringkas accept="application/pdf,.pdf" label={d.fileDokumen ? "Ganti PDF" : "Unggah PDF"}
                        onTerunggah={(url) => ubah(i, { fileDokumen: url })}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </KartuTabel>

      {canEdit && (
        <div className="flex justify-end">
          <TombolSimpan sibuk={saving} onClick={() => void simpan()}>Simpan checklist SPMI</TombolSimpan>
        </div>
      )}
    </>
  );
}
