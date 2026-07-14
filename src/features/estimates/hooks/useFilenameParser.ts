import { useState, useEffect, useCallback } from 'react';
import { hybridMatchFiles, EXT_2D, EXT_3D, cleanFileName } from '../utils/fileMatching';
import type { ParsedGroup } from '../utils/fileMatching';
import { applySeparatorToName } from '../utils/filenameParser';

export function useFilenameParser(files: File[], isOpen: boolean) {
  const [leftGroups, setLeftGroups] = useState<ParsedGroup[]>([]);
  const [rightFiles, setRightFiles] = useState<File[]>([]);
  const [dragHoverGroupId, setDragHoverGroupId] = useState<string | null>(null);
  
  const [separatorMode, setSeparatorMode] = useState<string>('smart');
  const [customSeparator, setCustomSeparator] = useState<string>('');

  // 1. 초기 자동 매칭 (2D 유무에 따라 좌우 분리)
  useEffect(() => {
    if (!isOpen) return;
    const initialGroups = hybridMatchFiles(files);
    
    const nextLeft: ParsedGroup[] = [];
    const nextRight: File[] = [];
    
    initialGroups.forEach(group => {
      const has2D = group.files.some(f => EXT_2D.some(ext => f.name.toLowerCase().endsWith(ext)));
      if (has2D) {
        nextLeft.push(group);
      } else {
        group.files.forEach(f => nextRight.push(f));
      }
    });
    
    setLeftGroups(nextLeft);
    setRightFiles(nextRight);
  }, [files, isOpen]);

  // 2. 구분자 설정이 바뀔 때 좌측 메인 리스트의 도번/품명 일괄 업데이트
  useEffect(() => {
    setLeftGroups(prev => prev.map(group => {
      const baseNames = group.files.map(f => cleanFileName(f.name).replace(/^\d+[\s_-]+/, '').trim());
      const baseName = baseNames.length > 0 ? baseNames.reduce((a, b) => a.length <= b.length ? a : b) : group.part_name || '';
      const parsed = applySeparatorToName(baseName, separatorMode, customSeparator);
      return { ...group, part_no: parsed.part_no, part_name: parsed.part_name };
    }));
  }, [separatorMode, customSeparator]);

  const handleUpdateGroup = useCallback((id: string, field: 'part_no' | 'part_name', value: string) => {
    setLeftGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  }, []);

  const handlePromoteToNew = useCallback((fileToMove: File) => {
    setRightFiles(prev => prev.filter(f => f.name !== fileToMove.name));
    
    const baseName = cleanFileName(fileToMove.name).replace(/^\d+[\s_-]+/, '').trim();
    const parsed = applySeparatorToName(baseName, separatorMode, customSeparator);
    
    setLeftGroups(prev => [...prev, {
      id: crypto.randomUUID(),
      part_no: parsed.part_no,
      part_name: parsed.part_name,
      files: [fileToMove]
    }]);
  }, [separatorMode, customSeparator]);

  const handleDropToGroup = useCallback((e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    setDragHoverGroupId(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.source === 'right') {
        const fileToMove = rightFiles.find(f => f.name === data.fileName);
        if (!fileToMove) return;
        
        setRightFiles(prev => prev.filter(f => f.name !== data.fileName));
        setLeftGroups(prev => prev.map(g => 
          g.id === targetGroupId ? { ...g, files: [...g.files, fileToMove] } : g
        ));
      }
    } catch (err) { }
  }, [rightFiles]);

  const handleSendToRight = useCallback((groupId: string, fileToMove: File) => {
    setLeftGroups(prev => {
      const groupIndex = prev.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return prev;
      
      const group = prev[groupIndex];
      const remainingFiles = group.files.filter(f => f.name !== fileToMove.name);
      
      const newGroups = [...prev];
      if (remainingFiles.length === 0) {
        newGroups.splice(groupIndex, 1);
      } else {
        newGroups[groupIndex] = { ...group, files: remainingFiles };
      }
      return newGroups;
    });
    
    setRightFiles(prev => [...prev, fileToMove]);
  }, []);

  const handleRemoveGroup = useCallback((groupId: string) => {
    setLeftGroups(prev => {
      const groupToRemove = prev.find(g => g.id === groupId);
      if (groupToRemove) {
        const files3D = groupToRemove.files.filter(f => 
          EXT_3D.some(ext => f.name.toLowerCase().endsWith(ext))
        );
        if (files3D.length > 0) {
          setRightFiles(rightPrev => [...rightPrev, ...files3D]);
        }
      }
      return prev.filter(g => g.id !== groupId);
    });
  }, []);

  const handleAddFiles = useCallback((newFiles: File[]) => {
    setLeftGroups(prevLeft => {
      const nextLeft = [...prevLeft];
      const unassignedFiles: File[] = [];

      // 1. 기존 좌측 그룹의 파일명과 비교 (cleanFileName 기반 매칭)
      newFiles.forEach(file => {
        const cleaned = cleanFileName(file.name).replace(/^\d+[\s_-]+/, '').trim();
        
        const targetGroupIndex = nextLeft.findIndex(g => {
           return g.files.some(f => cleanFileName(f.name).replace(/^\d+[\s_-]+/, '').trim() === cleaned);
        });

        if (targetGroupIndex !== -1) {
          // 이미 같은 도번의 그룹이 존재하면 병합
          nextLeft[targetGroupIndex] = {
            ...nextLeft[targetGroupIndex],
            files: [...nextLeft[targetGroupIndex].files, file]
          };
        } else {
          unassignedFiles.push(file);
        }
      });

      // 2. 기존 그룹과 매칭되지 않은 새 파일들 분류
      if (unassignedFiles.length > 0) {
        const newGroups = hybridMatchFiles(unassignedFiles);
        const additionalLeft: ParsedGroup[] = [];
        const additionalRight: File[] = [];

        newGroups.forEach(group => {
          const has2D = group.files.some(f => EXT_2D.some(ext => f.name.toLowerCase().endsWith(ext)));
          if (has2D) {
             const baseNames = group.files.map(f => cleanFileName(f.name).replace(/^\d+[\s_-]+/, '').trim());
             const baseName = baseNames.length > 0 ? baseNames.reduce((a, b) => a.length <= b.length ? a : b) : group.part_name || '';
             const parsed = applySeparatorToName(baseName, separatorMode, customSeparator);
             additionalLeft.push({ ...group, part_no: parsed.part_no, part_name: parsed.part_name });
          } else {
            group.files.forEach(f => additionalRight.push(f));
          }
        });
        
        if (additionalRight.length > 0) {
           setRightFiles(prevRight => [...prevRight, ...additionalRight]);
        }
        return [...nextLeft, ...additionalLeft];
      }
      return nextLeft;
    });
  }, [separatorMode, customSeparator]);

  return {
    leftGroups,
    rightFiles,
    dragHoverGroupId,
    setDragHoverGroupId,
    separatorMode,
    setSeparatorMode,
    customSeparator,
    setCustomSeparator,
    handleUpdateGroup,
    handlePromoteToNew,
    handleDropToGroup,
    handleSendToRight,
    handleRemoveGroup,
    handleAddFiles
  };
}
