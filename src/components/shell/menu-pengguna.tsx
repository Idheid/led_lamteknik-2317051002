"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut } from "lucide-react";
import { authClient } from "@/modules/bersama/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function inisial(nama: string): string {
  return nama.split(/\s+/).filter(Boolean).slice(0, 2).map((k) => k[0]?.toUpperCase()).join("") || "?";
}

/** Menu pengguna di kanan atas, di samping lonceng (revisi 26 Okt 2026; sebelumnya di bawah sidebar). */
export function MenuPengguna({ nama, email, peran }: { nama: string; email: string; peran: string }) {
  const router = useRouter();
  async function keluar() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted">
        <Avatar className="size-6">
          <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">{inisial(nama)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-40 truncate font-medium sm:block">{nama}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium">{nama}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
          <div className="text-xs text-muted-foreground">{peran}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/akun/ganti-sandi">
            <KeyRound aria-hidden />
            Ganti kata sandi
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={keluar}>
          <LogOut aria-hidden />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
