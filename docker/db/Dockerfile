# Rencana 10 Nov T5: PostgreSQL 17 + pgvector + pg_textsearch (BM25) untuk pengembangan, produksi, dan uji integrasi.
# pg_textsearch (Tiger Data, lisensi PostgreSQL) dipasang dari paket .deb rilis resmi yang dipatok versi dan
# checksum SHA-256-nya, lalu dimuat lewat shared_preload_libraries (lihat command di docker-compose).
FROM pgvector/pgvector:pg17

ARG PG_TEXTSEARCH_VERSI=1.5.1
ARG TARGETARCH
ARG SHA256_AMD64=ed4410e8b6879a8971cd87fd03853f182e47b85b199c9bfcd9b34f159caba9fb
ARG SHA256_ARM64=e65f953e99f47c05dde88a031884cf36ea269bcb62377f554b76ddb4d13fdc3e

RUN set -eux; \
    arch="${TARGETARCH:-$(dpkg --print-architecture)}"; \
    case "$arch" in \
      amd64) sha="$SHA256_AMD64" ;; \
      arm64) sha="$SHA256_ARM64" ;; \
      *) echo "Arsitektur $arch tidak didukung pg_textsearch"; exit 1 ;; \
    esac; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl unzip; \
    curl -fsSL -o /tmp/pg_textsearch.zip \
      "https://github.com/timescale/pg_textsearch/releases/download/v${PG_TEXTSEARCH_VERSI}/pg-textsearch-v${PG_TEXTSEARCH_VERSI}-pg17-${arch}.zip"; \
    echo "${sha}  /tmp/pg_textsearch.zip" | sha256sum -c -; \
    unzip /tmp/pg_textsearch.zip -d /tmp/pg_textsearch; \
    apt-get install -y --no-install-recommends /tmp/pg_textsearch/*.deb; \
    apt-get purge -y --auto-remove curl unzip; \
    rm -rf /tmp/pg_textsearch /tmp/pg_textsearch.zip /var/lib/apt/lists/*

CMD ["postgres", "-c", "shared_preload_libraries=pg_textsearch"]
