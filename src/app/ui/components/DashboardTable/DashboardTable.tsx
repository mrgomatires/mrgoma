'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import { useCart } from '@/app/context/CartContext';
import { DocumentRecord } from '@/repositories/tiresRepository';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    className?: string;
  }
}

const PAGE_SIZE = 20;

function AddToCartButton({ row }: { row: DocumentRecord }) {
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    const tireId = String(row.TireId ?? '');
    const brand = String(row.Brand ?? '');
    const model = String(row.Model2 ?? '');
    const size = `${row.Height ?? ''}/${row.Width ?? ''}R${row.Size ?? ''}`;
    const name = [brand, model, size].filter(Boolean).join(' | ') || `Tire #${tireId}`;

    try {
      const res = await fetch(`/api/tire?productId=${encodeURIComponent(tireId)}`);
      const data = res.ok ? await res.json() : null;
      const priceRaw = data?.price;
      const price =
        typeof priceRaw === 'string' ? parseFloat(priceRaw) || 0 : Number(priceRaw) || 0;
      addToCart({
        id: tireId,
        code: String(row.Code ?? ''),
        name,
        price,
        brand,
        condition: row.VaultName ? `Store: ${row.VaultName}` : undefined,
        images: data?.images,
      });
    } catch {
      addToCart({ id: tireId, code: String(row.Code ?? ''), name, price: 0, brand });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Add to cart"
      className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white p-1.5 rounded-md cursor-pointer transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <polyline points="1 1 5 1 7.68 14.39 4.4 16.5 15.66 16.5 17.5 7 7 7" />
      </svg>
    </button>
  );
}

function ExpandedRow({ row }: { row: DocumentRecord }) {
  const price =
    row.Price == null || row.Price === '' || row.Price === 0
      ? '—'
      : (() => {
          const n = parseFloat(String(row.Price));
          return isNaN(n) ? '—' : `$${n.toFixed(2)}`;
        })();

  const fields = [
    { label: 'Price', value: price },
    { label: 'Store', value: row.VaultName },
    { label: 'Location', value: row.Location },
    { label: 'Model', value: row.Model2 },
    { label: 'Load', value: row.LoadIndexId },
    { label: 'Patched', value: row.Patched },
    { label: 'Tread', value: row.Tread },
    { label: 'DOT', value: row.DOT },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 bg-gray-50 text-sm">
      {fields.map(({ label, value }) => (
        <div key={label}>
          <span className="text-gray-400 text-xs uppercase tracking-wide">{label}</span>
          <p className="text-gray-700 font-medium">{value ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}

const columns: ColumnDef<DocumentRecord>[] = [
  {
    id: 'expand',
    header: '',
    enableSorting: false,
    meta: { className: 'md:hidden w-8' },
    cell: () => null, // toggle rendered manually in the row
  },
  { accessorKey: 'Code', header: 'Tire Code' },
  { accessorKey: 'Brand', header: 'Brand' },
  { accessorKey: 'VaultName', header: 'Store', meta: { className: 'hidden md:table-cell' } },
  // The shelf code. Already present on every row — the list query is `SELECT *`
  // and the recordset is cast, not projected — it simply was never rendered.
  { accessorKey: 'Location', header: 'Location', meta: { className: 'hidden md:table-cell' } },
  { accessorKey: 'Model2', header: 'Model', meta: { className: 'hidden md:table-cell' } },
  { accessorKey: 'Height', header: 'Width', meta: { className: 'hidden md:table-cell' } },
  { accessorKey: 'Width', header: 'Sidewall', meta: { className: 'hidden md:table-cell' } },
  { accessorKey: 'Size', header: 'Diameter', meta: { className: 'hidden md:table-cell' } },
  {
    id: 'sizeFormatted',
    header: 'Size',
    enableSorting: false,
    meta: { className: 'md:hidden' },
    accessorFn: row => row.RealSize || `${row.Height ?? ''}/${row.Width ?? ''}R${row.Size ?? ''}`,
  },
  { accessorKey: 'LoadIndexId', header: 'Load', meta: { className: 'hidden md:table-cell' } },
  { accessorKey: 'Patched', header: 'Patched', meta: { className: 'hidden md:table-cell' } },
  { accessorKey: 'Tread', header: 'Tread', meta: { className: 'hidden md:table-cell' } },
  { accessorKey: 'DOT', header: 'DOT', meta: { className: 'hidden md:table-cell' } },
  {
    accessorKey: 'Price',
    header: 'Price',
    meta: { className: 'hidden md:table-cell' },
    cell: ({ getValue }) => {
      const val = getValue<string | number | null>();
      if (val == null || val === '' || val === 0) return '-';
      const n = parseFloat(String(val));
      return isNaN(n) ? '-' : `$${n.toFixed(2)}`;
    },
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    cell: ({ row }) => <AddToCartButton row={row.original} />,
  },
];

const DashboardTable = () => {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DocumentRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) =>
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const fetchData = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('page', currentPage.toString());
      params.set('pageSize', PAGE_SIZE.toString());

      const res = await fetch(`/api/dashboard/tires?${params.toString()}`, {
        credentials: 'include',
      });
      const result = await res.json();
      setData(result.records ?? []);
      setTotalCount(result.totalCount ?? 0);
    } catch (err) {
      console.error('Failed to fetch dashboard tires', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // One effect for the search and the page (058). There were two — one on
  // the search params, one on the page — and both fetched page 1 on mount, so
  // every visit asked for the tire list twice. A new search goes back to page
  // 1 first and fetches once that has happened.
  const searchKey = searchParams.toString();
  const lastSearch = useRef<string | null>(null);
  useEffect(() => {
    const searchChanged = lastSearch.current !== null && lastSearch.current !== searchKey;
    lastSearch.current = searchKey;
    if (searchChanged && page !== 1) {
      setPage(1);
      return;
    }
    void fetchData(page);
  }, [searchKey, page, fetchData]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / PAGE_SIZE),
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={[
                    'px-3 py-3 font-semibold text-gray-600 whitespace-nowrap select-none',
                    header.column.getCanSort() ? 'cursor-pointer hover:text-gray-900' : '',
                    header.column.columnDef.meta?.className ?? '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <span className="text-gray-400 text-xs">
                        {{ asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] ?? '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-600" />
                  Loading...
                </div>
              </td>
            </tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                No tires found for the current filters.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.flatMap((row, i) => {
              const rowId = row.id;
              const isExpanded = expandedRows.has(rowId);

              return [
                <tr
                  key={rowId}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  {row.getVisibleCells().map(cell => {
                    if (cell.column.id === 'expand') {
                      return (
                        <td key={cell.id} className="md:hidden px-2 py-2.5">
                          <button
                            type="button"
                            onClick={() => toggleRow(rowId)}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={cell.id}
                        className={[
                          'px-3 py-2.5 text-gray-700 whitespace-nowrap',
                          cell.column.columnDef.meta?.className ?? '',
                        ].join(' ')}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>,

                // Expanded row — mobile only
                isExpanded && (
                  <tr key={`${rowId}-expanded`} className="md:hidden border-b border-gray-100">
                    <td colSpan={columns.length} className="p-0">
                      <ExpandedRow row={row.original} />
                    </td>
                  </tr>
                ),
              ].filter(Boolean);
            })
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-3 py-3 border-t border-gray-200">
        <span className="text-sm text-gray-500">
          {totalCount > 0
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount} tires`
            : 'No results'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-2 py-1 text-sm rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            «
          </button>
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 text-sm rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            ‹
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {totalPages || 1}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-2 py-1 text-sm rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            className="px-2 py-1 text-sm rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardTable;
