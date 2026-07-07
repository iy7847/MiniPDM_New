import { supabase } from '@/shared/services/supabase';

// DB에 저장되는 Material 타입 (기본)
export interface Material {
  id: string;
  company_id: string;
  code: string | null;
  name: string;
  category: string | null;
  density: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export const materialService = {
  /**
   * 전체 자재 목록 조회
   */
  getMaterials: async (category?: string) => {
    let query = supabase
      .from('materials')
      .select('*')
      .order('name', { ascending: true });
      
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Material[];
  },

  /**
   * 단일 자재 조회
   */
  getMaterialById: async (id: string) => {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data as Material;
  },

  /**
   * 자재 생성
   */
  createMaterial: async (material: Partial<Material>) => {
    const { data, error } = await supabase
      .from('materials')
      .insert(material)
      .select()
      .single();
      
    if (error) throw error;
    return data as Material;
  },

  /**
   * 자재 수정
   */
  updateMaterial: async (id: string, material: Partial<Material>) => {
    const { data, error } = await supabase
      .from('materials')
      .update(material)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as Material;
  },

  /**
   * 자재 삭제
   */
  deleteMaterial: async (id: string) => {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  }
};
