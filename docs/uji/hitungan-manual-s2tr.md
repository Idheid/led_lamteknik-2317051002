# Hitungan manual rumus butir angka Magister Terapan (Rencana 10 Nov T10 R3)

Sumber aturan: `docs/rumus/RUMUS-S2TR.md`. Data fiktif sama dengan `tests/unit/rumus-s2tr.test.ts`: 8 DTPS doktor
(4 Lektor Kepala, 2 bersertifikat kompetensi), 30 mahasiswa.

| Butir S2Tr | Aturan | Data uji | Skor |
| --- | --- | --- | --- |
| 26 | = Magister 26: PGBLK = (NDGB + NDLK)/NDTPS ≥ 70% → 4; 2 + 20 × PGBLK/7 | 4/8 = 50% | 3,429 |
| 29 | = Magister 28 (RBK, sama dengan Sarjana) | RBK 12 sks | 4 |
| 45 | = Magister 42: PTW ≥ 60% → 4 | 7/10 = 70% | 4 |
| 27 | PDSK ≥ 50% → 4; 1 + 6 × PDSK | 2/8 = 25% | 2,5 |
| 34 | NAPJ DTPS (4.g) ≥ 3 → 4; 1 + NAPJ | 1 | 2 |

Butir lain: 21 PPDMhs ≥ 75% (1 + 6P), 32 publikasi + pagelaran 4.e faktor 0,5/0,5/1, 33 RLP seperti Sarjana, 35 PKDTPS
≥ 30% (1 + 10P), 36 PKIB ≥ 30% (2 + 2 × PKIB(%)/30), 43 NAPJ mahasiswa ≥ 3 (1 + NAPJ), 46 publikasi + pagelaran
mahasiswa 6.e.2 faktor 0,1%/20%/70%. Butir 6, 9–11, 22, 24, 25, 30, 31, 37, 40–42, 44, 47, 49, 50 = rumus Magister.

## Asumsi perlu dikonfirmasi

| Butir | Asumsi |
| --- | --- |
| 36 | PKIB dalam persen di rumus skor (30% → 4) |
| 46 | "a = 0,1" dibaca 0,1% karena RI ditulis × 100% (Magister butir 43 tanpa × 100% memakai 0,1) |
| lainnya | sama dengan asumsi Magister dan vokasi |
