import { supabase } from '@/shared/services/supabase';
import { calculateLicenseDetails } from '@/shared/types/license';
import type { CompanyLicenseRaw, CompanyLicense } from '@/shared/types/license';

export interface MasterCompanyItem extends CompanyLicense {
  registeredUsersCount: number;
  pendingInvitesCount: number;
  totalUsersCount: number;
  createdAt: string;
  masterEmail?: string | null;
}

export interface CompanyUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  job_title?: string | null;
  phone?: string | null;
  created_at: string;
}

export interface CompanyInviteItem {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at?: string | null;
}

export const masterService = {
  /**
   * 전체 등록된 고객사 및 라이선스 정보 조회
   */
  async fetchAllCompanies(): Promise<MasterCompanyItem[]> {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, biz_num, ceo_name, email, phone, fax, address, license_status, license_plan, trial_days, license_expires_at, max_users, is_master_vendor, billing_memo, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('마스터 업체 목록 조회 오류:', error);
      throw error;
    }

    if (!companies || companies.length === 0) return [];

    // 업체별 사용자 수, 초대 대기 수, 최초 마스터 계정 이메일 병렬 조회
    const results: MasterCompanyItem[] = await Promise.all(
      companies.map(async (raw: CompanyLicenseRaw) => {
        const details = calculateLicenseDetails(raw);

        const [profilesRes, invitesRes, masterUserRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', raw.id),
          supabase
            .from('invitations')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', raw.id)
            .eq('status', 'pending'),
          supabase
            .from('profiles')
            .select('email')
            .eq('company_id', raw.id)
            .order('created_at', { ascending: true })
            .limit(1)
        ]);

        const registeredUsersCount = profilesRes.count || 0;
        const pendingInvitesCount = invitesRes.count || 0;
        const masterEmail = masterUserRes.data?.[0]?.email || null;

        return {
          ...details,
          registeredUsersCount,
          pendingInvitesCount,
          totalUsersCount: registeredUsersCount + pendingInvitesCount,
          createdAt: raw.created_at || '',
          masterEmail,
        };
      })
    );

    return results;
  },

  /**
   * 특정 업체의 소속 사용자 및 대기 중인 초대 목록 조회
   */
  async fetchCompanyUsers(companyId: string): Promise<{ users: CompanyUserItem[]; invites: CompanyInviteItem[] }> {
    const [usersRes, invitesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, role, job_title, phone, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true }),
      supabase
        .from('invitations')
        .select('id, email, role, created_at, expires_at')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    ]);

    if (usersRes.error) throw usersRes.error;
    if (invitesRes.error) throw invitesRes.error;

    return {
      users: (usersRes.data || []) as CompanyUserItem[],
      invites: (invitesRes.data || []) as CompanyInviteItem[],
    };
  },

  /**
   * 고객사 기본 가입 정보 업데이트
   */
  async updateCompanyInfo(
    companyId: string,
    updates: {
      name?: string;
      biz_num?: string | null;
      ceo_name?: string | null;
      email?: string | null;
      phone?: string | null;
      fax?: string | null;
      address?: string | null;
    }
  ) {
    const { error } = await supabase
      .from('companies')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId);

    if (error) {
      console.error('고객사 가입 정보 업데이트 오류:', error);
      throw error;
    }
  },

  /**
   * 업체 라이선스 정보 업데이트
   */
  async updateLicense(
    companyId: string,
    updates: Partial<{
      license_status: string;
      license_plan: string;
      trial_days: number;
      license_expires_at: string;
      max_users: number;
      billing_memo: string;
    }>
  ) {
    const { error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId);

    if (error) throw error;
  },

  /**
   * 라이선스 기간 연장 (+N일)
   */
  async extendLicense(companyId: string, addDays: number) {
    // 현재 만료일 조회
    const { data, error } = await supabase
      .from('companies')
      .select('license_expires_at')
      .eq('id', companyId)
      .single();

    if (error) throw error;

    const currentExpire = data?.license_expires_at ? new Date(data.license_expires_at).getTime() : Date.now();
    const baseTime = currentExpire > Date.now() ? currentExpire : Date.now();
    const newExpiresAt = new Date(baseTime + addDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('companies')
      .update({
        license_expires_at: newExpiresAt,
        license_status: 'ACTIVE', // 연장 시 정식 활성 상태로 변경
      })
      .eq('id', companyId);

    if (updateError) throw updateError;
    return newExpiresAt;
  },

  /**
   * 체험판 기간으로 재설정 (TRIAL 상태 및 N일 부여)
   */
  async resetToTrial(companyId: string, trialDays: number = 30) {
    const newExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('companies')
      .update({
        license_status: 'TRIAL',
        trial_days: trialDays,
        license_expires_at: newExpiresAt,
      })
      .eq('id', companyId);

    if (error) throw error;
    return newExpiresAt;
  },

  /**
   * 신규 업체 등록 (라이선스 기본값 세팅)
   */
  async createCompanyWithLicense(payload: {
    name: string;
    biz_num?: string;
    ceo_name?: string;
    trial_days?: number;
    max_users?: number;
    license_plan?: 'STANDARD' | 'PRO';
    billing_memo?: string;
  }) {
    const trialDays = payload.trial_days ?? 30;
    const expiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: payload.name,
        biz_num: payload.biz_num || null,
        ceo_name: payload.ceo_name || null,
        license_status: 'TRIAL',
        license_plan: payload.license_plan || 'PRO',
        trial_days: trialDays,
        license_expires_at: expiresAt,
        max_users: payload.max_users ?? 5,
        billing_memo: payload.billing_memo || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
