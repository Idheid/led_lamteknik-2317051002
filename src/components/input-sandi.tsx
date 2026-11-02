"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/modules/bersama/utils";

/** Isian kata sandi dengan tombol mata untuk menampilkan/menyembunyikan isinya. */
export function InputSandi({ className, ...props }: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [lihat, setLihat] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={lihat ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        onClick={() => setLihat((x) => !x)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        aria-pressed={lihat}
      >
        {lihat ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
