import { supabase } from '@/shared/services/supabase';

export interface CompanySettings {
  id?: string;
  name: string;
  biz_num: string;
  ceo_name: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  root_path: string;
  logo_path: string;
  seal_path: string;
  default_exchange_rate: number;
  default_hourly_rate: number;
  quotation_template_type: string;
  discount_policy_json: any;
  default_payment_terms: string;
  default_incoterms: string;
  default_delivery_period: string;
  default_destination: string;
  default_note: string;
  label_printer_width: number;
  label_printer_height: number;
  default_margin_w: number;
  default_margin_d: number;
  default_margin_h: number;
  default_margin_round_w: number;
  default_margin_round_d: number;
  default_rounding_unit: number;
  default_time_step: number;
  default_profit_rate_step: number;
  updated_at?: string;
}

export interface ExcelExportPreset {
  id: string;
  company_id: string;
  name: string;
  columns: string[];
  created_at?: string;
}

export const settingsService = {
  async fetchCompanySettings(companyId: string): Promise<CompanySettings | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (error) {
      console.error('Error fetching company settings:', error);
      throw error;
    }
    return data;
  },

  async updateCompanySettings(companyId: string, data: Partial<CompanySettings>) {
    const { error } = await supabase
      .from('companies')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', companyId);

    if (error) {
      console.error('Error updating company settings:', error);
      throw error;
    }
  },

  async fetchExcelPresets(companyId: string): Promise<ExcelExportPreset[]> {
    const { data, error } = await supabase
      .from('excel_export_presets')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at');

    if (error) {
      console.error('Error fetching excel presets:', error);
      throw error;
    }
    return data || [];
  },

  async saveExcelPreset(companyId: string, name: string, columns: string[]): Promise<ExcelExportPreset | null> {
    const { data, error } = await supabase
      .from('excel_export_presets')
      .insert({ company_id: companyId, name, columns })
      .select()
      .single();

    if (error) {
      console.error('Error saving excel preset:', error);
      throw error;
    }
    return data;
  },

  async deleteExcelPreset(presetId: string) {
    const { error } = await supabase
      .from('excel_export_presets')
      .delete()
      .eq('id', presetId);

    if (error) {
      console.error('Error deleting excel preset:', error);
      throw error;
    }
  },

  async updateExcelPresetColumns(presetId: string, columns: string[]) {
    const { error } = await supabase
      .from('excel_export_presets')
      .update({ columns })
      .eq('id', presetId);

    if (error) {
      console.error('Error updating excel preset columns:', error);
      throw error;
    }
  }
};
