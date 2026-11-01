import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { FileText } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import type { Pengguna } from "@/modules/bersama/akses";
import { LABEL_PERAN } from "@/modules/bersama/peran";
import { MenuPengguna } from "./menu-pengguna";
import { NavSidebar, type GrupNav } from "./nav-sidebar";
import { berandaLed, type KonteksMenu } from "./menu-peran";
import { PindahModul } from "./pindah-modul";
import { Lonceng } from "./lonceng";

interface Props {
  pengguna: Pengguna;
  grup: GrupNav[];
  /** Nama di kotak atas sidebar: selalu "Akreditasi LAM Teknik" (desain form 2: satu aplikasi LED dan LKPS). */
  judul?: string;
  /** Baris kecil di bawah nama aplikasi (misalnya nama prodi). */
  subjudul: string;
  beranda: string;
  /** Konten tambahan di atas menu (misalnya pemilih proyek). */
  atasMenu?: ReactNode;
  /** Diisi halaman bersama: modul yang sidebarnya sedang tampil (tombol LKPS | LED menyala sesuai ini). */
  modul?: KonteksMenu;
  children: ReactNode;
}

/**
 * Tata letak dengan sidebar (bisa diciutkan menjadi ikon; menjadi laci di layar kecil). Kepala halaman berisi tombol
 * pindah modul LKPS | LED, lonceng (semua peran, termasuk pengingat akreditasi untuk Admin UPPS), dan menu pengguna.
 * Fitur bersama kedua modul ada di grup "Bersama" di sidebar (menu-peran.ts).
 */
export async function ShellAplikasi({ pengguna, grup, judul = "Akreditasi LAM Teknik", subjudul, beranda, atasMenu, modul, children }: Props) {
  const simpan = (await cookies()).get("sidebar_state")?.value;
  return (
    <SidebarProvider defaultOpen={simpan !== "false"}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href={beranda}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FileText className="size-4" aria-hidden />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{judul}</span>
                    <span className="truncate text-xs text-muted-foreground">{subjudul}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {atasMenu}
        </SidebarHeader>
        <SidebarContent>
          <NavSidebar grup={grup} />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      {/* min-w-0: tabel lebar tidak boleh mendorong halaman melebar keluar layar (cukup tabelnya yang bergeser) */}
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label="Ciutkan atau buka sidebar" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <PindahModul hrefLed={berandaLed(pengguna.peran)} modulBersama={modul} />
          <span className="ml-auto flex items-center gap-1">
            <Lonceng />
            <MenuPengguna nama={pengguna.nama} email={pengguna.email} peran={LABEL_PERAN[pengguna.peran]} />
          </span>
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
