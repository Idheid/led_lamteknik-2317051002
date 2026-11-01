import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Satu klien Prisma per proses (dev server memuat ulang modul, jadi disimpan di globalThis). Klien yang tersimpan hanya
 * dipakai ulang bila dibuat dari kelas PrismaClient yang sama: setelah migrasi dan `prisma generate`, modul klien
 * dimuat ulang dengan kelas baru, sehingga server dev langsung mengenal tabel baru tanpa dijalankan ulang (D8: galat
 * "prisma.logoSampul undefined" di server dev yang berjalan sebelum migrasi).
 */
const globalUntukPrisma = globalThis as unknown as { prisma?: PrismaClient; kelasPrisma?: typeof PrismaClient };

function buatKlien(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diisi di .env");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// klien lama tidak diputus: modul lain (lapisan bundel berbeda) mungkin masih memakainya; hanya terjadi di dev
const tersimpan = globalUntukPrisma.kelasPrisma === PrismaClient ? globalUntukPrisma.prisma : undefined;

export const prisma: PrismaClient = tersimpan ?? buatKlien();

if (process.env.NODE_ENV !== "production") {
  globalUntukPrisma.prisma = prisma;
  globalUntukPrisma.kelasPrisma = PrismaClient;
}
