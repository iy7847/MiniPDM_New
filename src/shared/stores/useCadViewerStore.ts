import { create } from 'zustand';
import { toast } from './useToastStore';

export interface CadViewerState {
  isOpen: boolean;
  file: File | Blob | string | null;
  fileName: string;
  isLoading: boolean;
  openCadViewer: (file: any) => Promise<void>;
  closeCadViewer: () => void;
}

export const useCadViewerStore = create<CadViewerState>((set) => ({
  isOpen: false,
  file: null,
  fileName: 'model.stp',
  isLoading: false,

  openCadViewer: async (file: any) => {
    if (!file) {
      toast.error('열람할 3D 파일 정보가 없습니다.');
      return;
    }

    const rawFileName = file.name || file.file_name || 'model.stp';

    // 1. 이미 File이나 Blob 객체인 경우
    if (file instanceof File || file instanceof Blob) {
      set({ isOpen: true, file, fileName: rawFileName, isLoading: false });
      return;
    }

    // 2. Electron 환경에서 로컬 파일 경로 읽기
    let filePath = file.file_path || file.path || '';
    if (typeof file === 'string') {
      filePath = file;
    }

    if (filePath && !filePath.match(/^[a-zA-Z]:[\\/]/) && !filePath.startsWith('/')) {
      const companyRootPath = localStorage.getItem('company_root_path') || 'D:\\99_ETC\\임시데이터';
      filePath = `${companyRootPath}\\${filePath}`;
    }

    if ((window as any).ipcRenderer && filePath) {
      try {
        set({ isLoading: true });
        const res = await (window as any).ipcRenderer.invoke('read-local-file', filePath);
        if (res.success) {
          const fileObj = new File([res.data], rawFileName, { type: 'model/step' });
          set({ isOpen: true, file: fileObj, fileName: rawFileName, isLoading: false });
          return;
        } else {
          toast.error('3D 파일 읽기 실패: ' + res.error);
          set({ isLoading: false });
          return;
        }
      } catch (err: any) {
        toast.error('3D 파일 로드 오류: ' + err.message);
        set({ isLoading: false });
        return;
      }
    }

    // 3. 웹 브라우저 환경 fallback (또는 Supabase Storage URL 등)
    if (typeof filePath === 'string' && (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('/'))) {
      set({ isOpen: true, file: filePath, fileName: rawFileName, isLoading: false });
      return;
    }

    // 웹 데모/샘플 fallback
    toast.info('로컬 도면 파일 열람은 데스크톱 앱(MiniPDM) 환경에서 완벽 지원됩니다.');
    set({ isOpen: true, file: `/samples/${rawFileName}`, fileName: rawFileName, isLoading: false });
  },

  closeCadViewer: () => {
    set({ isOpen: false, file: null, fileName: 'model.stp', isLoading: false });
  },
}));

export const cadViewer = {
  open: (file: any) => useCadViewerStore.getState().openCadViewer(file),
  close: () => useCadViewerStore.getState().closeCadViewer(),
};
