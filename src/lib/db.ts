import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Satu klien Prisma per proses (dev server memuat ulang modul, jadi disimpan di globalThis). */
const globalUntukPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buatKlien(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diisi di .env");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma: PrismaClient = globalUntukPrisma.prisma ?? buatKlien();

if (process.env.NODE_ENV !== "production") globalUntukPrisma.prisma = prisma;
