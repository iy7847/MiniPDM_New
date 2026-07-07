import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/shared/stores/useSettingsStore';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';

import { Button } from '@/design-system/Button';
import { Tabs } from '@/design-system/Tabs';
import { BasicInfoTab } from './tabs/BasicInfoTab';
import { FinancialTab } from './tabs/FinancialTab';
import { DiscountPolicyTab } from './tabs/DiscountPolicyTab';
import { TemplateTab } from './tabs/TemplateTab';
import { ExcelPresetTab } from './tabs/ExcelPresetTab';
import { Settings, Building2, CircleDollarSign, FileText, TableProperties, TrendingUp, Users, Shield } from 'lucide-react';
import { UserManagementTab } from './tabs/UserManagementTab';
import { GroupManagementTab } from './tabs/GroupManagementTab';

export function SettingsPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
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
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanyId() {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('company_id, role')
          .eq('id', user.id)
          .single();
        if (data?.company_id) {
          setCompanyId(data.company_id);
          setUserRole(data.role);
        }
      }
      setLoading(false);
    }
    fetchCompanyId();
  }, [user]);

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
    }
  }, [settings]);

  const updateForm = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    setNotification(null);
    try {
      await updateSettings(companyId, form);
      setNotification({ message: '설정이 성공적으로 저장되었습니다.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `저장 실패: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 3000);
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

  return (
    <div className="h-full flex flex-col bg-bg-base relative overflow-hidden text-text-primary">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-bg-base/80 border-b border-border-default px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings className="w-7 h-7 text-text-primary" />
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-text-primary">환경 설정</h1>
            </div>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="shadow-glow h-[42px] px-6"
            >
              {saving ? '저장 중...' : '변경사항 저장하기'}
            </Button>
          </div>
          
          <div className="flex justify-start">
            <Tabs
              tabs={[
                { id: 'basic', label: '기본 정보', icon: <Building2 className="w-4 h-4" /> },
                { id: 'financial', label: '단가 및 마진', icon: <CircleDollarSign className="w-4 h-4" /> },
                { id: 'discount', label: '할인율 정책', icon: <TrendingUp className="w-4 h-4" /> },
                { id: 'quotation', label: '견적 양식', icon: <FileText className="w-4 h-4" /> },
                { id: 'excel', label: '엑셀 프리셋', icon: <TableProperties className="w-4 h-4" /> },
                ...(userRole === 'admin' || userRole === 'super_admin' ? [
                  { id: 'users', label: '사용자 관리', icon: <Users className="w-4 h-4" /> },
                  { id: 'groups', label: '그룹 관리', icon: <Shield className="w-4 h-4" /> }
                ] : [])
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
        <div className="max-w-5xl mx-auto">
          {notification && (
            <div className={`mb-6 p-4 rounded-2xl text-center text-sm font-black shadow-soft border animate-in fade-in slide-in-from-top-4 duration-300 ${
              notification.type === 'success' ? 'bg-success-bg text-success border-success' : 'bg-danger-bg text-danger border-danger'
            }`}>
              {notification.type === 'success' ? '✅ ' : '❌ '}
              {notification.message}
            </div>
          )}

          <div className="pb-20">
            {activeTab === 'basic' && <BasicInfoTab form={form} updateForm={updateForm} />}
            {activeTab === 'financial' && <FinancialTab form={form} updateForm={updateForm} />}
            {activeTab === 'discount' && <DiscountPolicyTab form={form} updateForm={updateForm} />}
            {activeTab === 'quotation' && <TemplateTab form={form} updateForm={updateForm} />}
            {activeTab === 'excel' && (
              <ExcelPresetTab
                presets={excelPresets}
                onAdd={handleAddExcelPreset}
                onDelete={deleteExcelPreset}
                onUpdateColumns={updateExcelPresetColumns}
              />
            )}
            {activeTab === 'users' && companyId && (
              <UserManagementTab companyId={companyId} />
            )}
            {activeTab === 'groups' && companyId && (
              <GroupManagementTab companyId={companyId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
