"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
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
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted">
        <Avatar className="size-8 rounded-lg">
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{inisial(nama)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-48 text-sm leading-tight sm:grid">
          <span className="truncate font-medium">{nama}</span>
          <span className="truncate text-xs text-muted-foreground">{peran}</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
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
