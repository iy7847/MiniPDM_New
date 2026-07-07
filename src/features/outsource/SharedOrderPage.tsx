import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { CheckCircle2, Download, Printer } from 'lucide-react';

export const SharedOrderPage: React.FC = () => {
  const { id } = useParams();
  const [isApproved, setIsApproved] = useState(false);

  const handleApprove = () => {
    setIsApproved(true);
    // 실제로는 API 호출
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-4 md:p-8 flex items-start justify-center">
      <div className="w-full max-w-4xl space-y-6 animate-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-surface p-6 rounded-xl border border-border-default">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              외주 발주서 <span className="text-brand-500 text-lg font-normal">#{id}</span>
            </h1>
            <p className="text-text-secondary mt-1">발주처: (주)안티그레비티</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">
              <Printer className="w-4 h-4 mr-2" />
              인쇄
            </Button>
            <Button variant="secondary">
              <Download className="w-4 h-4 mr-2" />
              PDF 다운로드
            </Button>
          </div>
        </div>

        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>발주 내역 상세</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                  <p className="text-text-secondary mb-1">발주 일자</p>
                  <p className="font-medium text-text-primary">2026-07-03</p>
                </div>
                <div>
                  <p className="text-text-secondary mb-1">납기 요청일</p>
                  <p className="font-medium text-brand-500">2026-07-10</p>
                </div>
                <div>
                  <p className="text-text-secondary mb-1">수신처(외주사)</p>
                  <p className="font-medium text-text-primary">제일열처리 담당자님</p>
                </div>
                <div>
                  <p className="text-text-secondary mb-1">요청 공정</p>
                  <p className="font-medium text-text-primary">열처리 (HRC 50-55)</p>
                </div>
              </div>

              <div>
                <table className="w-full text-left border-collapse border border-border-default">
                  <thead className="bg-bg-elevated">
                    <tr>
                      <th className="p-3 border border-border-default font-medium text-text-secondary">품번</th>
                      <th className="p-3 border border-border-default font-medium text-text-secondary">품명</th>
                      <th className="p-3 border border-border-default font-medium text-text-secondary">재질</th>
                      <th className="p-3 border border-border-default font-medium text-text-secondary text-right">수량</th>
                      <th className="p-3 border border-border-default font-medium text-text-secondary">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border border-border-default text-text-primary">AG-MBP-01</td>
                      <td className="p-3 border border-border-default text-text-primary">Main Base Plate</td>
                      <td className="p-3 border border-border-default text-text-secondary">S45C</td>
                      <td className="p-3 border border-border-default text-text-primary text-right">2</td>
                      <td className="p-3 border border-border-default text-text-secondary">부분 열처리 주의</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-border-default text-text-primary">AG-GS-02</td>
                      <td className="p-3 border border-border-default text-text-primary">Guide Shaft</td>
                      <td className="p-3 border border-border-default text-text-secondary">S45C</td>
                      <td className="p-3 border border-border-default text-text-primary text-right">10</td>
                      <td className="p-3 border border-border-default text-text-secondary">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Bottom */}
        <div className="bg-bg-surface p-8 rounded-xl border border-border-default text-center space-y-6">
          <p className="text-lg text-text-secondary">
            위 발주 내용을 확인하셨다면 아래 승인 버튼을 눌러주세요.
          </p>
          
          {isApproved ? (
            <div className="inline-flex items-center gap-3 text-2xl text-green-500 font-bold p-4 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="w-8 h-8" />
              발주가 승인되었습니다 (작업 진행 요망)
            </div>
          ) : (
            <Button size="lg" className="text-xl py-6 px-12 h-auto" onClick={handleApprove} variant="primary">
              <CheckCircle2 className="w-6 h-6 mr-3" />
              발주 내용 확인 및 승인
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};
