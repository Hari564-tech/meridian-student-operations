import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, Columns3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export type SearchSuggestion = { label: string; hint?: string };

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Search…",
  globalFilter,
  onGlobalFilterChange,
  manualFiltering = false,
  suggestions,
  extraFilters,
  onRowClick,
  getRowId,
  getRowClassName,
  emptyTitle = "No results",
  emptyDescription = "Try changing your filters or search query.",
  onClearFilters,
  selectable,
  renderMobileCard,
  pageSize = 10,
  toolbarEnd,
  bulkActions,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  globalFilter?: string;
  onGlobalFilterChange?: (v: string) => void;
  /** Parent already filtered `data`. Don't run a second filter that drops name matches. */
  manualFiltering?: boolean;
  suggestions?: SearchSuggestion[];
  extraFilters?: ReactNode;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  getRowClassName?: (row: T) => string | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  onClearFilters?: () => void;
  selectable?: boolean;
  renderMobileCard?: (row: T) => ReactNode;
  pageSize?: number;
  toolbarEnd?: ReactNode;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [internalFilter, setInternalFilter] = useState("");
  const filter = globalFilter ?? internalFilter;
  const setFilter = onGlobalFilterChange ?? setInternalFilter;
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeSuggest, setActiveSuggest] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (query.length < 1 || !suggestions?.length) return [];
    const ranked: { item: SearchSuggestion; rank: number }[] = [];
    for (const item of suggestions) {
      const label = item.label.toLowerCase();
      const hint = (item.hint ?? "").toLowerCase();
      const starts =
        label.startsWith(query) || label.split(/\s+/).some((word) => word.startsWith(query));
      const includes = label.includes(query) || hint.includes(query);
      if (!starts && !includes) continue;
      ranked.push({ item, rank: starts ? 0 : 1 });
    }
    ranked.sort((a, b) => a.rank - b.rank || a.item.label.localeCompare(b.item.label));
    const seen = new Set<string>();
    const out: SearchSuggestion[] = [];
    for (const row of ranked) {
      const key = row.item.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row.item);
      if (out.length >= 8) break;
    }
    return out;
  }, [filter, suggestions]);

  useEffect(() => {
    setActiveSuggest(0);
  }, [filter]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSuggestOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

  function chooseSuggestion(item: SearchSuggestion) {
    setFilter(item.label);
    setSuggestOpen(false);
  }

  const cols = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!selectable) return columns;
    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      ...columns,
    ];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: cols,
    state: {
      sorting,
      columnVisibility: visibility,
      rowSelection,
      ...(manualFiltering ? {} : { globalFilter: filter }),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    globalFilterFn: "includesString",
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3">
        <div ref={searchRef} className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            onKeyDown={(e) => {
              if (!suggestOpen || matches.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveSuggest((i) => (i + 1) % matches.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveSuggest((i) => (i - 1 + matches.length) % matches.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                const pick = matches[activeSuggest] ?? matches[0];
                if (pick) chooseSuggestion(pick);
              } else if (e.key === "Escape") {
                setSuggestOpen(false);
              }
            }}
            placeholder={searchPlaceholder}
            className="h-9 w-full pl-9"
            aria-label={searchPlaceholder}
            aria-autocomplete="list"
            aria-expanded={suggestOpen && matches.length > 0}
            role="combobox"
          />
          {suggestOpen && matches.length > 0 && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-64 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-popover"
            >
              {matches.map((item, index) => (
                <li key={`${item.label}-${item.hint ?? index}`} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeSuggest}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm",
                      index === activeSuggest ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveSuggest(index)}
                    onClick={() => chooseSuggestion(item)}
                  >
                    <span className="truncate font-medium">{item.label}</span>
                    {item.hint && <span className="shrink-0 truncate text-micro text-muted-foreground">{item.hint}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {extraFilters}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                <Columns3 className="size-3.5" />
                Columns
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                  >
                    {typeof c.columnDef.header === "string" && c.columnDef.header.trim()
                      ? c.columnDef.header
                      : c.id.replace(/[_-]/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {toolbarEnd}
        </div>
      </div>

      {selectable && selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions?.(selected, () => table.resetRowSelection())}
            <Button size="xs" variant="ghost" onClick={() => table.resetRowSelection()}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {renderMobileCard && (
        <div className="grid gap-2 md:hidden">
          {table.getRowModel().rows.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} actionLabel={onClearFilters ? "Clear filters" : undefined} onAction={onClearFilters} />
          ) : (
            table.getRowModel().rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "rounded-xl bg-card p-3 shadow-card",
                  onRowClick && "cursor-pointer",
                  getRowClassName?.(row.original),
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {renderMobileCard(row.original)}
              </div>
            ))
          )}
        </div>
      )}

      <div className={cn("overflow-hidden rounded-xl bg-card shadow-card", renderMobileCard && "hidden md:block")}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.getCanSort() ? "cursor-pointer select-none" : undefined}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={cols.length}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={onClearFilters ? "Clear filters" : undefined}
                    onAction={onClearFilters}
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(onRowClick ? "cursor-pointer" : undefined, getRowClassName?.(row.original))}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">
          {(() => {
            const total = table.getFilteredRowModel().rows.length;
            if (total === 0) return "0 records";
            const { pageIndex, pageSize: size } = table.getState().pagination;
            const start = pageIndex * size + 1;
            const end = Math.min(total, (pageIndex + 1) * size);
            return `Showing ${start}–${end} of ${total}`;
          })()}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <span className="tabular-nums">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
