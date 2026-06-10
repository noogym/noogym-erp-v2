import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Input, Select } from "@noogym/ui";

export const pageSizeOptions = [10, 25, 50, 100] as const;

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    pageRows: rows.slice(start, start + pageSize),
    start: rows.length ? start + 1 : 0,
    end: Math.min(start + pageSize, rows.length)
  };
}

export function ListToolbar({
  query,
  onQueryChange,
  queryPlaceholder = "Buscar...",
  pageSize,
  onPageSizeChange,
  onClear,
  children
}: {
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder?: string;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  onClear: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
      <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={queryPlaceholder} />
      <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(150px,1fr))] xl:flex xl:items-center">
        {children}
      </div>
      <div className="grid gap-3 sm:grid-cols-[160px_auto]">
        <Select aria-label="Itens por pagina" value={String(pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option} por pagina</option>)}
        </Select>
        <Button icon={<RotateCcw className="h-4 w-4" />} onClick={onClear}>
          Limpar
        </Button>
      </div>
    </div>
  );
}

export function ListPagination({
  page,
  totalPages,
  totalItems,
  start,
  end,
  label,
  onPageChange
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  start: number;
  end: number;
  label: string;
  onPageChange: (page: number) => void;
}) {
  const pages = visiblePages(page, totalPages);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
      <p>Mostrando {start} a {end} de {totalItems} {label}</p>
      <div className="flex flex-wrap items-center gap-1">
        <PageButton disabled={page <= 1} onClick={() => onPageChange(1)}>{"<<"}</PageButton>
        <PageButton disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</PageButton>
        {pages.map((item, index) => item === "..." ? (
          <span key={`${item}-${index}`} className="px-2 text-zinc-500">...</span>
        ) : (
          <PageButton key={item} active={item === page} onClick={() => onPageChange(item)}>{String(item)}</PageButton>
        ))}
        <PageButton disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Proximo</PageButton>
        <PageButton disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>{">>"}</PageButton>
      </div>
    </div>
  );
}

function visiblePages(page: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, page, page - 1, page + 1].filter((item) => item >= 1 && item <= totalPages));
  const sorted = Array.from(pages).sort((a, b) => a - b);
  return sorted.flatMap((item, index) => index > 0 && item - sorted[index - 1] > 1 ? ["..." as const, item] : [item]);
}

function PageButton({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-9 min-w-9 rounded-md border px-3 transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-noogym-lime bg-noogym-lime text-black" : "border-white/10 bg-white/[0.03] text-zinc-200 hover:border-noogym-lime/50"}`}
    >
      {children}
    </button>
  );
}
