import type { EstimateItem } from '../types';

export const EXT_2D = ['.pdf', '.dwg', '.dxf'];
export const EXT_3D = ['.step', '.stp', '.igs', '.iges', '.x_t', '.x_b', '.prt', '.sldprt', '.ipt', '.iam', '.catpart', '.catproduct', '.par', '.asm', '.psm'];

export interface ParsedGroup {
  id: string;
  part_no: string;
  part_name: string;
  files: File[];
}

/**
 * 파일명에서 확장자를 제거하고, 불필요한 꼬리말(_v2, _수정, _final 등)을 제거하여
 * 순수 도번/부품명만 추출하는 유틸리티
 */
export function cleanFileName(filename: string): string {
  // 1. 확장자 제거 (확장자가 없는 경우 원본 유지)
  const lastDotIndex = filename.lastIndexOf('.');
  let name = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
  
  // 2. 불필요한 꼬리말 제거 (대소문자 무시)
  // 예: _v1, _v2.5, -v3, _수정, -최종, _final, _rev1 등
  const tailRegex = /([_-](v\d+(\.\d+)?|수정|최종|final|rev\d+))+$/i;
  name = name.replace(tailRegex, '');
  
  // 3. 앞뒤 공백 제거
  return name.trim();
}

/**
 * 여러 File 객체가 배열로 들어왔을 때, 파일명을 파싱하여 도번(이름)이 같은 파일들을 그룹핑 (Legacy)
 */
export function groupFilesByName(files: File[]): Record<string, File[]> {
  const groups: Record<string, File[]> = {};
  
  for (const file of files) {
    const cleanedName = cleanFileName(file.name);
    if (!groups[cleanedName]) {
      groups[cleanedName] = [];
    }
    groups[cleanedName].push(file);
  }
  
  return groups;
}

/**
 * [V2 하이브리드 자동 매칭 엔진]
 * 1. 완전 일치
 * 2. 부분 일치 (포함 관계) - 오직 2D와 3D 간에만 적용
 * 3. 앞의 번호 접두사 무시
 */
export function hybridMatchFiles(files: File[]): ParsedGroup[] {
  // 1. 초기화: 모든 파일을 개별 클러스터로 만듦
  let clusters: File[][] = files.map(f => [f]);

  const getCoreName = (f: File) => {
    let name = cleanFileName(f.name);
    // 숫자로 시작하고 공백/하이픈/언더바로 이어지는 접두사 제거 (예: "1 - ", "2_")
    name = name.replace(/^\d+[\s_-]+/, '');
    return name.trim().toLowerCase();
  };

  const is2D = (f: File) => EXT_2D.some(ext => f.name.toLowerCase().endsWith(ext));

  // 2. 클러스터 병합 로직
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const clusterA = clusters[i];
        const clusterB = clusters[j];
        
        let shouldMerge = false;
        for (const fA of clusterA) {
          for (const fB of clusterB) {
            const coreA = getCoreName(fA);
            const coreB = getCoreName(fB);
            
            // 1단계: 완전 일치
            if (coreA === coreB) {
              shouldMerge = true;
              break;
            }
            
            // 2단계: 포함 관계 (길이가 일정 이상일 때만 오탐지 방지)
            if (coreA.length > 4 && coreB.length > 4) {
              if (coreA.includes(coreB) || coreB.includes(coreA)) {
                // 서로 확장자 성격(2D vs 3D)이 다를 때만 묶어줌 (유사한 이름의 3D끼리 잘못 묶이는 것 방지)
                if (is2D(fA) !== is2D(fB)) {
                  shouldMerge = true;
                  break;
                }
              }
            }
          }
          if (shouldMerge) break;
        }

        if (shouldMerge) {
          // 병합 실행
          clusters[i] = [...clusterA, ...clusterB];
          clusters.splice(j, 1);
          changed = true;
          break; // 배열 길이가 변했으므로 루프 재시작
        }
      }
      if (changed) break;
    }
  }

  // 3. ParsedGroup 형태로 변환
  return clusters.map(cluster => {
    // 가장 짧은 coreName을 기본 BaseName으로 사용 (보통 가장 공통된 핵심 부분임)
    const baseNames = cluster.map(f => {
      let n = cleanFileName(f.name);
      return n.replace(/^\d+[\s_-]+/, '').trim();
    });
    const baseName = baseNames.reduce((a, b) => a.length <= b.length ? a : b);

    // 기본 파싱 (공백 분리) - V1 통합 UI에서 토큰 매퍼로 덮어쓸 수 있도록 함
    let part_no = '';
    let part_name = baseName;
    const match = baseName.match(/^([a-zA-Z0-9-]+)(?:[\s_]+)(.+)$/);
    if (match) {
      part_no = match[1];
      part_name = match[2];
    }

    return {
      id: crypto.randomUUID(),
      part_no,
      part_name,
      files: cluster
    };
  });
}

/**
 * 드롭된 파일들과 기존 items를 비교하여,
 * cleanFileName 결과가 item.part_no 혹은 item.part_name과 일치(또는 포함)하면
 * 해당 파일들을 묶어서 리턴하는 매칭 알고리즘
 */
export function matchFilesToItems(
  files: File[],
  existingItems: EstimateItem[]
): { matched: Array<{ itemId: string; files: File[] }>; unmatched: File[] } {
  const matchedMap = new Map<string, File[]>();
  const unmatched: File[] = [];

  for (const file of files) {
    const cleaned = cleanFileName(file.name).toLowerCase();
    
    // 매칭되는 item 찾기
    const matchingItem = existingItems.find(item => {
      const partNo = (item.part_no || '').trim().toLowerCase();
      const partName = (item.part_name || '').trim().toLowerCase();
      
      // 일치 또는 포함 여부 검사
      if (partNo && (cleaned === partNo || cleaned.includes(partNo) || partNo.includes(cleaned))) {
        return true;
      }
      if (partName && (cleaned === partName || cleaned.includes(partName) || partName.includes(cleaned))) {
        return true;
      }
      
      return false;
    });

    if (matchingItem) {
      // item.id가 없을 경우를 대비해 식별자를 임시로 part_no나 part_name 기반으로 생성
      const targetId = matchingItem.id || `temp-${matchingItem.part_no || matchingItem.part_name}`;
      
      if (!matchedMap.has(targetId)) {
        matchedMap.set(targetId, []);
      }
      matchedMap.get(targetId)!.push(file);
    } else {
      unmatched.push(file);
    }
  }

  const matched = Array.from(matchedMap.entries()).map(([itemId, files]) => ({
    itemId,
    files
  }));

  return { matched, unmatched };
}
