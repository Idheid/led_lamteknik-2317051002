# Hitungan manual precision@k dan recall@k (fikstur T2)

Fikstur: `tests/fikstur/retrieval/label-contoh.csv`, konfigurasi `A-lama`, k sistem = 8. Uji yang mencocokkan hitungan ini:
`tests/unit/retrieval.test.ts`.

## Aturan

- Peringkat yang dinilai: peringkat gabungan (RRF) `g`. "k teratas" = potongan dengan `g ≤ k`.
- precision@k = (jumlah potongan relevan dengan `g ≤ k`) / k.
- recall@k = (jumlah potongan relevan dengan `g ≤ k`) / (jumlah semua potongan berlabel relevan di pool sub-bagian itu).
- Label kosong = belum dilabel: barisnya dilewati dan dihitung; bila muncul di k teratas dianggap tidak relevan.
- Sub-bagian tanpa satu pun label tidak dinilai. Sub-bagian tanpa potongan relevan ikut rata-rata precision, tidak ikut
  rata-rata recall.
- Rata-rata = rerata makro antar-sub-bagian.

## Sub-bagian C.1-LB

| Potongan | g | Label |
|---|---|---|
| p1 | 1 | relevan |
| p2 | 2 | tidak |
| p3 | 3 | relevan |
| p4 | 4 | tidak |
| p5 | 5 | (kosong) |
| p6 | 6 | relevan ("ya") |
| p7 | 9 | relevan |

Relevan di pool: p1, p3, p6, p7 = 4.

| k | Relevan di k teratas | precision@k | recall@k |
|---|---|---|---|
| 1 | p1 → 1 | 1/1 = 1,000 | 1/4 = 0,250 |
| 3 | p1, p3 → 2 | 2/3 = 0,667 | 2/4 = 0,500 |
| 5 | p1, p3 → 2 (p5 tanpa label) | 2/5 = 0,400 | 2/4 = 0,500 |
| 8 | p1, p3, p6 → 3 (p7 di g = 9) | 3/8 = 0,375 | 3/4 = 0,750 |

## Sub-bagian C.2-LB

q1, q2, q3 berlabel tidak relevan ("0", "0", "tidak"). Relevan di pool: 0.

- precision@1, @3, @5, @8 = 0.
- recall tidak terdefinisi (pembagi 0): tidak ikut rata-rata recall.

## Sub-bagian C.3-LB

r1 dan r2 belum dilabel: sub-bagian tidak dinilai.

## Rata-rata `A-lama`

| k | precision@k | recall@k |
|---|---|---|
| 1 | (1 + 0) / 2 = 0,500 | 0,250 (1 sub-bagian) |
| 3 | (0,667 + 0) / 2 = 0,333 | 0,500 |
| 5 | (0,4 + 0) / 2 = 0,200 | 0,500 |
| 8 | (0,375 + 0) / 2 = 0,1875 | 0,750 |

Baris tanpa label: p5, r1, r2 = 3. Sub-bagian tanpa potongan relevan: 1 (C.2-LB).
