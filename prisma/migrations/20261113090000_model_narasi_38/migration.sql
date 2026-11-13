-- Rencana 10 Nov T1: model narasi bawaan gemini-3.8-flash (stabil), cadangan bawaan gemini-3.5-flash-lite.
-- Hanya baris yang masih memakai bawaan lama (gemini-3-flash-preview) yang diubah; model pilihan Admin lainnya tetap.
UPDATE "PengaturanLLM"
SET "modelNarasi" = 'gemini-3.8-flash',
    "modelCadangan" = CASE
      WHEN "modelCadangan" IS NULL OR cardinality("modelCadangan") = 0 THEN ARRAY['gemini-3.5-flash-lite']
      ELSE array_remove("modelCadangan", 'gemini-3.8-flash')
    END
WHERE "modelNarasi" = 'gemini-3-flash-preview';
