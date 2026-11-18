// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/app/api/onedata/sync/route.ts (UNILA_PRODI_ID_SMS).
// Gabung LKPS G6: dipindah apa adanya (disalin skrip). Bukan kredensial: id_sms adalah UUID program studi di basis data
// myUnila, dipakai sebagai saringan permintaan One Data.

/** Kata kunci nama prodi (huruf kecil) → id_sms myUnila. */
export const ID_SMS_PRODI_UNILA: Readonly<Record<string, readonly string[]>> = {
  "arsitektur": ["9F5DBDB5-5079-42DE-A6E4-4F389BA1CC1B", "049DFEAE-4912-4F62-BC83-85EC28040B51"],
  "informatika": ["FC4FC29A-85CA-47B3-8E61-3A9E9E129A88", "18B2C2D4-4FB8-4FAB-96C8-634E40D5DE8D", "E2EAA7BC-CF73-4ECC-B83A-F86E7EAA2762"],
  "elektro": ["C4B67B31-FD42-4670-BCF0-541FF1C20FF7", "3DD52981-AED9-4D6E-92E9-6732F119A6D6"],
  "mesin": ["1F0B8DCC-929E-434C-A14D-191468111154", "426C4F5C-BABD-454F-8373-758408B34F56", "E600946A-CF6B-440B-8E97-4F7D842697E7"],
  "sipil": ["AD7F4BD4-6347-4CA1-A285-2BDB4A4D61F4", "9573340A-0254-4CD9-B4AC-DD6E174BEAE9", "85A93130-D827-4A6D-B267-877D7ACDFBFC"],
  "kimia": ["151CB181-57BD-4686-8E9F-D9BBF83FEFD8"],
  "geofisika": ["6F794916-FF71-443E-AF12-28F15E160569"],
  "geodesi": ["B7C6D212-FB4E-46B0-99FB-A551B29802E7", "6832394B-91C9-41DD-AFF3-77276AD76C94"],
  "lingkungan": ["E01B3F97-75BC-4EC1-9FC5-CC874EAB60B1"],
};

/** id_sms prodi dari namanya (kata kunci pertama yang termuat), seperti `resolveIdSms` kode asal; tidak dikenal → []. */
export function idSmsProdi(namaProdi: string): readonly string[] {
  const kecil = namaProdi.toLowerCase();
  for (const [kunci, uuid] of Object.entries(ID_SMS_PRODI_UNILA)) if (kecil.includes(kunci)) return uuid;
  return [];
}
