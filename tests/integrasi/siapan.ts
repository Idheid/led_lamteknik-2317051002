/**
 * Diimpor PERTAMA oleh setiap berkas uji integrasi: arahkan DATABASE_URL ke basis data uji
 * sebelum modul @/lib/db dimuat.
 */
import "dotenv/config";
import { urlDbUji } from "../../scripts/url-db-uji";

process.env.DATABASE_URL = urlDbUji();
