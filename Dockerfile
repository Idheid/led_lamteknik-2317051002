# Image produksi (revisi 22 Okt 2026): satu image untuk web, worker, dan migrasi. Lihat docs/PANDUAN-SERVER.md.
FROM node:22-bookworm-slim AS dasar
ENV DEBIAN_FRONTEND=noninteractive
# LibreOffice untuk menghitung halaman ekspor, font yang metriknya sama dengan Times New Roman/Arial (Liberation)
# dan Calibri/Cambria (Carlito/Caladea), serta pg_dump/pg_restore 17 (repositori PostgreSQL) untuk cadangan harian.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl libreoffice-writer-nogui \
      fonts-liberation fonts-crosextra-carlito fonts-crosextra-caladea fonts-dejavu-core \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update && apt-get install -y --no-install-recommends postgresql-client-17 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM dasar AS bangun
# nilai sementara hanya untuk build (tidak ikut ke image akhir; nilai asli dari .env.produksi saat dijalankan)
ENV DATABASE_URL=postgresql://bangun:bangun@localhost:5432/bangun BETTER_AUTH_SECRET=hanya-untuk-build-bukan-rahasia-asli NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

FROM dasar
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOME=/home/node \
    SOFFICE_PATH=/usr/bin/soffice UPLOAD_DIR=/data/unggahan CADANGAN_DIR=/cadangan
COPY --from=bangun --chown=node:node /app /app
RUN mkdir -p /data/unggahan /cadangan && chown node:node /data/unggahan /cadangan
USER node
EXPOSE 3000
CMD ["npm", "start"]
