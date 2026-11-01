import { test } from "node:test";
import assert from "node:assert/strict";
import { berandaLed, berandaPeran, menuPeran, modulDariKuki } from "../../src/components/shell/menu-peran";

/** D4 (desain form 2): sidebar tidak pernah mencampur fitur LED dan LKPS; fitur bersama selalu tampil. */

const href = (peran: Parameters<typeof menuPeran>[0], k: Parameters<typeof menuPeran>[1]) =>
  menuPeran(peran, k).flatMap((g) => g.item.map((i) => i.href));

test("Admin: LED = Bersama + LED, LKPS = Bersama + LKPS", () => {
  const led = href("ADMIN", "led");
  const lkps = href("ADMIN", "lkps");
  for (const h of ["/dashboard", "/pengaturan/prodi", "/admin/akun"]) {
    assert.ok(led.includes(h) && lkps.includes(h), h);
  }
  assert.ok(led.includes("/led/pantau") && !lkps.includes("/led/pantau"));
  assert.ok(lkps.includes("/lkps") && !led.includes("/lkps"));
  assert.equal(menuPeran("ADMIN", "led").length, 2);
});

test("Tim Prodi dan reviewer: satu grup modul saja", () => {
  assert.ok(!href("TIM_PRODI", "led").includes("/lkps"));
  assert.ok(!href("TIM_PRODI", "lkps").includes("/led"));
  assert.equal(menuPeran("ASESOR", "lkps").length, 1);
});

test("beranda: Admin masuk Dashboard, tombol LED ke Pantau LED prodi", () => {
  assert.equal(berandaPeran("ADMIN"), "/dashboard");
  assert.equal(berandaLed("ADMIN"), "/led/pantau");
  assert.equal(berandaPeran("TIM_PRODI"), "/led");
  assert.equal(modulDariKuki("lkps"), "lkps");
  assert.equal(modulDariKuki(undefined), "led");
  assert.equal(modulDariKuki("lain"), "led");
});
