"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck, Building2, FileSpreadsheet, FileText, FolderOpen, Home, KeyRound, Layers, LayoutDashboard,
  ListChecks, ScrollText, Settings2, UserCog, Users, Activity, ClipboardCheck, MessageSquareText, ArrowLeft, type LucideIcon,
} from "lucide-react";
import {
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/modules/bersama/utils";

export const IKON = {
  beranda: Home,
  dasbor: LayoutDashboard,
  instrumen: BookOpenCheck,
  prodi: Building2,
  akun: UserCog,
  kriteria: ListChecks,
  bab: FileText,
  lkps: FileSpreadsheet,
  dokumen: FolderOpen,
  ekspor: ScrollText,
  kunci: KeyRound,
  model: Settings2,
  proyek: Layers,
  log: Activity,
  tim: Users,
  penilaian: ClipboardCheck,
  review: MessageSquareText,
  kembali: ArrowLeft,
} satisfies Record<string, LucideIcon>;

export type NamaIkon = keyof typeof IKON;
export type StatusLencana = "belum" | "draf" | "disunting" | "selesai";

export interface ItemNav {
  judul: string;
  href: string;
  ikon: NamaIkon;
  /** Teks pendek di kiri judul, misalnya "C.3". */
  kode?: string;
  status?: StatusLencana;
  /** Fitur iterasi berikutnya: tampil redup, tidak bisa diklik. */
  segera?: boolean;
  /** Aktif hanya bila jalur sama persis. */
  persis?: boolean;
}

export interface GrupNav {
  label: string;
  item: ItemNav[];
}

const WARNA_STATUS: Record<StatusLencana, string> = {
  belum: "bg-muted-foreground/30",
  draf: "bg-amber-500",
  disunting: "bg-sky-500",
  selesai: "bg-emerald-600",
};

const LABEL_STATUS: Record<StatusLencana, string> = {
  belum: "Belum diisi",
  draf: "Draf",
  disunting: "Disunting",
  selesai: "Selesai",
};

export function NavSidebar({ grup }: { grup: GrupNav[] }) {
  const jalur = usePathname();
  return (
    <>
      {/* grup tanpa item (mis. menu LKPS admin yang belum ada) tidak ditampilkan */}
      {grup.filter((g) => g.item.length > 0).map((g) => (
        <SidebarGroup key={g.label}>
          <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {g.item.map((it) => {
                const Ikon = IKON[it.ikon];
                const aktif = it.persis ? jalur === it.href : jalur === it.href || jalur.startsWith(`${it.href}/`);
                if (it.segera) {
                  return (
                    <SidebarMenuItem key={it.href}>
                      <SidebarMenuButton disabled tooltip={`${it.judul} (iterasi berikutnya)`} className="opacity-55">
                        <Ikon aria-hidden />
                        <span>{it.judul}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge className="text-[10px] font-normal text-muted-foreground">segera</SidebarMenuBadge>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={it.href}>
                    <SidebarMenuButton asChild isActive={aktif} tooltip={it.kode ? `${it.kode} ${it.judul}` : it.judul}>
                      <Link href={it.href}>
                        <Ikon aria-hidden />
                        {it.kode && <span className="w-7 shrink-0 font-mono text-xs text-muted-foreground">{it.kode}</span>}
                        <span className="truncate">{it.judul}</span>
                      </Link>
                    </SidebarMenuButton>
                    {it.status && (
                      <SidebarMenuBadge title={LABEL_STATUS[it.status]} aria-label={`Status: ${LABEL_STATUS[it.status]}`}>
                        <span className={cn("size-2 rounded-full", WARNA_STATUS[it.status])} />
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
