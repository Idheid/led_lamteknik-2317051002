/** URL basis data uji: DATABASE_URL_TEST, atau DATABASE_URL dengan nama basis data diberi akhiran _test. */
export function urlDbUji(): string {
  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST;
  const asal = process.env.DATABASE_URL;
  if (!asal) throw new Error("DATABASE_URL belum diisi di .env");
  const url = new URL(asal);
  const nama = url.pathname.replace(/^\//, "");
  url.pathname = `/${nama.endsWith("_test") ? nama : `${nama}_test`}`;
  return url.toString();
}
