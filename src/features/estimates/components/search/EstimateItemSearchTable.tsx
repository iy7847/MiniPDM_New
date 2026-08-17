import React from 'react';
import { flexRender } from '@tanstack/react-table';
import type { Table as ReactTableType } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { Button } from '../../../../design-system/Button';

interface EstimateItemSearchTableProps {
  table: ReactTableType<any>;
  isLoading: boolean;
  items: any[];
  columnsCount: number;
  totalPages: number;
  page: number;
  updateParams: (params: any) => void;
}

export const EstimateItemSearchTable: React.FC<EstimateItemSearchTableProps> = ({
  table,
  isLoading,
  items,
  columnsCount,
  totalPages,
  page,
  updateParams,
}) => {
  return (
    <div className="flex-1 overflow-auto p-6 pt-4">
      <div className="border border-border-default rounded-xl overflow-hidden bg-bg-surface">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-bg-elevated border-b border-border-default text-text-muted text-xs uppercase tracking-wider">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 font-medium" style={{ width: header.getSize() !== 150 ? header.getSize() : 'auto' }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border-subtle text-text-secondary">
            {isLoading ? (
              <tr>
                <td colSpan={columnsCount} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-text-muted">
                    <Loader2 className="animate-spin mb-2" size={24} />
                    데이터를 불러오는 중...
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columnsCount} className="h-32 text-center text-text-muted">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id} 
                  className="hover:bg-bg-overlay/50 transition-colors"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 gap-2 pb-8">
          <Button 
            variant="secondary" 
            onClick={() => updateParams({ page: Math.max(1, page - 1) })}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="text-sm text-text-secondary mx-4">
            {page} / {totalPages}
          </span>
          <Button 
            variant="secondary" 
            onClick={() => updateParams({ page: Math.min(totalPages, page + 1) })}
            disabled={page === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
};
