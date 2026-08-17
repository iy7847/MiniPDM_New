import React from 'react';
import { Layers, Settings2 } from 'lucide-react';
import { Button } from '../../../../design-system/Button';
import { BaseInput } from '../../../../design-system/BaseInput';

interface FilenameParserSettingsProps {
  leftGroupsCount: number;
  rightFilesCount: number;
  separatorMode: string;
  setSeparatorMode: (mode: string) => void;
  customSeparator: string;
  setCustomSeparator: (sep: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleAddFiles: (files: File[]) => void;
}

export const FilenameParserSettings: React.FC<FilenameParserSettingsProps> = ({
  leftGroupsCount,
  rightFilesCount,
  separatorMode,
  setSeparatorMode,
  customSeparator,
  setCustomSeparator,
  fileInputRef,
  handleAddFiles
}) => {
  return (
    <div className="p-4 border-b border-border-default flex flex-col gap-4 bg-bg-surface shrink-0">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Layers className="text-brand-500" size={24} />
            스마트 도면 매칭 (Visual Matcher)
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            총 {leftGroupsCount + rightFilesCount}개의 파일을 분석했습니다. 잘못 분류된 도면은 우측에서 좌측으로 드래그 앤 드롭하여 합쳐주세요.
          </p>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="file" 
            multiple 
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleAddFiles(Array.from(e.target.files));
              }
              e.target.value = ''; // Reset input
            }}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <span className="font-bold mr-1">+</span> 파일 추가
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-bg-base p-3 rounded-lg border border-border-default overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <Settings2 size={18} className="text-text-secondary" />
          <span className="text-sm font-medium text-text-primary whitespace-nowrap">도번/품명 분리 기준:</span>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <Button variant={separatorMode === 'smart' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('smart')} className="whitespace-nowrap">자동(Smart)</Button>
          <Button variant={separatorMode === 'space' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('space')} className="whitespace-nowrap">공백</Button>
          <Button variant={separatorMode === 'dash' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('dash')} className="whitespace-nowrap">-</Button>
          <Button variant={separatorMode === 'underbar' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('underbar')} className="whitespace-nowrap">_</Button>
          <Button variant={separatorMode === 'bracket' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('bracket')} className="whitespace-nowrap">괄호()[]{}</Button>
          <Button variant={separatorMode === 'custom' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('custom')} className="whitespace-nowrap">직접 입력</Button>
        </div>
        
        <div className="w-32 shrink-0">
          <BaseInput
            value={customSeparator}
            onChange={(e) => setCustomSeparator(e.target.value)}
            placeholder="예: ("
            inputClassName="py-1"
          />
        </div>
      </div>
    </div>
  );
};
