"use client";

import { useEffect, useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IkonSibuk, TombolKonfirmasi, useAksi } from "@/components/aksi-klien";
import { formatAngka } from "@/modules/bersama/domain/teks";
import type { PerkiraanSusun } from "@/modules/led/domain/perkiraan-susun";
import { aksiPerkiraanSusun, aksiSusunSeluruh } from "../aksi";

const fmtJam = new Intl.DateTimeFormat("id-ID", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/**
 * Rencana 10 Nov T9: perkiraan dimuat saat dialog dibuka (konteks setiap sub-bagian disusun tanpa memanggil AI).
 */
function Perkiraan({ proyekId }: { proyekId: string }) {
  const [h, setH] = useState<PerkiraanSusun | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  useEffect(() => {
    let batal = false;
    aksiPerkiraanSusun(proyekId).then((r) => {
      if (batal) return;
      if (r.ok) setH(r.data);
      else setGalat(r.pesan);
    });
    return () => { batal = true; };
  }, [proyekId]);
  if (galat) return <span className="block text-xs text-muted-foreground">Perkiraan tidak tersedia: {galat}</span>;
  if (!h) return <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><IkonSibuk sibuk />Menghitung perkiraan…</span>;
  const n = (x: number) => formatAngka(x, 0);
  return (
    <span className="block space-y-1 rounded-md border bg-muted/40 p-2 text-xs text-foreground">
      <span className="block">
        <b>{n(h.jumlah.kirim)}</b> sub-bagian dikirim ke AI, <b>{n(h.jumlah.dilewati)}</b> dilewati (data dan instruksinya
        tidak berubah sejak draf terakhir), <b>{n(h.jumlah.tanpaAi)}</b> disusun tanpa AI (belum ada bukti).
      </span>
      <span className="block">
        Perkiraan permintaan AI: {n(h.permintaan.min)}–{n(h.permintaan.maks)} ({n(h.permintaan.generate)} narasi,
        {" "}{n(h.permintaan.pemeriksaan)} pemeriksaan per bagian, paling banyak {n(h.permintaan.perbaikanMaks)} perbaikan dan pemeriksaan ulang).
        Token ± {n(h.token.masuk)} masukan dan {n(h.token.keluar)} keluaran.
      </span>
      <span className="block text-muted-foreground">
        Pemakaian sejak reset terakhir: {n(h.hariIni.permintaan)} permintaan, {n(h.hariIni.tokenMasuk + h.hariIni.tokenKeluar)} token.
        Kuota harian Gemini direset {fmtJam.format(new Date(h.reset))} WIB. Model {h.model}.
      </span>
    </span>
  );
}

/**
 * Tombol "Susun seluruh LED" (revisi 31 Okt 2026, Pak Tris): menyusun draf semua bagian sekaligus, dari kriteria sampai
 * kata pengantar dan ringkasan, supaya Tim Prodi tinggal menyunting. Konfirmasi menyebut jumlah sub-bagian.
 */
export function TombolSusunSeluruh({ proyekId, bagian, jumlahSub, nonaktif, alasan, model }: {
  proyekId: string; bagian: string[]; jumlahSub: number; nonaktif: boolean; alasan: string | null; model: string;
}) {
  const { sibuk, jalankan } = useAksi();
  return (
    <div className="flex flex-col gap-1">
      <TombolKonfirmasi
        pemicu={<Button size="lg" disabled={nonaktif || sibuk || jumlahSub === 0}><IkonSibuk sibuk={sibuk} /><Wand2 aria-hidden />Susun seluruh LED</Button>}
        judul="Susun seluruh LED?"
        deskripsi={
          <>
            {jumlahSub} sub-bagian dari {bagian.length} bagian akan disusun berurutan: {bagian.join(", ")}. Sub-bagian yang sudah
            ditandai selesai dilewati. Draf yang sudah ada disimpan sebagai versi lama dan bisa dipulihkan. Penyusunan berjalan di
            latar dan bisa dibatalkan kapan saja. Disusun dengan {model}.
            <Perkiraan proyekId={proyekId} />
          </>
        }
        labelAksi="Susun sekarang"
        berbahaya={false}
        onKonfirmasi={() => jalankan(() => aksiSusunSeluruh(proyekId), { sukses: "Penyusunan seluruh LED dimulai." })}
      />
      <span className="text-xs text-muted-foreground">{alasan ?? `Disusun dengan ${model}`}</span>
    </div>
  );
}
