import React, { useState } from 'react';
import { AlertSetting, Stock } from '../types';
import { Bell, Plus, Trash2, CheckCircle2, TrendingUp, TrendingDown, Clock, ShieldAlert } from 'lucide-react';

interface AlertsPanelProps {
  stocks: Stock[];
  alerts: AlertSetting[];
  onAddAlert: (symbol: string, targetPrice: number, condition: 'ABOVE' | 'BELOW') => void;
  onRemoveAlert: (id: string) => void;
}

export default function AlertsPanel({ stocks, alerts, onAddAlert, onRemoveAlert }: AlertsPanelProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.symbol || '');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [validationError, setValidationError] = useState('');

  // Search autocomplete state
  const [searchStockQuery, setSearchStockQuery] = useState('');
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);

  const currentSelectedStock = stocks.find(s => s.symbol === selectedSymbol) || stocks[0];

  // Options matching the search query
  const filteredOptions = stocks.filter(s => {
    const term = searchStockQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      s.symbol.includes(term) ||
      s.nameEn.toLowerCase().includes(term)
    );
  });

  // Formatting helper
  const formatValue = (symbol: string, price: number) => {
    if (symbol === 'NVDA' || symbol === 'TSLA' || symbol === 'AAPL') {
      return `$${price.toLocaleString()}`;
    }
    return `₩${Math.round(price).toLocaleString()}`;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const parsedPrice = parseFloat(targetPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setValidationError('유효한 가격을 입력해 주세요.');
      return;
    }

    onAddAlert(selectedSymbol, parsedPrice, condition);
    setTargetPrice('');
    setSearchStockQuery('');
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left" id="alerts-panel">
      {/* Panel header */}
      <div className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
        <Bell className="h-5 w-5 text-emerald-400" />
        <h3 className="font-sans text-base font-bold text-zinc-100">사용자 맞춤형 알림 설정</h3>
      </div>

      {/* Alarm parameters creation form */}
      <form onSubmit={handleCreate} className="mb-6 space-y-4" id="form-add-alert">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Stock selector */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">대상 종목 검색</label>
            <div className="relative">
              <input
                type="text"
                placeholder={currentSelectedStock ? `${currentSelectedStock.name} (${currentSelectedStock.symbol})` : '종목명 또는 심볼...'}
                value={searchStockQuery}
                onFocus={() => {
                  setIsStockDropdownOpen(true);
                  setSearchStockQuery('');
                }}
                onChange={(e) => {
                  setSearchStockQuery(e.target.value);
                  setIsStockDropdownOpen(true);
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-sans text-xs text-zinc-200 outline-none focus:border-emerald-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 pointer-events-none">
                ▼
              </span>
            </div>

            {isStockDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => {
                    setIsStockDropdownOpen(false);
                    setSearchStockQuery(currentSelectedStock ? currentSelectedStock.name : '');
                  }}
                />
                <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-1 shadow-2xl">
                  {filteredOptions.length === 0 ? (
                    <div className="p-2 text-center text-[11px] text-zinc-500">대응되는 종목 없음</div>
                  ) : (
                    filteredOptions.map(s => (
                      <button
                        key={s.symbol}
                        type="button"
                        onClick={() => {
                          setSelectedSymbol(s.symbol);
                          setSearchStockQuery(s.name);
                          setIsStockDropdownOpen(false);
                        }}
                        className={`w-full text-left rounded-md px-3 py-1.5 text-xs font-sans transition-colors flex items-center justify-between ${
                          selectedSymbol === s.symbol
                            ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                            : 'text-zinc-300 hover:bg-zinc-900'
                        }`}
                      >
                        <span>{s.name}</span>
                        <span className="font-mono text-[10px] text-zinc-500">{s.symbol}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Condition type selector */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">비교 조건</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as 'ABOVE' | 'BELOW')}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-sans text-xs text-zinc-200 outline-none focus:border-emerald-500"
            >
              <option value="ABOVE">이상 (📈 지정가격 돌파시)</option>
              <option value="BELOW">이하 (📉 지정가격 도달시)</option>
            </select>
          </div>

          {/* Target Price input */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">목표 기준단가</label>
            <div className="relative">
              <input
                type="number"
                step="any"
                placeholder={currentSelectedStock ? `현재: ${currentSelectedStock.price}` : '가격 설정'}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                id="alert-target-price"
              />
            </div>
          </div>
        </div>

        {validationError && (
          <p className="text-[11px] text-rose-400">{validationError}</p>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2.5 font-sans text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition-colors"
          id="btn-add-alert"
        >
          <Plus className="h-4 w-4" />
          실시간 푸시 알림 등록
        </button>
      </form>

      {/* Active and Triggered Alerts List */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-zinc-400">설정된 알림 목록</h4>

        {alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-zinc-500 text-xs">
            설정된 실시간 알림이 없습니다. 위의 종목과 기준 타겟 단가를 입력해 활성화해 보세요!
          </div>
        ) : (
          <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                  alert.isTriggered
                    ? 'border-emerald-900/30 bg-emerald-500/5 opacity-75'
                    : 'border-zinc-800 bg-zinc-950/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    alert.isTriggered ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {alert.isTriggered ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : alert.condition === 'ABOVE' ? (
                      <TrendingUp className="h-4 w-4 text-rose-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-blue-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-sans text-xs font-bold text-zinc-200">
                      {alert.stockName}
                    </div>
                    <div className="font-sans text-[10px] text-zinc-400">
                      {alert.condition === 'ABOVE' ? '돌파 이상 ↑' : '도달 이하 ↓'} ·{' '}
                      <span className="font-mono">{formatValue(alert.symbol, alert.targetPrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {alert.isTriggered ? (
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 animate-pulse">
                      알림 발송완료
                    </span>
                  ) : (
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                      모니터링 중
                    </span>
                  )}
                  <button
                    onClick={() => onRemoveAlert(alert.id)}
                    className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                    title="알림 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
