-- Rencana 10 Nov T5: BM25 dengan pg_textsearch 1.5.1 (butuh shared_preload_libraries = 'pg_textsearch';
-- image basis data docker/db/Dockerfile). Sintaks mengikuti README pg_textsearch v1.5.1:
-- CREATE INDEX ... USING bm25(kolom) WITH (text_config=...), kueri ORDER BY kolom <@> to_bm25query('kata', 'indeks').
-- text_config 'simple' (bukan 'indonesian': stemmer Indonesia PostgreSQL tidak konsisten, lihat CATATAN-PENGEMBANGAN).
-- k1 = 1,2 dan b = 0,75 (bawaan).
CREATE EXTENSION IF NOT EXISTS pg_textsearch;

CREATE INDEX "Potongan_teksIndeks_bm25_idx" ON "Potongan" USING bm25 ("teksIndeks") WITH (text_config = 'simple');
