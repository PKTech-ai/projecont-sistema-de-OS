import Link from "next/link";
import { cn } from "@/lib/utils";

export type PageCrumb = { label: string; href?: string };

interface PageContextNavProps {
  /** Trilha: itens com `href` são links; o último costuma ser só o título da página atual */
  items: PageCrumb[];
  className?: string;
}

/** Breadcrumb compacto (sem botão Voltar) para economizar altura no topo. */
export function PageContextNav({ items, className }: PageContextNavProps) {
  return (
    <nav
      aria-label="Navegação nesta página"
      className={cn("mb-1.5 w-full min-w-0 shrink-0 overflow-x-hidden leading-none", className)}
    >
      <ol className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5 text-[11px] text-ds-ash">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-x-1">
            {i > 0 && (
              <span className="text-ds-pebble/90 select-none" aria-hidden>
                /
              </span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="font-medium text-ds-info underline-offset-2 hover:text-ds-ink hover:underline shrink-0"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="min-w-0 font-semibold text-ds-ink truncate max-w-[min(100%,52ch)]"
                aria-current="page"
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
