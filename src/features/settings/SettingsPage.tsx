import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/shared/stores/useSettingsStore';
import { useAuth } from '@/app/providers/AuthProvider';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { supabase } from '@/shared/services/supabase';

import { Button } from '@/design-system/Button';
import { Tabs } from '@/design-system/Tabs';
import { PageHeader } from '@/design-system/PageHeader';
import { Card } from '@/design-system/Card';
import { toast } from '@/shared/stores/useToastStore';
import { BasicInfoTab } from './tabs/BasicInfoTab';
import { FinancialTab } from './tabs/FinancialTab';
import { DiscountPolicyTab } from './tabs/DiscountPolicyTab';
import { TemplateTab } from './tabs/TemplateTab';
import { ExcelPresetTab } from './tabs/ExcelPresetTab';
import { CustomColumnsTab } from './tabs/CustomColumnsTab';
import { Settings, Building2, CircleDollarSign, FileText, TableProperties, TrendingUp, Users, Shield, ListPlus, Lock } from 'lucide-react';
import { UserManagementTab } from './tabs/UserManagementTab';
import { GroupManagementTab } from './tabs/GroupManagementTab';

export function SettingsPage() {
  const { user } = useAuth();
  const { isAdmin, hasPermission, companyId: authCompanyId } = usePermissions();
  const [companyId, setCompanyId] = useState<string | null>(authCompanyId);
  
  const { 
    settings, 
    excelPresets, 
    loading: storeLoading, 
    loadSettings, 
    updateSettings, 
    loadExcelPresets, 
    addExcelPreset, 
    deleteExcelPreset, 
    updateExcelPresetColumns, 
    loadCustomTemplates 
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState('basic');
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanyId() {
      if (authCompanyId) {
        setCompanyId(authCompanyId);
        setLoading(false);
        return;
      }
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        if (data?.company_id) {
          setCompanyId(data.company_id);
        }
      }
      setLoading(false);
    }
    fetchCompanyId();
  }, [user, authCompanyId]);

  useEffect(() => {
    if (companyId) {
      loadSettings(companyId);
      loadExcelPresets(companyId);
      loadCustomTemplates(companyId);
    }
  }, [companyId]);

  useEffect(() => {
    if (settings) {
      setForm(settings);
      if (settings.root_path) {
        localStorage.setItem('company_root_path', settings.root_path);
      }
    }
  }, [settings]);

  const updateForm = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!companyId) return;
    if (!isAdmin && !hasPermission('can_manage_settings')) {
      toast.error('환경 설정을 변경할 수 있는 권한이 없습니다.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings(companyId, form);
      if (form.root_path) {
        localStorage.setItem('company_root_path', form.root_path);
      }
      toast.success('설정이 성공적으로 저장되었습니다.');
    } catch (err: any) {
      toast.error(`저장 실패: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddExcelPreset = async (name: string) => {
    if (companyId) {
      await addExcelPreset(companyId, name, ['part_no', 'part_name', 'qty', 'unit_price', 'supply_price']);
    }
  };

  if ((loading || storeLoading) && !settings) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-base">
        <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 시스템 설정 관리 권한 체크
  if (!isAdmin && !hasPermission('can_manage_settings')) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-base p-6 animate-in fade-in">
        <Card className="p-12 text-center max-w-lg mx-auto border border-border-default shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-warning/10 text-warning flex items-center justify-center mx-auto mb-4 border border-warning/20 shadow-[0_0_20px_rgba(210,153,34,0.15)]">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">환경 설정 접근 권한 없음</h3>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            환경 설정 메뉴에 접근할 수 있는 권한이 없습니다.<br />
            설정 조회가 필요하신 경우 사내 관리자에게 권한 부여를 요청해주세요.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            이전 화면으로 돌아가기
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg-base relative overflow-hidden text-text-primary">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-bg-base/80 border-b border-border-default px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <PageHeader
            icon={Settings}
            title="환경 설정"
            description="회사 기본 정보, 단가 및 할인율 정책, 동적 항목, 사용자 권한을 통합 관리합니다."
            className="mb-4"
            actions={
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="shadow-glow h-[42px] px-6"
              >
                {saving ? '저장 중...' : '변경사항 저장하기'}
              </Button>
            }
          />
          
          <div className="flex justify-start">
            <Tabs
              tabs={[
                { id: 'basic', label: '기본 정보', icon: <Building2 className="w-4 h-4" /> },
                { id: 'financial', label: '단가 및 마진', icon: <CircleDollarSign className="w-4 h-4" /> },
                { id: 'discount', label: '할인율 정책', icon: <TrendingUp className="w-4 h-4" /> },
                { id: 'custom_columns', label: '동적 항목', icon: <ListPlus className="w-4 h-4" /> },
                { id: 'quotation', label: '견적 양식', icon: <FileText className="w-4 h-4" /> },
                { id: 'excel', label: '엑셀 프리셋', icon: <TableProperties className="w-4 h-4" /> },
                { id: 'users', label: '사용자 관리', icon: <Users className="w-4 h-4" /> },
                { id: 'groups', label: '그룹 관리', icon: <Shield className="w-4 h-4" /> }
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
        <div className={`mx-auto transition-all duration-300 ${activeTab === 'users' || activeTab === 'groups' ? 'max-w-7xl' : 'max-w-5xl'}`}>

          <div className="pb-20">
            {activeTab === 'basic' && <BasicInfoTab form={form} updateForm={updateForm} />}
            {activeTab === 'financial' && <FinancialTab form={form} updateForm={updateForm} />}
            {activeTab === 'discount' && <DiscountPolicyTab form={form} updateForm={updateForm} />}
            {activeTab === 'custom_columns' && <CustomColumnsTab form={form} updateForm={updateForm} />}
            {activeTab === 'quotation' && <TemplateTab form={form} updateForm={updateForm} />}
            {activeTab === 'excel' && (
              <ExcelPresetTab
                presets={excelPresets}
                onAdd={handleAddExcelPreset}
                onDelete={deleteExcelPreset}
                onUpdateColumns={updateExcelPresetColumns}
              />
            )}
            
            {/* 권한 관리 탭 (Admin 전용 가드) */}
            {activeTab === 'users' && (
              isAdmin ? (
                companyId && <UserManagementTab companyId={companyId} />
              ) : (
                <Card className="p-12 text-center max-w-lg mx-auto mt-8 border border-border-default">
                  <div className="w-14 h-14 rounded-full bg-warning/10 text-warning flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">관리자 전용 기능</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    사내 사용자 권한 및 멤버 초대 기능은 <strong>최고 관리자(Admin)</strong> 권한을 보유한 계정만 접근할 수 있습니다.
                    권한 설정이 필요하신 경우 사내 관리자에게 문의해 주세요.
                  </p>
                </Card>
              )
            )}

            {activeTab === 'groups' && (
              isAdmin ? (
                companyId && <GroupManagementTab companyId={companyId} />
              ) : (
                <Card className="p-12 text-center max-w-lg mx-auto mt-8 border border-border-default">
                  <div className="w-14 h-14 rounded-full bg-warning/10 text-warning flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">관리자 전용 기능</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    사내 사용자 그룹 및 권한 템플릿 관리 기능은 <strong>최고 관리자(Admin)</strong> 권한을 보유한 계정만 접근할 수 있습니다.
                  </p>
                </Card>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
