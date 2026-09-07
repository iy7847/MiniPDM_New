import { create } from 'zustand';

interface ScannerState {
  manualBarcode: string | null;
  setManualBarcode: (barcode: string | null) => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  manualBarcode: null,
  setManualBarcode: (barcode) => set({ manualBarcode: barcode }),
}));
