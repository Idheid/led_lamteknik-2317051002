import { prisma } from "@/modules/bersama/db";
import type { Pengguna } from "@/modules/bersama/akses";
import { pengaturanLlm } from "@/modules/bersama/data/kunci-api";
import { resetKuotaBerikutnya } from "@/modules/bersama/domain/kunci-api";
import { ambilProyek } from "@/modules/led/data/proyek";
import { susunPengguna, susunSistem } from "@/modules/led/domain/prompt";
import { perkiraanPermintaan, perkiraanToken, rincianBagian, type PerkiraanSusun } from "@/modules/led/domain/perkiraan-susun";
import {
  bolehDilewati, buatCacheKonteks, drafTanpaAi, rencanaSusun, sidikJari, sidikTerakhir, susunKonteks,
} from "@/modules/led/proses/generate";

/**
 * Rencana 10 Nov T9 (6): perkiraan sebelum "Susun seluruh LED". Konteks setiap sub-bagian disusun seperti saat generate
 * (tanpa memanggil LLM) untuk menghitung yang akan dikirim ke AI, yang dilewati karena sidik jarinya sama, dan yang
 * disusun tanpa AI; lalu perkiraan permintaan dan token, pemakaian sejak reset kuota terakhir, dan jam reset (WIB).
 */
export async function perkiraanSusun(p: Pengguna, proyekId: string): Promise<PerkiraanSusun> {
  const proyek = await ambilProyek(p, proyekId);
  const rencana = await rencanaSusun(proyek);
  const model = (await pengaturanLlm()).modelNarasi;
  const cache = buatCacheKonteks();
  const sistem = susunSistem();
  const sub: { bagian: string; status: "kirim" | "dilewati" | "tanpa_ai"; panjangMasukan: number; targetKata: number }[] = [];
  for (const b of rencana) {
    for (const kode of b.sub) {
      const k = await susunKonteks(proyek.id, kode, cache);
      const status = bolehDilewati(await sidikTerakhir(proyek.id, k.sub.id), sidikJari(k, model))
        ? "dilewati" as const
        : (await drafTanpaAi(k)) ? "tanpa_ai" as const : "kirim" as const;
      sub.push({ bagian: b.kode, status, panjangMasukan: sistem.length + susunPengguna(k.konteks).length, targetKata: k.konteks.targetKata });
    }
  }
  const sekarang = new Date();
  const reset = resetKuotaBerikutnya(sekarang);
  const sejak = new Date(reset.getTime() - 24 * 3600_000);
  const log = await prisma.logPemakaian.aggregate({
    where: { createdAt: { gte: sejak }, berhasil: true },
    _count: { _all: true },
    _sum: { tokenMasuk: true, tokenKeluar: true },
  });
  return {
    model,
    jumlah: {
      kirim: sub.filter((s) => s.status === "kirim").length,
      dilewati: sub.filter((s) => s.status === "dilewati").length,
      tanpaAi: sub.filter((s) => s.status === "tanpa_ai").length,
    },
    bagian: rincianBagian(sub),
    permintaan: perkiraanPermintaan(sub),
    token: perkiraanToken(sub),
    hariIni: { permintaan: log._count._all, tokenMasuk: log._sum.tokenMasuk ?? 0, tokenKeluar: log._sum.tokenKeluar ?? 0, sejak: sejak.toISOString() },
    reset: reset.toISOString(),
  };
}
