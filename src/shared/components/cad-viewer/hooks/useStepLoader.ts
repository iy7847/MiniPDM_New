/**
 * STP/STEP 파일 로드 및 고속 OpenCASCADE WASM 파싱 관리 커스텀 훅
 */
import { useState, useEffect, useRef } from 'react';
import { processOcctResult, type ParseResultData } from '../workers/stepParserCore';

export interface UseStepLoaderReturn {
  isLoading: boolean;
  progressText: string;
  error: string | null;
  parsedResult: ParseResultData | null;
  reload: () => void;
}

let cachedOcctInstance: any = null;

// OpenCASCADE WASM 인스턴스 싱글톤 로더
async function getOcct() {
  if (cachedOcctInstance) return cachedOcctInstance;

  const occtimportjs = (window as any).occtimportjs;
  if (!occtimportjs) {
    throw new Error('occt-import-js 스크립트가 로드되지 않았습니다.');
  }

  cachedOcctInstance = await occtimportjs({
    locateFile: (name: string) => {
      if (name.endsWith('.wasm')) {
        return typeof window !== 'undefined' && window.location.protocol.startsWith('http')
          ? '/occt-import-js.wasm'
          : './occt-import-js.wasm';
      }
      return name;
    },
  });

  return cachedOcctInstance;
}

export function useStepLoader(
  fileInput: ArrayBuffer | Blob | File | string | null,
  fileName: string = 'model.stp'
): UseStepLoaderReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParseResultData | null>(null);

  const activeToken = useRef<number>(0);

  const loadAndParse = async () => {
    if (!fileInput) {
      setParsedResult(null);
      setIsLoading(false);
      return;
    }

    const currentToken = ++activeToken.current;
    setIsLoading(true);
    setError(null);
    setProgressText('STP 파일 데이터 읽는 중...');

    try {
      let buffer: ArrayBuffer;
      let targetFileName = fileName;

      // 1. 다양한 입력 형식에 따른 ArrayBuffer 획득
      if (typeof fileInput === 'string') {
        const res = await fetch(fileInput);
        if (!res.ok) throw new Error(`파일 다운로드 실패 (${res.status} ${res.statusText})`);
        buffer = await res.arrayBuffer();
        targetFileName = fileInput.split('/').pop() || fileName;
      } else if (fileInput instanceof Blob || fileInput instanceof File) {
        if ('name' in fileInput && (fileInput as any).name) {
          targetFileName = String((fileInput as any).name);
        }
        buffer = await fileInput.arrayBuffer();
      } else if (fileInput instanceof ArrayBuffer) {
        buffer = fileInput;
      } else {
        throw new Error('지원되지 않는 파일 형식입니다.');
      }

      if (currentToken !== activeToken.current) return;

      setProgressText('OpenCASCADE WASM 초기화 중...');
      const occt = await getOcct();

      if (currentToken !== activeToken.current) return;

      setProgressText('3D CAD 테셀레이션 및 형상 추출 중...');
      
      // UI 스레드 반응성을 위해 setTimeout 틱 양보
      await new Promise((resolve) => setTimeout(resolve, 10));

      const fileBytes = new Uint8Array(buffer);
      const rawResult = occt.ReadStepFile(fileBytes);

      if (!rawResult || !rawResult.success || !rawResult.meshes || rawResult.meshes.length === 0) {
        throw new Error('STP 파싱에 실패하였거나 유효한 3D 솔리드 형상이 없습니다.');
      }

      setProgressText('모서리 및 원형 홀(Circle) 감지 중...');
      const processed = processOcctResult(rawResult, buffer, targetFileName);

      if (currentToken !== activeToken.current) return;

      setParsedResult(processed);
      setIsLoading(false);
      setProgressText('');
    } catch (err: any) {
      console.error('Failed to parse step file:', err);
      if (currentToken === activeToken.current) {
        setError(err?.message || 'STP 파일을 불러오는데 실패했습니다.');
        setIsLoading(false);
        setProgressText('');
      }
    }
  };

  useEffect(() => {
    loadAndParse();
  }, [fileInput]);

  return {
    isLoading,
    progressText,
    error,
    parsedResult,
    reload: loadAndParse,
  };
}
