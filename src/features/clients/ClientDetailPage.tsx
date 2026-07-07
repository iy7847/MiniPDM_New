import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, Mail, FileText, MapPin, Search } from 'lucide-react';
import { Card } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { BaseInput } from '../../design-system/BaseInput';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'price'>('price');

  // Mock data
  const clientName = id === 'C001' ? '현대모비스' : '기아자동차';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{clientName}</h1>
            <p className="text-sm text-text-secondary mt-1">고객사 코드: {id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">정보 수정</Button>
          <Button>신규 견적 작성</Button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-border-default">
        {(['info', 'history', 'price'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 relative top-[1px] ${
              activeTab === tab
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'info' && '기본 정보'}
            {tab === 'history' && '거래 내역'}
            {tab === 'price' && '단가 히스토리'}
          </button>
        ))}
      </div>

      {activeTab === 'price' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-primary">단가 히스토리</h2>
            <div className="w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <BaseInput placeholder="품명 또는 규격 검색..." className="pl-9 text-sm" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bg-elevated text-text-secondary border-b border-border-default">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-md">최근 거래일</th>
                  <th className="px-4 py-3 font-semibold">품명</th>
                  <th className="px-4 py-3 font-semibold">규격</th>
                  <th className="px-4 py-3 font-semibold">재질</th>
                  <th className="px-4 py-3 font-semibold text-right">최근 단가</th>
                  <th className="px-4 py-3 font-semibold text-right rounded-tr-md">이전 단가</th>
                  <th className="px-4 py-3 font-semibold text-center">변동</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { date: '2026-07-01', name: '브라켓 A', spec: '100x50x5', mat: 'AL6061', price: 15000, oldPrice: 14500, up: true },
                  { date: '2026-06-15', name: '샤프트 B', spec: 'Φ50x200', mat: 'S45C', price: 32000, oldPrice: 32000, up: null },
                  { date: '2026-05-20', name: '커버 C', spec: '200x200x2', mat: 'SUS304', price: 45000, oldPrice: 48000, up: false },
                ].map((item, i) => (
                  <tr key={i} className="hover:bg-bg-elevated transition-colors text-text-primary">
                    <td className="px-4 py-3 text-text-secondary">{item.date}</td>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{item.spec}</td>
                    <td className="px-4 py-3">{item.mat}</td>
                    <td className="px-4 py-3 text-right font-medium">₩{item.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">₩{item.oldPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      {item.up === true && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-danger/10 text-danger font-medium">+{(item.price - item.oldPrice).toLocaleString()}</span>}
                      {item.up === false && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-brand-500/10 text-brand-500 font-medium">{(item.price - item.oldPrice).toLocaleString()}</span>}
                      {item.up === null && <span className="text-text-secondary text-xs">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'info' && (
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase">회사 정보</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex">
                    <span className="w-24 text-text-secondary flex items-center gap-2"><Building2 size={16} /> 회사명</span>
                    <span className="text-text-primary font-medium">{clientName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-text-secondary flex items-center gap-2"><FileText size={16} /> 사업자번호</span>
                    <span className="text-text-primary">123-45-67890</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-text-secondary flex items-center gap-2"><MapPin size={16} /> 주소</span>
                    <span className="text-text-primary">서울특별시 강남구 테헤란로 123</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase">담당자 정보</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex">
                    <span className="w-24 text-text-secondary">이름</span>
                    <span className="text-text-primary font-medium">김담당 부장</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-text-secondary flex items-center gap-2"><Phone size={16} /> 연락처</span>
                    <span className="text-text-primary">010-1234-5678</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-text-secondary flex items-center gap-2"><Mail size={16} /> 이메일</span>
                    <span className="text-text-primary">contact@client.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {activeTab === 'history' && (
        <Card className="p-12 text-center text-text-secondary">
          거래 내역 데이터 준비 중...
        </Card>
      )}
    </div>
  );
};
