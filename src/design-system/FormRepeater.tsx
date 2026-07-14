import { type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';

export interface FormRepeaterProps<T> {
  title?: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  addButtonText?: string;
  emptyMessage?: string;
  className?: string;
}

export function FormRepeater<T>({
  title,
  items,
  onAdd,
  onRemove,
  renderItem,
  addButtonText = '추가',
  emptyMessage = '항목이 없습니다.',
  className = '',
}: FormRepeaterProps<T>) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        {title ? (
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        ) : <div />}
        <Button variant="secondary" size="sm" onClick={onAdd} type="button" icon={<Plus className="w-4 h-4" />}>
          {addButtonText}
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed bg-bg-surface/50">
          <CardContent className="flex flex-col items-center justify-center py-8 text-text-secondary">
            <p className="text-sm">{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={index} className="relative overflow-visible group border-border-default hover:border-brand-500/50 transition-colors">
              <CardContent className="p-4 pr-12">
                {renderItem(item, index)}
              </CardContent>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-4 right-4 text-text-secondary hover:text-danger transition-colors p-1.5 rounded-md hover:bg-bg-elevated opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
