import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Card, CardHeader, CardTitle, CardContent } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';

// Mock hook and data
type ProductionStatus = 'PENDING' | 'IN_PROGRESS' | 'QC' | 'DONE';

interface ProductionItem {
  id: string;
  itemName: string;
  process: string;
  status: ProductionStatus;
  priority: '긴급' | '일반';
}

const INITIAL_ITEMS: ProductionItem[] = [
  { id: 'item-1', itemName: 'Main Base Plate', process: '밀링', status: 'PENDING', priority: '긴급' },
  { id: 'item-2', itemName: 'Guide Shaft', process: '선반', status: 'PENDING', priority: '일반' },
  { id: 'item-3', itemName: 'Bracket Assembly', process: '용접', status: 'IN_PROGRESS', priority: '일반' },
  { id: 'item-4', itemName: 'Housing Unit', process: '가공', status: 'QC', priority: '긴급' },
];

const COLUMNS: { id: ProductionStatus; title: string }[] = [
  { id: 'PENDING', title: '대기중' },
  { id: 'IN_PROGRESS', title: '진행중' },
  { id: 'QC', title: '품질검사' },
  { id: 'DONE', title: '완료' },
];

const useProductionItems = () => {
  const [items, setItems] = useState<ProductionItem[]>(INITIAL_ITEMS);

  const updateProductionStatus = (itemId: string, newStatus: ProductionStatus) => {
    setItems((prev) => 
      prev.map((item) => item.id === itemId ? { ...item, status: newStatus } : item)
    );
  };

  return { items, updateProductionStatus };
};

export const WorkTrackingPage: React.FC = () => {
  const { items, updateProductionStatus } = useProductionItems();

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    updateProductionStatus(draggableId, destination.droppableId as ProductionStatus);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">생산 현장 관리 (Kanban)</h1>
          <p className="text-lg text-text-secondary mt-2">작업 항목을 드래그하여 상태를 변경하세요.</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 min-h-[500px] h-full items-start">
            {COLUMNS.map((column) => {
              const columnItems = items.filter(item => item.status === column.id);

              return (
                <div key={column.id} className="flex-1 min-w-[300px] max-w-sm flex flex-col h-full">
                  <Card className="flex flex-col h-full bg-bg-elevated/50 border-border-default/50">
                    <CardHeader className="py-4 border-b border-border-default/50 bg-bg-elevated rounded-t-xl">
                      <CardTitle className="text-xl flex items-center justify-between">
                        {column.title}
                        <Badge variant="default" className="px-2">{columnItems.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <CardContent
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`flex-1 overflow-y-auto p-4 space-y-4 transition-colors ${
                            snapshot.isDraggingOver ? 'bg-brand-500/5' : ''
                          }`}
                        >
                          {columnItems.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-4 rounded-xl border-2 transition-all ${
                                    snapshot.isDragging 
                                      ? 'border-brand-500 bg-bg-elevated/90 shadow-xl scale-105 z-50'
                                      : 'border-border-default bg-bg-elevated hover:border-brand-500/50 shadow-sm'
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-bold text-text-primary line-clamp-1">{item.itemName}</h3>
                                    {item.priority === '긴급' && (
                                      <Badge variant="danger" className="shrink-0 text-xs py-0">긴급</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                                    <span>공정: <strong className="text-text-primary">{item.process}</strong></span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </CardContent>
                      )}
                    </Droppable>
                  </Card>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};
