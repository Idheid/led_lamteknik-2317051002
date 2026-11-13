import { test } from "node:test";
import assert from "node:assert/strict";
import { bagianTerdekat, barisJudul, namaDokumenKepala, susunKepala, teksIndeks } from "../../src/modules/led/domain/kepala-potongan";

/** Rencana 10 Nov T4: kepala konteks potongan (tanpa AI). */

test("kepala tersusun dari dokumen, jenis, halaman, dan bagian; bagian kosong dihilangkan", () => {
  assert.equal(
    susunKepala({ dokumen: "SK Dekan Pengembangan Dosen", jenis: "SK pengembangan dosen", halaman: 2, bagian: "Pasal 3" }),
    "Dokumen: SK Dekan Pengembangan Dosen | Jenis: SK pengembangan dosen | Hlm. 2 | Bagian: Pasal 3",
  );
  assert.equal(susunKepala({ dokumen: "Notulen rapat", jenis: null, halaman: null, bagian: null }), "Dokumen: Notulen rapat");
  assert.equal(namaDokumenKepala(null, "sk_pengembangan-dosen.pdf"), "sk pengembangan dosen");
  assert.equal(namaDokumenKepala("  Renstra FT  ", "x.pdf"), "Renstra FT");
  assert.equal(teksIndeks("Dokumen: A", "isi"), "Dokumen: A\nisi");
});

test("baris judul: bernomor atau kapital pendek; kalimat biasa bukan judul", () => {
  for (const b of ["BAB II", "BAB III KURIKULUM", "Pasal 3", "1.2 Tujuan", "2. Visi dan Misi", "MENETAPKAN", "LAMPIRAN KEPUTUSAN DEKAN", "A. Latar Belakang"]) {
    assert.ok(barisJudul(b), b);
  }
  for (const b of ["Ditetapkan di Bandar Lampung pada tanggal 3 Maret 2025.", "rapat dihadiri dosen", "12", "DAN, YANG,"]) {
    assert.ok(!barisJudul(b), b);
  }
});

test("bagian terdekat di halaman yang sama sebelum potongan (PDF, DOCX, teks OCR)", () => {
  const pdf = "KEPUTUSAN DEKAN\nNomor 12 Tahun 2025\nPasal 3\nDosen tetap wajib mengikuti pelatihan pedagogik paling sedikit sekali setahun.\nDitetapkan di Bandar Lampung.";
  assert.equal(bagianTerdekat(pdf, "Dosen tetap wajib mengikuti pelatihan pedagogik"), "Pasal 3");
  // potongan yang dimulai dengan judul memakai judul itu sendiri
  assert.equal(bagianTerdekat(pdf, "Pasal 3\nDosen tetap wajib"), "Pasal 3");
  const docx = "BAB II\nVisi program studi\n\n2.1 Tujuan\nTujuan program studi menghasilkan lulusan yang kompeten di bidang rekayasa.";
  assert.equal(bagianTerdekat(docx, "Tujuan program studi menghasilkan lulusan"), "2.1 Tujuan");
  // teks OCR: spasi dan baris kacau tetap ditemukan
  const ocr = "NOTULEN RAPAT TINJAUAN KURIKULUM\nRapat  dihadiri dosen,\nalumni, dan pengguna lulusan.";
  assert.equal(bagianTerdekat(ocr, "Rapat dihadiri dosen, alumni, dan pengguna"), "NOTULEN RAPAT TINJAUAN KURIKULUM");
});

test("bila ragu, bagian dikosongkan", () => {
  assert.equal(bagianTerdekat("Paragraf biasa tanpa judul apa pun di halaman ini, isinya kalimat.", "Paragraf biasa tanpa judul"), null);
  assert.equal(bagianTerdekat("BAB I\nteks", "potongan yang tidak ada di halaman"), null);
  assert.equal(bagianTerdekat(null, "apa saja"), null);
});
