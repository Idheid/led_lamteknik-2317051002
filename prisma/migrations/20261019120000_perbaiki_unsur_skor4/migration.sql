-- Revisi 19 Okt 2026: daftar cek skor 4 diambil dari deskriptor resmi yang dipecah per nomor.
-- Dua butir Sarjana 2025 berbentuk "aspek (1) s.d. (n): a; b; ..." sebelumnya terpecah salah ("S.d").
UPDATE "ButirPenilaian"
SET "unsurSkor4" = ARRAY['Dokumen legal pelaksana penjaminan mutu', 'Dokumen legal auditor independen', 'Dokumen pelaksanaan AMI', 'Dokumen RTM']
WHERE "kode" = '53-I' AND 'S.d' = ANY("unsurSkor4");

UPDATE "ButirPenilaian"
SET "unsurSkor4" = ARRAY['Instrumen sahih dan andal', 'Berkala dan terekam', 'Analisis tepat', 'Tindak lanjut', 'Reviu', 'Hasil dipublikasikan']
WHERE "kode" = '57' AND 'S.d' = ANY("unsurSkor4");
