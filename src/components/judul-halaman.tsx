import type { ReactNode } from "react";
import Link from "next/link";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

export interface Remah {
  label: string;
  href?: string;
}

export function JudulHalaman({
  judul, deskripsi, remah, aksi,
}: { judul: ReactNode; deskripsi?: ReactNode; remah?: Remah[]; aksi?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {remah && remah.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {remah.map((r, i) => (
              <Fragment key={`${r.label}-${i}`}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {r.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={r.href}>{r.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{r.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{judul}</h1>
          {deskripsi && <p className="max-w-3xl text-sm text-muted-foreground">{deskripsi}</p>}
        </div>
        {aksi && <div className="flex max-w-full flex-wrap gap-2">{aksi}</div>}
      </div>
    </div>
  );
}
