import React from 'react';
import { X, CheckCircle, Clock, User, Building, AlertTriangle } from 'lucide-react';
import { Card, Badge, Button } from '@/design-system';

interface ProductionProcessDetailModalProps {
  item: any;
  onClose: () => void;
}

export const ProductionProcessDetailModal: React.FC<ProductionProcessDetailModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const logs: any[] = (item.process_logs || []).sort((a: any, b: any) => (a.sequence_no || 999) - (b.sequence_no || 999));
  const outsourceOrders: any[] = item.outsource_orders || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-bg-base border-border-strong shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-surface">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-black text-text-primary font-mono">{item.part_no || '-'}</h2>
              <Badge variant="primary" className="text-xs">
                수주 {item.qty}개 / 생산 {item.production_qty ?? item.qty}개
              </Badge>
            </div>
            <p className="text-text-secondary text-xs">
              {item.part_name} | {item.client_name} ({item.po_no || item.order_item_no})
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-text-tertiary hover:text-text-primary transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">공정 진행 로드맵</h3>
            <span className="text-xs text-text-tertiary">
              총 {logs.length}개 공정 중 {logs.filter(l => l.status === '완료').length}개 완료
            </span>
          </div>

          {logs.length === 0 ? (
            outsourceOrders.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">외주 제작 품목</span>
                  <span className="text-xs text-text-tertiary">별도 내부 공정 설계 없이 완제품 외주 발주로 진행되는 품목입니다.</span>
                </div>
                {outsourceOrders.map((outOrder, idx) => (
                  <div key={outOrder.id || idx} className="p-5 bg-bg-surface border border-orange-500/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-orange-400" />
                        <span className="text-lg font-bold text-text-primary">{outOrder.supplier_name || '외주처 미지정'}</span>
                      </div>
                      <Badge variant={outOrder.status === '입고완료' ? 'success' : outOrder.status === '진행중' || outOrder.status === '발주완료' ? 'warning' : 'neutral'}>
                        {outOrder.status || '발주대기'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-text-secondary pt-2 border-t border-border-default">
                      <div>발주 공정/명칭: <strong className="text-text-primary">{outOrder.process_name || '완제품 제작'}</strong></div>
                      <div>발주 수량: <strong className="text-text-primary">{outOrder.quantity || item.production_qty || item.qty}개</strong></div>
                      <div>발주일: <strong className="text-text-primary">{outOrder.order_date || '-'}</strong></div>
                      <div>입고 예정일: <strong className="text-orange-400">{outOrder.expected_date || '-'}</strong></div>
                      {outOrder.unit_price > 0 && (
                        <div className="col-span-2">
                          발주 금액: <strong className="text-text-primary font-mono">{Number(outOrder.total_price || (outOrder.unit_price * outOrder.quantity)).toLocaleString()}원</strong>
                        </div>
                      )}
                      {outOrder.note && (
                        <div className="col-span-2 text-text-tertiary">
                          비고: {outOrder.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-text-tertiary border border-dashed border-border-default rounded-xl">
                설계된 공정이 없습니다.
              </div>
            )
          ) : (
            <div className="relative border-l-2 border-border-default ml-4 pl-6 space-y-6">
              {logs.map((log, idx) => {
                const isCompleted = log.status === '완료';
                const isActive = log.status === '가공중' || log.status === '외주가공중';
                const isOutsource = log.status === '외주가공중' || log.process_type === 'OUTSOURCE';
                const relatedOutsource = isOutsource ? outsourceOrders.find(o => o.process_name === log.process_name || o.id === log.outsource_id) : null;

                return (
                  <div key={log.id || idx} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-bg-base ${
                      isCompleted 
                        ? 'border-success text-success' 
                        : isActive 
                        ? (isOutsource ? 'border-orange-500 text-orange-400 ring-4 ring-orange-500/20' : 'border-brand-500 text-brand-400 ring-4 ring-brand-500/20')
                        : (isOutsource ? 'border-orange-500/40 text-orange-400/80' : 'border-border-strong text-text-tertiary')
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : isActive ? (
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step Card */}
                    <div className={`p-4 rounded-xl border transition-all ${
                      isActive 
                        ? (isOutsource ? 'bg-orange-500/10 border-orange-500/50 shadow-sm' : 'bg-brand-500/5 border-brand-500/40 shadow-sm')
                        : isCompleted
                        ? 'bg-bg-surface/60 border-border-default'
                        : (isOutsource ? 'bg-orange-500/5 border-orange-500/30' : 'bg-bg-base border-border-subtle opacity-70')
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-text-tertiary font-bold">#{idx + 1}</span>
                          <span className={`text-base font-bold ${isOutsource ? 'text-orange-300' : 'text-text-primary'}`}>{log.process_name}</span>
                          {log.processes?.description && (
                            <span className={`text-sm font-normal ${isOutsource ? 'text-orange-300/70' : 'text-text-secondary'}`}>{log.processes.description}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded border font-semibold flex items-center gap-1 ${
                            isOutsource 
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' 
                              : 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                          }`}>
                            {isOutsource ? '외주' : '사내'}
                          </span>
                        </div>

                        <Badge variant={
                          isCompleted ? 'success' : isActive ? (isOutsource ? 'warning' : 'primary') : 'neutral'
                        } className="text-xs">
                          {log.status}
                        </Badge>
                      </div>

                      {/* Detail Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary mt-3 pt-3 border-t border-border-subtle">
                        {isCompleted && (
                          <>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-text-tertiary" />
                              <span>작업자: <strong className="text-text-primary">{log.worker || '미지정'}</strong></span>
                            </div>
                            <div>
                              <span>수량: 양품 <strong className="text-success">{log.good_qty ?? log.start_qty ?? '-'}</strong></span>
                              {(log.defect_qty || 0) > 0 && (
                                <span className="ml-2 text-danger font-bold">불량 {log.defect_qty}</span>
                              )}
                            </div>
                            {log.end_time && (
                              <div className="col-span-2 text-[11px] text-text-tertiary">
                                완료 시간: {new Date(log.end_time).toLocaleString()}
                              </div>
                            )}
                            {log.notes && (
                              <div className="col-span-2 text-[11px] text-orange-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {log.notes}
                              </div>
                            )}
                          </>
                        )}

                        {isActive && (
                          <>
                            {isOutsource ? (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <Building className="w-3.5 h-3.5 text-orange-400" />
                                <span>외주처: <strong className="text-orange-400">{relatedOutsource?.supplier_name || '발주대기'}</strong></span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-brand-400" />
                                <span>작업자: <strong className="text-text-primary">{log.worker || '작업자'}</strong></span>
                              </div>
                            )}
                            <div>
                              <span>진행 수량: <strong className="text-brand-400">{log.start_qty || item.production_qty}개</strong></span>
                            </div>
                            {log.start_time && (
                              <div className="col-span-2 text-[11px] text-text-tertiary">
                                시작 시간: {new Date(log.start_time).toLocaleString()}
                              </div>
                            )}
                          </>
                        )}

                        {!isCompleted && !isActive && (
                          <div className="col-span-2 text-text-tertiary">
                            이전 공정 완료 후 작업이 진행됩니다.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none p-4 border-t border-border-default bg-bg-surface flex justify-end">
          <Button variant="outline" onClick={onClose} size="sm" className="w-24">
            닫기
          </Button>
        </div>
      </Card>
    </div>
  );
};
