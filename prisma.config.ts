import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // skema dipecah per modul (31 Okt 2026): prisma/schema/{bersama,led,lkps}.prisma
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
