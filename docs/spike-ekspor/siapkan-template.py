"""Spike penyiapan template LEDPS: setiap sub-bagian yang diberi kode, isi template di bawah judulnya
(paragraf instruksi "Bagian ini ...", catatan biru "(Penjelasan/Data dan analisis disampaikan ...)",
paragraf kotak teks kosong, dan paragraf kosong pengatur jarak) DIGANTI satu placeholder {{kode}}.
Judul dan penomoran template tidak disentuh. Indentasi kiri paragraf instruksi dicatat ke indentasi.json
supaya narasi hasil ekspor sejajar dengan judulnya.

Contoh ini memetakan Bab I, Bab II.B, dan seluruh C.1. Versi final (iterasi 4) memetakan semua sub-bagian
berdasarkan urutan judul dan data instrumen.
Pemakaian: python siapkan-template.py <Template LEDPS>.docx template_placeholder.docx
"""
import json, re, sys, zipfile

src, dst = sys.argv[1], sys.argv[2]
z = zipfile.ZipFile(src)
doc = z.read('word/document.xml').decode('utf8')
paras = list(re.finditer(r'<w:p[ >].*?</w:p>', doc, re.S))

GAYA_JUDUL = ('IJudulBesar', 'IISubJudul', 'IISubJudulStrukturLED', 'C1DiferensiasiMisiVisi', 'Title')

def teks(p):
    return ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)).strip()

def gaya(p):
    m = re.search(r'<w:pStyle w:val="([^"]+)"', p)
    return m.group(1) if m else ''

def judul(p):
    return '<w:numPr>' in p or gaya(p) in GAYA_JUDUL

def cari(awal, teks_judul):
    for i in range(awal, len(paras)):
        if judul(paras[i].group(0)) and teks(paras[i].group(0)) == teks_judul:
            return i
    raise ValueError(f'Judul tidak ditemukan: {teks_judul}')

# (teks judul di template, kode sub-bagian) berurutan; pencarian dimulai setelah judul sebelumnya
peta = [
    ('BAB I PENDAHULUAN', 'I-1'),
    ('Analisis Lingkungan Eksternal dalam Pengembangan UPPS dan Prodi', 'II.B-1'),
    ('Latar Belakang', 'C.1-LB'),
    ('Kebijakan', 'C.1-KEB'),
    ('Kekhasan VMTS.', 'C.1-IKU-a'),
    ('Mekanisme Penyusunan VMTS', 'C.1-IKU-b'),
    ('Tingkat pemahaman dan pencapaian VMTS', 'C.1-IKU-c'),
    ('Analisis Faktor Keberhasilan dan Penghambat Pencapaian VMTS', 'C.1-AF'),
    ('Strategi perbaikan dan pengembangan (Menggunakan Analisis SWOT)', 'C.1-SWOT'),
]

ganti = []  # (indeks awal, indeks akhir, kode, indent kiri)
posisi = 0
for teks_judul, kode in peta:
    h = cari(posisi, teks_judul)
    j = h + 1
    while j < len(paras) and not judul(paras[j].group(0)):
        j += 1
    isi = list(range(h + 1, j))
    if '<w:tbl>' in doc[paras[h].end():paras[j].start()]:
        raise ValueError(f'Ada tabel di bawah {teks_judul}; tangani khusus')
    indent = 0
    for k in isi:
        p = paras[k].group(0)
        if teks(p).startswith(('Bagian ini', 'Berisi')):
            m = re.search(r'<w:ind [^>]*w:left="(\d+)"', p)
            indent = int(m.group(1)) if m else 0
            break
    ganti.append((isi[0], isi[-1], kode, indent))
    posisi = j

hasil, akhir, indentasi = [], 0, {}
for a, b, kode, indent in ganti:
    # pertahankan pemisah halaman/bagian (BAB baru mulai di halaman baru) bila ada di paragraf yang dihapus
    simpan = ''
    for k in range(a, b + 1):
        p = paras[k].group(0)
        if '<w:sectPr' in p:
            simpan += p
        elif 'w:type="page"' in p:
            simpan += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    ppr = f'<w:pPr><w:ind w:left="{indent}"/></w:pPr>' if indent else ''
    baru = f'<w:p>{ppr}<w:r><w:t xml:space="preserve">{{{{{kode}}}}}</w:t></w:r></w:p>' + simpan
    hasil += [doc[akhir:paras[a].start()], baru]
    akhir = paras[b].end()
    indentasi[kode] = indent
hasil.append(doc[akhir:])

out = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
for item in z.infolist():
    data = z.read(item.filename)
    if item.filename == 'word/document.xml':
        data = ''.join(hasil).encode('utf8')
    out.writestr(item, data)
out.close()
json.dump(indentasi, open('indentasi.json', 'w'), indent=2)
print('placeholder:', len(ganti), indentasi)
