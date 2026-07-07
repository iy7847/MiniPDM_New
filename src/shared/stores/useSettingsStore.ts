import { create } from 'zustand';
import { settingsService } from '@/features/settings/services/settingsService';
import type { CompanySettings, ExcelExportPreset, CustomTemplate } from '@/features/settings/services/settingsService';

export interface SettingsState {
  settings: CompanySettings | null;
  excelPresets: ExcelExportPreset[];
  customTemplates: CustomTemplate[];
  loading: boolean;
  error: string | null;

  loadSettings: (companyId: string) => Promise<void>;
  updateSettings: (companyId: string, data: Partial<CompanySettings>) => Promise<void>;
  
  loadExcelPresets: (companyId: string) => Promise<void>;
  addExcelPreset: (companyId: string, name: string, columns: string[]) => Promise<void>;
  deleteExcelPreset: (presetId: string) => Promise<void>;
  updateExcelPresetColumns: (presetId: string, columns: string[]) => Promise<void>;

  loadCustomTemplates: (companyId: string) => Promise<void>;
  addCustomTemplate: (companyId: string, template: Omit<CustomTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCustomTemplate: (templateId: string, data: Partial<CustomTemplate>) => Promise<void>;
  deleteCustomTemplate: (templateId: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  excelPresets: [],
  customTemplates: [],
  loading: false,
  error: null,

  loadSettings: async (companyId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await settingsService.fetchCompanySettings(companyId);
      set({ settings: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateSettings: async (companyId: string, data: Partial<CompanySettings>) => {
    set({ loading: true, error: null });
    try {
      await settingsService.updateCompanySettings(companyId, data);
      set(state => ({
        settings: state.settings ? { ...state.settings, ...data } : null,
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  loadExcelPresets: async (companyId: string) => {
    try {
      const presets = await settingsService.fetchExcelPresets(companyId);
      set({ excelPresets: presets });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addExcelPreset: async (companyId: string, name: string, columns: string[]) => {
    try {
      const newPreset = await settingsService.saveExcelPreset(companyId, name, columns);
      if (newPreset) {
        set(state => ({ excelPresets: [...state.excelPresets, newPreset] }));
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteExcelPreset: async (presetId: string) => {
    try {
      await settingsService.deleteExcelPreset(presetId);
      set(state => ({
        excelPresets: state.excelPresets.filter(p => p.id !== presetId)
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updateExcelPresetColumns: async (presetId: string, columns: string[]) => {
    try {
      await settingsService.updateExcelPresetColumns(presetId, columns);
      set(state => ({
        excelPresets: state.excelPresets.map(p => 
          p.id === presetId ? { ...p, columns } : p
        )
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  loadCustomTemplates: async (companyId: string) => {
    try {
      const templates = await settingsService.fetchCustomTemplates(companyId);
      set({ customTemplates: templates });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addCustomTemplate: async (companyId: string, template: Omit<CustomTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTemplate = await settingsService.saveCustomTemplate(companyId, template);
      if (newTemplate) {
        set(state => ({ customTemplates: [...state.customTemplates, newTemplate] }));
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updateCustomTemplate: async (templateId: string, data: Partial<CustomTemplate>) => {
    try {
      await settingsService.updateCustomTemplate(templateId, data);
      set(state => ({
        customTemplates: state.customTemplates.map(t => 
          t.id === templateId ? { ...t, ...data, updated_at: new Date().toISOString() } : t
        )
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteCustomTemplate: async (templateId: string) => {
    try {
      await settingsService.deleteCustomTemplate(templateId);
      set(state => ({
        customTemplates: state.customTemplates.filter(t => t.id !== templateId)
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  }
}));
