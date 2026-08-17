import React from 'react';
import { Rnd } from 'react-rnd';
import { Move, X } from 'lucide-react';
import type { TemplateBlock } from '../../types/templateBuilder';
import { BlockPreview } from './BlockPreview';

interface RndBlockProps {
  block: TemplateBlock;
  isSelected: boolean;
  onClick: () => void;
  form: any;
  isPreview: boolean;
  updateBlock: (id: string, updates: Partial<TemplateBlock>) => void;
  deleteBlock: (id: string) => void;
}

export const RndBlock: React.FC<RndBlockProps> = ({ 
  block, isSelected, onClick, form, isPreview, updateBlock, deleteBlock 
}) => {
  if (isPreview) {
    return (
      <div style={{ position: 'absolute', left: block.x, top: block.y, width: block.width, height: block.height }}>
        <BlockPreview block={block} form={form} />
      </div>
    );
  }

  return (
    <Rnd
      size={{ width: block.width, height: block.height }}
      position={{ x: block.x, y: block.y }}
      onDragStop={(e, d) => updateBlock(block.id, { x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        updateBlock(block.id, {
          width: ref.style.width,
          height: ref.style.height,
          ...position,
        });
      }}
      bounds="parent"
      className={`absolute ${isSelected ? 'ring-2 ring-brand-500 z-50' : 'hover:ring-1 hover:ring-gray-300 z-10'}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      dragHandleClassName="drag-handle"
    >
      {isSelected && (
        <>
          <div className="drag-handle absolute -top-3 -left-3 w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center cursor-move shadow-md z-50">
            <Move className="w-3 h-3" />
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              deleteBlock(block.id);
            }}
            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md z-50 hover:bg-red-600 transition-colors"
            title="블록 삭제"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}
      <div className="w-full h-full overflow-hidden bg-white/80 backdrop-blur-sm border border-transparent">
        <BlockPreview block={block} form={form} />
      </div>
    </Rnd>
  );
};
