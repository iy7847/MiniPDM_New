import React from 'react';
import { Box } from 'lucide-react';
import { Button } from '../../../../design-system/Button';

interface FilenameParserRightFileProps {
  file: File;
  handlePromoteToNew: (file: File) => void;
}

export const FilenameParserRightFile: React.FC<FilenameParserRightFileProps> = ({
  file,
  handlePromoteToNew
}) => {
  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ source: 'right', fileName: file.name }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-surface cursor-grab active:cursor-grabbing hover:border-brand-500 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
          <Box size={16} className="text-status-warning shrink-0" />
          <span className="truncate text-xs text-text-primary" title={file.name}>{file.name}</span>
      </div>
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={() => handlePromoteToNew(file)} 
        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 shrink-0 ml-2" 
        title="좌측 메인 리스트에 신규 품목으로 추가"
      >
        <span className="font-bold">➕</span>
      </Button>
    </div>
  );
};
