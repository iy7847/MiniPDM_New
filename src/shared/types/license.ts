/**
 * MiniPDM v2.0 - 라이선스 및 구독 관리 타입 정의
 */

export type LicenseStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
export type LicensePlan = 'STANDARD' | 'PRO';

export interface CompanyLicenseRaw {
  id: string;
  name: string;
  biz_num?: string | null;
  ceo_name?: string | null;
  license_status?: LicenseStatus | null;
  license_plan?: LicensePlan | null;
  trial_days?: number | null;
  license_expires_at?: string | null;
  max_users?: number | null;
  is_master_vendor?: boolean | null;
  billing_memo?: string | null;
  created_at?: string;
}

export interface CompanyLicense {
  companyId: string;
  companyName: string;
  bizNum: string;
  ceoName: string;
  status: LicenseStatus;
  plan: LicensePlan;
  trialDays: number;
  expiresAt: string | null;
  maxUsers: number;
  isMasterVendor: boolean;
  billingMemo: string;
  daysRemaining: number;
  isTrial: boolean;
  isExpired: boolean;
  isGracePeriod: boolean; // 유료 회원이면서 만료 후 3일 유예 기간 내인 경우
  isExpiringSoon: boolean; // 만료 7일 이내인 경우
  isBlocked: boolean; // 시스템 조작 차단 대상 여부
}

/**
 * DB에서 가져온 회사 정보를 기반으로 실시간 라이선스 상세 계산
 */
export function calculateLicenseDetails(raw: CompanyLicenseRaw | null): CompanyLicense {
  if (!raw) {
    return {
      companyId: '',
      companyName: '',
      bizNum: '',
      ceoName: '',
      status: 'EXPIRED',
      plan: 'PRO',
      trialDays: 30,
      expiresAt: null,
      maxUsers: 5,
      isMasterVendor: false,
      billingMemo: '',
      daysRemaining: 0,
      isTrial: false,
      isExpired: true,
      isGracePeriod: false,
      isExpiringSoon: false,
      isBlocked: true,
    };
  }

  const status: LicenseStatus = raw.license_status || 'ACTIVE';
  const plan: LicensePlan = raw.license_plan || 'PRO';
  const maxUsers = raw.max_users ?? 5;
  const trialDays = raw.trial_days ?? 30;
  const isMasterVendor = Boolean(raw.is_master_vendor);
  const expiresAt = raw.license_expires_at || null;

  // 만료 일시 계산
  let daysRemaining = 999;
  let isExpired = false;

  if (expiresAt) {
    const expireDate = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffMs = expireDate - now;
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining <= 0;
  }

  const isTrial = status === 'TRIAL';
  
  // 유료 고객(ACTIVE) 만료 시 3일간 결제 유예(Grace Period) 제공
  // daysRemaining이 -1, -2, -3일 때 유예 기간
  const isGracePeriod = !isTrial && status !== 'SUSPENDED' && isExpired && daysRemaining >= -3;

  // 만료 7일 이내 예고 (0 < daysRemaining <= 7)
  const isExpiringSoon = !isExpired && daysRemaining > 0 && daysRemaining <= 7;

  // 차단 조건:
  // 1. 관리자가 수동으로 'SUSPENDED'(이용정지)로 설정한 경우
  // 2. 관리자가 'EXPIRED'로 명시 설정한 경우
  // 3. 체험판(TRIAL)인데 기간이 만료된 경우 (유예 없음)
  // 4. 유료 고객인데 만료 후 유예 기간(3일)까지 초과한 경우
  let isBlocked = false;
  if (!isMasterVendor) {
    if (status === 'SUSPENDED' || status === 'EXPIRED') {
      isBlocked = true;
    } else if (isTrial && isExpired) {
      isBlocked = true;
    } else if (!isTrial && isExpired && !isGracePeriod) {
      isBlocked = true;
    }
  }

  return {
    companyId: raw.id,
    companyName: raw.name || '',
    bizNum: raw.biz_num || '',
    ceoName: raw.ceo_name || '',
    status,
    plan,
    trialDays,
    expiresAt,
    maxUsers,
    isMasterVendor,
    billingMemo: raw.billing_memo || '',
    daysRemaining,
    isTrial,
    isExpired,
    isGracePeriod,
    isExpiringSoon,
    isBlocked,
  };
}
