import React from 'react';
import { FileText, Box, Trash2, Scissors } from 'lucide-react';
import { Button } from '../../../../design-system/Button';
import { Badge } from '../../../../design-system/Badge';
import { BaseInput } from '../../../../design-system/BaseInput';
import { EXT_2D, EXT_3D } from '../../utils/fileMatching';

interface FilenameParserLeftGroupProps {
  group: any;
  dragHoverGroupId: string | null;
  setDragHoverGroupId: (id: string | null) => void;
  handleDropToGroup: (e: React.DragEvent, groupId: string) => void;
  handleUpdateGroup: (id: string, field: string, value: string) => void;
  handleRemoveGroup: (id: string) => void;
  handleSendToRight: (groupId: string, file: File) => void;
}

export const FilenameParserLeftGroup: React.FC<FilenameParserLeftGroupProps> = ({
  group,
  dragHoverGroupId,
  setDragHoverGroupId,
  handleDropToGroup,
  handleUpdateGroup,
  handleRemoveGroup,
  handleSendToRight
}) => {
  const files2D = group.files.filter((f: File) => EXT_2D.some(ext => f.name.toLowerCase().endsWith(ext)));
  const files3D = group.files.filter((f: File) => EXT_3D.some(ext => f.name.toLowerCase().endsWith(ext)));
  const has2D = files2D.length > 0;
  const has3D = files3D.length > 0;
  const isHovered = dragHoverGroupId === group.id;

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setDragHoverGroupId(group.id); }}
      onDragLeave={(e) => { e.preventDefault(); setDragHoverGroupId(null); }}
      onDrop={(e) => handleDropToGroup(e, group.id)}
      className={`flex flex-col p-4 rounded-lg border transition-all gap-4 ${
        isHovered ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/30' : 'border-border-default bg-bg-surface hover:border-brand-500/30'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <BaseInput 
            value={group.part_no}
            onChange={(e) => handleUpdateGroup(group.id, 'part_no', e.target.value)}
            placeholder="도번 (Part No)"
            className="w-1/3"
          />
          <BaseInput 
            value={group.part_name}
            onChange={(e) => handleUpdateGroup(group.id, 'part_name', e.target.value)}
            placeholder="품명 (Part Name)"
            className="w-2/3"
          />
        </div>
        
        <div className="flex gap-2 items-center shrink-0">
          <div className="flex gap-1.5">
            {has2D && <Badge variant="info" className="py-1 px-2"><FileText size={14} className="mr-1"/> 2D 도면</Badge>}
            {has3D && <Badge variant="warning" className="py-1 px-2"><Box size={14} className="mr-1"/> 3D 모델</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleRemoveGroup(group.id)} className="text-text-tertiary hover:text-status-danger px-2">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 pl-4 border-l-2 border-border-default/50 min-w-0">
        {/* 2D Files Column */}
        <div className="flex-1 flex flex-col gap-2 bg-bg-base/50 p-2 rounded border border-border-default/50 min-w-0">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1 shrink-0">
            <FileText size={12}/> 2D 도면
          </div>
          {files2D.length === 0 ? (
            <div className="text-xs text-text-tertiary italic p-2 text-center border border-dashed border-border-default rounded bg-bg-base/30">연결된 2D 도면 없음</div>
          ) : (
            files2D.map((f: File, i: number) => (
              <div key={i} className="text-xs text-text-primary flex items-center justify-between gap-2 bg-bg-surface p-2 rounded border border-border-default min-w-0">
                <span className="truncate flex-1 min-w-0" title={f.name}>{f.name}</span>
              </div>
            ))
          )}
        </div>

        {/* 3D Files Column */}
        <div className="flex-1 flex flex-col gap-2 bg-bg-base/50 p-2 rounded border border-border-default/50 min-w-0">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1 shrink-0">
            <Box size={12}/> 3D 모델
          </div>
          {files3D.length === 0 ? (
            <div className="text-xs text-text-tertiary italic p-2 text-center border border-dashed border-border-default rounded bg-bg-base/30">
              {isHovered ? <span className="text-brand-500 font-bold">여기에 파일을 놓으세요</span> : "연결된 3D 모델 없음"}
            </div>
          ) : (
            files3D.map((f: File, i: number) => (
              <div key={i} className="text-xs text-text-primary flex items-center justify-between gap-2 bg-bg-surface p-2 rounded border border-border-default group/file min-w-0">
                <span className="truncate flex-1 min-w-0" title={f.name}>{f.name}</span>
                <button onClick={() => handleSendToRight(group.id, f)} className="opacity-0 group-hover/file:opacity-100 text-text-tertiary hover:text-brand-500 transition-opacity p-1 shrink-0" title="우측 보관함으로 빼기">
                  <Scissors size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
