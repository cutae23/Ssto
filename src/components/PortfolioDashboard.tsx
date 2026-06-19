import React, { useState } from 'react';
import { PortfolioItem, Stock } from '../types';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, ShoppingCart, DollarSign } from 'lucide-react';

interface PortfolioDashboardProps {
  stocks: Stock[];
  portfolio: PortfolioItem[];
  cash: number;
  onTrade: (symbol: string, shares: number, price: number, type: 'BUY' | 'SELL') => void;
}

export default function PortfolioDashboard({ stocks, portfolio, cash, onTrade }: PortfolioDashboardProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.symbol || '');
  const [tradeShares, setTradeShares] = useState<string>('10');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeError, setTradeError] = useState('');

  // Search autocomplete state
  const [searchStockQuery, setSearchStockQuery] = useState('');
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);

  const activeStock = stocks.find(s => s.symbol === selectedSymbol) || stocks[0];

  // Options matching the search query
  const filteredOptions = stocks.filter(s => {
    const term = searchStockQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      s.symbol.includes(term) ||
      (s.nameEn ? s.nameEn.toLowerCase().includes(term) : false)
    );
  });

  // Calculations
  const getHoldingValue = (item: PortfolioItem) => {
    const currentStock = stocks.find(s => s.symbol === item.symbol);
    const price = currentStock ? currentStock.price : item.buyAvgPrice;
    return item.shares * price;
  };

  const getHoldingCost = (item: PortfolioItem) => {
    return item.shares * item.buyAvgPrice;
  };

  const totalHoldingsValue = portfolio.reduce((sum, item) => sum + getHoldingValue(item), 0);
  const totalCost = portfolio.reduce((sum, item) => sum + getHoldingCost(item), 0);
  const totalAssets = totalHoldingsValue + cash;

  const totalProfit = totalHoldingsValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const formatKRW = (val: number) => {
    // If USD based stock, we can assume USD/KRW exchange rate is 1,300 to display standard unit
    return `${Math.round(val).toLocaleString()}원`;
  };

  // Convert USD to approximate KRW if needed to standardise portfolio calculations
  const getStandardizedPrice = (stock: Stock) => {
    if (stock.symbol === 'NVDA' || stock.symbol === 'TSLA' || stock.symbol === 'AAPL') {
      return stock.price * 1350; // Use fixed 2026-like exchange rate
    }
    return stock.price;
  };

  const handleTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTradeError('');

    const shares = parseInt(tradeShares);
    if (isNaN(shares) || shares <= 0) {
      setTradeError('수량은 1주 이상이어야 합니다.');
      return;
    }

    const price = getStandardizedPrice(activeStock);
    const totalCost = shares * price;

    if (tradeType === 'BUY') {
      if (cash < totalCost) {
        setTradeError('예수금이 부족합니다! (자산 환산 필요)');
        return;
      }
    } else {
      const held = portfolio.find(item => item.symbol === selectedSymbol);
      if (!held || held.shares < shares) {
        setTradeError('보유 수량을 초과해 매도할 수 없습니다.');
        return;
      }
    }

    onTrade(selectedSymbol, shares, price, tradeType);
    setTradeShares('10');
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left" id="portfolio-panel">
      {/* Panel Header */}
      <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-400" />
          <h3 className="font-sans text-base font-bold text-zinc-100">모의 투자 수익률 대시보드</h3>
        </div>
        <span className="font-mono text-[10px] text-zinc-400 font-bold">GUEST RETS ENGINE</span>
      </div>

      {/* Primary Financial HUDs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Assets */}
        <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-900">
          <span className="block text-[11px] font-semibold text-zinc-500">총 평가 자산 (예수금 포함)</span>
          <span className="mt-1 block font-mono text-lg font-black text-zinc-100">
            {formatKRW(totalAssets)}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            예수금: {formatKRW(cash)}
          </span>
        </div>

        {/* Investment results Profit & Loss */}
        <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-900">
          <span className="block text-[11px] font-semibold text-zinc-500">총 평가 가치액</span>
          <span className="mt-1 block font-mono text-lg font-bold text-zinc-100">
            {formatKRW(totalHoldingsValue)}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            매수금액: {formatKRW(totalCost)}
          </span>
        </div>

        {/* Investment Result Rate */}
        <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-900">
          <span className="block text-[11px] font-semibold text-zinc-500">총 투자 평가손익</span>
          <span className={`mt-1 block font-mono text-lg font-bold ${totalProfit >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatKRW(totalProfit)}
          </span>
          <span className={`text-[10px] font-bold block mt-0.5 ${totalProfit >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
            수익률: {totalProfit >= 0 ? '+' : ''}{totalProfitPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Row splits: Holdings details, Buy/Sell engine */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left: Active Holdings List */}
        <div className="md:col-span-7 space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 mb-2">나의 주식 자산 구성 목록</h4>

          {portfolio.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500 text-xs">
              우측 주문 창을 통해 모의 투자를 가동해 보세요! 실시간 가격 연동으로 리얼 손익이 발생합니다.
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {portfolio.map(item => {
                const liveStock = stocks.find(s => s.symbol === item.symbol);
                if (!liveStock) return null;

                const livePrice = getStandardizedPrice(liveStock);
                const valCost = getHoldingCost(item);
                const valLive = getHoldingValue(item);
                const itemProfit = valLive - valCost;
                const itemProfitPercent = valCost > 0 ? (itemProfit / valCost) * 100 : 0;
                
                // Asset allocation percentage
                const weight = totalAssets > 0 ? (valLive / totalAssets) * 100 : 0;

                return (
                  <div key={item.symbol} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-left">
                        <span className="font-sans text-xs font-bold text-zinc-200">{item.stockName}</span>
                        <span className="font-mono text-[10px] text-zinc-500 ml-1.5">{item.symbol}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono text-xs font-bold ${itemProfit >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                          {itemProfit >= 0 ? '+' : ''}{itemProfitPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[10px] text-zinc-400">
                      <div>
                        <span className="block text-zinc-600">평가액</span>
                        <span className="font-semibold text-zinc-300">{formatKRW(valLive)}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-600">평단가/보유</span>
                        <span className="font-semibold text-zinc-300">{formatKRW(item.buyAvgPrice)} / {item.shares}주</span>
                      </div>
                      <div>
                        <span className="block text-zinc-600">자산비중</span>
                        <span className="font-semibold text-zinc-300">{weight.toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Weight progress bar */}
                    <div className="mt-2 h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, weight)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick Buy/Sell Trade Order Panel */}
        <div className="md:col-span-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h4 className="flex items-center gap-1.5 font-sans text-xs font-bold text-zinc-300 mb-3">
            <ShoppingCart className="h-4 w-4 text-emerald-400" />
            실시간 모의 체결 주문서
          </h4>

          <form onSubmit={handleTradeSubmit} className="space-y-3" id="form-portfolio-trade">
            {/* Stock selector */}
            <div className="relative">
              <label className="block text-[10px] font-semibold text-zinc-500 mb-1">매매 종목 검색</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={activeStock ? `${activeStock.name} (${formatKRW(getStandardizedPrice(activeStock))})` : '매매 종목 검색 (예: 육일)...'}
                  value={searchStockQuery}
                  onFocus={() => {
                    setIsStockDropdownOpen(true);
                    setSearchStockQuery('');
                  }}
                  onChange={(e) => {
                    setSearchStockQuery(e.target.value);
                    setIsStockDropdownOpen(true);
                  }}
                  className="w-full rounded-lg border border-zinc-805 bg-zinc-900 px-2.5 py-1.5 font-sans text-xs text-zinc-200 outline-none"
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
                      setSearchStockQuery(activeStock ? activeStock.name : '');
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
                          <span className="font-mono text-[10px] text-zinc-500">{formatKRW(getStandardizedPrice(s))}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Type selector (Buy vs Sell) */}
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 mb-1">주문 유형</label>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-900 p-1">
                {(['BUY', 'SELL'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTradeType(type)}
                    className={`rounded-md py-1 text-xs font-bold transition-all ${
                      tradeType === type
                        ? type === 'BUY'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {type === 'BUY' ? '모의매수' : '모의매도'}
                  </button>
                ))}
              </div>
            </div>

            {/* Shares input */}
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 mb-1">매매수량</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={tradeShares}
                  onChange={(e) => setTradeShares(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none"
                  id="trade-shares-count"
                />
                <span className="text-xs text-zinc-400 whitespace-nowrap">주</span>
              </div>
            </div>

            {/* Error messaging */}
            {tradeError && (
              <p className="text-[10px] text-rose-400 font-sans">{tradeError}</p>
            )}

            {/* Summary details */}
            <div className="rounded-lg bg-zinc-900/60 p-2 text-left font-sans text-[10px] text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>환산 1주 가격:</span>
                <span className="font-mono text-zinc-200">{formatKRW(getStandardizedPrice(activeStock))}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-1 font-semibold">
                <span>총 주문 예측액:</span>
                <span className="font-mono text-emerald-400">{formatKRW(parseInt(tradeShares || '0') * getStandardizedPrice(activeStock))}</span>
              </div>
            </div>

            {/* Execution action button */}
            <button
              type="submit"
              className={`w-full rounded-lg py-2 text-xs font-bold transition-all ${
                tradeType === 'BUY'
                  ? 'bg-rose-500 text-white hover:bg-rose-400'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
              id="btn-execute-trade"
            >
              간편 모의체결 완료
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
