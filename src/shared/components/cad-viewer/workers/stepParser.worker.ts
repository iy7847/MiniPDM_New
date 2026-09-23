/**
 * STP/STEP 파일 테셀레이션 백그라운드 Web Worker
 */
import { processOcctResult } from './stepParserCore';

export interface WorkerParseRequest {
  id: string;
  buffer: ArrayBuffer;
  fileName: string;
}

self.onmessage = async (e: MessageEvent<WorkerParseRequest>) => {
  const { id, buffer, fileName } = e.data;

  try {
    const occtimportjs = (self as any).occtimportjs;
    if (!occtimportjs) {
      throw new Error('occt-import-js가 워커 환경에서 로드되지 않았습니다.');
    }

    const occt = await occtimportjs({
      locateFile: (name: string) => (name.endsWith('.wasm') ? '/occt-import-js.wasm' : name),
    });

    const fileBytes = new Uint8Array(buffer);
    const result = occt.ReadStepFile(fileBytes);

    if (!result || !result.success || !result.meshes || result.meshes.length === 0) {
      (self as any).postMessage({
        id,
        success: false,
        error: 'STP 파싱 실패',
      });
      return;
    }

    const processed = processOcctResult(result, buffer, fileName);
    (self as any).postMessage({
      id,
      success: true,
      ...processed,
    });
  } catch (err: any) {
    (self as any).postMessage({
      id,
      success: false,
      error: err?.message || '워커 파싱 오류',
    });
  }
};
