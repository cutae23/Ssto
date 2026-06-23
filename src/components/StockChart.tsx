import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Candle, Stock } from '../types';
import { Bell, HelpCircle, TrendingUp, TrendingDown, Star } from 'lucide-react';

interface StockChartProps {
  stock: Stock;
  candles: Candle[];
  isWatched?: boolean;
  onToggleWatchlist?: (symbol: string) => void;
  onUpdateStock?: (symbol: string, fields: any) => Promise<void>;
  timeframe: '1m' | '5m' | '1d';
  onTimeframeChange: (tf: '1m' | '5m' | '1d') => void;
}

export default function StockChart({ 
  stock, 
  candles, 
  isWatched = false, 
  onToggleWatchlist, 
  onUpdateStock,
  timeframe,
  onTimeframeChange
}: StockChartProps) {
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Live Flash Effect on Price Tick
  const [flash, setFlash] = useState<'UP' | 'DOWN' | null>(null);
  const prevPriceRef = useRef(stock.price);

  useEffect(() => {
    if (stock.price > prevPriceRef.current) {
      setFlash('UP');
      const timer = setTimeout(() => setFlash(null), 1000);
      return () => clearTimeout(timer);
    } else if (stock.price < prevPriceRef.current) {
      setFlash('DOWN');
      const timer = setTimeout(() => setFlash(null), 1000);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = stock.price;
  }, [stock.price]);

  // Calibration Form State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [formData, setFormData] = useState({
    price: '',
    prevClose: '',
    open: '',
    high: '',
    low: '',
    high52Week: '',
    low52Week: '',
    nxtPrice: ''
  });
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');

  const triggerOpenCalibration = () => {
    setFormData({
      price: String(stock.price),
      prevClose: String(stock.prevClose),
      open: String(stock.open ?? stock.price),
      high: String(stock.high ?? stock.price),
      low: String(stock.low ?? stock.price),
      high52Week: String(stock.high52Week),
      low52Week: String(stock.low52Week),
      nxtPrice: stock.nxtPrice !== undefined ? String(stock.nxtPrice) : ''
    });
    setSaveStatus('IDLE');
    setIsCalibrating(!isCalibrating);
  };

  const handleCalibrateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateStock) return;
    setSaveStatus('SAVING');
    
    try {
      await onUpdateStock(stock.symbol, {
        price: Number(formData.price),
        prevClose: Number(formData.prevClose),
        open: Number(formData.open),
        high: Number(formData.high),
        low: Number(formData.low),
        high52Week: Number(formData.high52Week),
        low52Week: Number(formData.low52Week),
        nxtPrice: formData.nxtPrice !== '' ? Number(formData.nxtPrice) : undefined,
        resetCalibration: false
      });
      setSaveStatus('SUCCESS');
      setTimeout(() => {
        setIsCalibrating(false);
        setSaveStatus('IDLE');
      }, 1200);
    } catch (err) {
      console.error(err);
      setSaveStatus('IDLE');
    }
  };

  const handleResetCalibration = async () => {
    if (!onUpdateStock) return;
    setSaveStatus('SAVING');
    try {
      await onUpdateStock(stock.symbol, {
        resetCalibration: true
      });
      setSaveStatus('SUCCESS');
      setTimeout(() => {
        setIsCalibrating(false);
        setSaveStatus('IDLE');
      }, 1200);
    } catch (err) {
      console.error(err);
      setSaveStatus('IDLE');
    }
  };

  // Chart Dimensions
  const width = 640;
  const height = 280;
  const paddingRight = 60;
  const paddingTop = 20;
  const paddingBottom = 40;
  const paddingLeft = 10;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Smoothly blend the live ticking stock price into the last candle on-the-fly inside the client component
  const computedCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const arr = [...candles];
    const lastIdx = arr.length - 1;
    const last = { ...arr[lastIdx] };
    
    last.close = stock.price;
    if (stock.open !== undefined) last.open = stock.open;
    last.high = Math.max(stock.high ?? stock.price, last.high, stock.price);
    last.low = Math.min(stock.low ?? stock.price, last.low, stock.price);
    
    arr[lastIdx] = last;
    return arr;
  }, [candles, stock.price, stock.open, stock.high, stock.low]);

  // Determine low/high price range in candles to auto-scale properly
  const { minPrice, maxPrice, stepPrice } = useMemo(() => {
    if (computedCandles.length === 0) return { minPrice: 0, maxPrice: 100, stepPrice: 20 };
    let min = Infinity;
    let max = -Infinity;
    
    computedCandles.forEach(c => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });

    // Add brief cushions
    const delta = max - min;
    const padding = delta * 0.1 || 10;
    const finalMin = Math.max(0, min - padding);
    const finalMax = max + padding;
    
    return {
      minPrice: finalMin,
      maxPrice: finalMax,
      stepPrice: (finalMax - finalMin) / 4
    };
  }, [computedCandles]);

  const priceGridPoints = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 4; i++) {
      points.push(minPrice + stepPrice * i);
    }
    return points;
  }, [minPrice, stepPrice]);

  // Coordinate Conversion Helper
  const getX = (index: number) => {
    if (computedCandles.length <= 1) return paddingLeft;
    return paddingLeft + (index / (computedCandles.length - 1)) * chartWidth;
  };

  const getY = (price: number) => {
    if (maxPrice === minPrice) return paddingTop + chartHeight / 2;
    // Lower price -> higher Y coordinate (inverted since Y=0 is top)
    return paddingTop + chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
  };

  const isRealData = useMemo(() => {
    return computedCandles.length > 0 && computedCandles.some(c => c.isReal === true);
  }, [computedCandles]);

  const activeCandle = hoveredCandle || (computedCandles.length > 0 ? computedCandles[computedCandles.length - 1] : null);

  // Formatting currency Helper
  const formatCurrency = (val: number) => {
    if (stock.symbol === 'NVDA' || stock.symbol === 'TSLA' || stock.symbol === 'AAPL') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
    }
    return `₩${Math.round(val).toLocaleString()}`;
  };

  const isUp = stock.changePercent >= 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex-1 min-w-[320px]" id="stock-chart-panel">
      {/* Chart Title and Timeframe toggler */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap text-zinc-100">
            <span className="text-sm font-semibold tracking-wide text-zinc-400 font-mono uppercase">{stock.symbol}</span>
            <span className="text-lg font-bold">{stock.name.replace(' (Nx대체)', '')}</span>
            <span className="text-xs text-zinc-500 font-mono mr-1">{stock.nameEn}</span>
            
            {/* Exchange Badges */}
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[9px] font-black text-rose-450 uppercase tracking-widest leading-none">
              KRX 한국거래소
            </span>
            {(stock.nxtPrice !== undefined || stock.name.includes('Nx대체')) && (
              <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none">
                Nextrade 대체거래소 (ATS)
              </span>
            )}
            
            {isRealData ? (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                실시간 연동 (Yahoo Finance)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-normal text-zinc-400">
                ⚠️ 교정용 가상 보정 데이터
              </span>
            )}
            
            {onToggleWatchlist && (
              <button
                onClick={() => onToggleWatchlist(stock.symbol)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ml-1 ${
                  isWatched
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-zinc-950 text-zinc-500 hover:text-amber-400 hover:border-amber-500/30 border border-zinc-800'
                }`}
                title={isWatched ? "관심 종목 등록 해제" : "관심 종목으로 설정"}
                type="button"
              >
                <Star className={`h-3 w-3 ${isWatched ? 'fill-current text-amber-400' : ''}`} />
                <span>{isWatched ? '관심종목 등록됨' : '관심종목 등록'}</span>
              </button>
            )}
          </div>
          
          {/* Active Price HUD */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className={`mt-1 flex items-baseline gap-2 px-2 py-0.5 rounded-lg transition-all duration-300 ${
              flash === 'UP'
                ? 'bg-rose-500/10 border border-rose-500/20 animate-pulse'
                : flash === 'DOWN'
                ? 'bg-blue-500/10 border border-blue-500/20 animate-pulse'
                : 'border border-transparent'
            }`}>
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white" title="KRX 정규장 종가">
                {formatCurrency(stock.price)}
              </span>
              <span className={`font-mono text-xs sm:text-sm font-semibold flex items-center gap-0.5 ${isUp ? 'text-rose-500' : 'text-blue-500'}`}>
                {isUp ? '+' : ''}{stock.change.toLocaleString()} ({isUp ? '+' : ''}{stock.changePercent}%)
              </span>
            </div>

            {stock.nxtPrice !== undefined && (
              <div className="mt-1 flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shrink-0" title="Nextrade 대체거래소 야간 종가">
                <span className="text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded uppercase tracking-wider">Nx 대체거래</span>
                <span className="font-mono font-bold text-indigo-300 text-xs sm:text-sm">
                  {formatCurrency(stock.nxtPrice)}
                </span>
                <span className={`font-mono text-[10px] sm:text-xs font-semibold ${stock.nxtChangePercent !== undefined && stock.nxtChangePercent >= 0 ? 'text-indigo-400' : 'text-blue-400'}`}>
                  ({stock.nxtChangePercent !== undefined && stock.nxtChangePercent >= 0 ? '+' : ''}{stock.nxtChangePercent}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Time intervals selector */}
        <div className="flex rounded-lg bg-zinc-950 p-1">
          {(['1m', '5m', '1d'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`rounded-md px-3 py-1 font-mono text-xs font-bold transition-all ${
                timeframe === tf
                  ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Selected/Hovered Candle Information Panel */}
      <div className="mb-3 grid grid-cols-5 gap-2 rounded-xl bg-zinc-950/80 p-3 font-mono text-[11px] text-zinc-300">
        <div>
          <span className="block text-zinc-500">일자/시간</span>
          <span className="font-semibold text-zinc-200">{activeCandle?.time || '—'}</span>
        </div>
        <div>
          <span className="block text-zinc-500">시가 (O)</span>
          <span className="font-semibold text-zinc-200">{activeCandle ? formatCurrency(activeCandle.open) : '—'}</span>
        </div>
        <div>
          <span className="block text-zinc-500">고가 (H)</span>
          <span className="font-semibold text-zinc-200 text-rose-400">{activeCandle ? formatCurrency(activeCandle.high) : '—'}</span>
        </div>
        <div>
          <span className="block text-zinc-500">저가 (L)</span>
          <span className="font-semibold text-zinc-200 text-blue-400">{activeCandle ? formatCurrency(activeCandle.low) : '—'}</span>
        </div>
        <div>
          <span className="block text-zinc-500">종가 (C)</span>
          <span className="font-semibold text-zinc-100">{activeCandle ? formatCurrency(activeCandle.close) : '—'}</span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative select-none rounded-xl bg-zinc-950 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseLeave={() => {
            setHoveredCandle(null);
            setHoverIndex(null);
          }}
        >
          {/* Horizontal Gridlines & Right Scales */}
          {priceGridPoints.map((price, idx) => {
            const y = getY(price);
            return (
              <g key={idx} className="opacity-40">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#27272a"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <text
                  x={width - paddingRight + 8}
                  y={y + 4}
                  fill="#71717a"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  {formatCurrency(price)}
                </text>
              </g>
            );
          })}

          {/* Render Candles */}
          {computedCandles.map((candle, idx) => {
            const x = getX(idx);
            const yOpen = getY(candle.open);
            const yClose = getY(candle.close);
            const yHigh = getY(candle.high);
            const yLow = getY(candle.low);
            
            const isCandleUp = candle.close >= candle.open;
            const barLeft = x - 4;
            const barWidth = 8;
            const barTop = Math.min(yOpen, yClose);
            const barHeight = Math.max(1, Math.abs(yClose - yOpen));
            
            // Volume Chart Bar at the bottom
            const maxVol = Math.max(...computedCandles.map(c => c.volume), 1);
            const volHeight = (candle.volume / maxVol) * 40;
            const volTop = height - paddingBottom - volHeight;

            return (
              <g
                key={idx}
                onMouseEnter={() => {
                  setHoveredCandle(candle);
                  setHoverIndex(idx);
                }}
                className="cursor-crosshair"
              >
                {/* Volume Bar */}
                <rect
                  x={x - 3}
                  y={volTop}
                  width={6}
                  height={volHeight}
                  fill={isCandleUp ? "#f43f5e" : "#3b82f6"}
                  opacity={hoverIndex === idx ? 0.6 : 0.25}
                />

                {/* Candle Shadow Wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={isCandleUp ? "#f43f5e" : "#3b82f6"}
                  strokeWidth={1.5}
                />

                {/* Candle Body */}
                <rect
                  x={barLeft}
                  y={barTop}
                  width={barWidth}
                  height={barHeight}
                  fill={isCandleUp ? "#f43f5e" : "#3b82f6"}
                  stroke={isCandleUp ? "#f43f5e" : "#3b82f6"}
                  strokeWidth={1}
                  rx={1}
                />

                {/* Secret Transparent Hover Overlay to make hover easier */}
                <rect
                  x={x - 7}
                  y={paddingTop}
                  width={14}
                  height={chartHeight}
                  fill="transparent"
                />
              </g>
            );
          })}

          {/* Interactive Crosshair Hover line */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={paddingTop}
                x2={getX(hoverIndex)}
                y2={height - paddingBottom}
                stroke="#a1a1aa"
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.6}
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(computedCandles[hoverIndex].close)}
                r={4}
                fill="#ffffff"
                stroke={computedCandles[hoverIndex].close >= computedCandles[hoverIndex].open ? "#f43f5e" : "#3b82f6"}
                strokeWidth={2}
              />
            </g>
          )}
        </svg>

        {/* Dynamic Timeline dates scale */}
        <div className="mt-2 flex justify-between px-2 text-[10px] text-zinc-500 font-mono">
          <span>{computedCandles[0]?.time}</span>
          <span>{computedCandles[Math.floor(computedCandles.length / 2)]?.time}</span>
          <span>{computedCandles[computedCandles.length - 1]?.time} (실시간 갱신)</span>
        </div>
      </div>

      {/* Manual Price Calibration Drawer Panel */}
      {onUpdateStock && (
        <div className="mt-4 border-t border-zinc-800/60 pt-4 text-left">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-zinc-500 max-w-[70%]">
              * 해당 종목의 가격이나 52주 시가가 실제 데이터와 다른 경우, 아래 직접 교정기를 통해 숫자를 즉시 수정할 수 있습니다.
            </span>
            <button
              onClick={triggerOpenCalibration}
              type="button"
              className={`rounded-lg px-3 py-1 font-sans text-xs font-bold transition-all cursor-pointer ${
                isCalibrating
                  ? 'bg-zinc-850 text-rose-400 border border-rose-500/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/25 border border-zinc-800'
              }`}
            >
              {isCalibrating ? '교정 창 닫기' : '✏️ 시세 직접 수정 / 교정'}
            </button>
          </div>

          {isCalibrating && (
            <form onSubmit={handleCalibrateSubmit} className="mt-3 rounded-xl bg-zinc-950 p-4 border border-zinc-800 space-y-3">
              <div className="text-xs font-bold text-emerald-400 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span>📊 {stock.name}({stock.symbol}) 시세 변수 수치 보정</span>
                  {stock.isCalibrated && (
                    <span className="rounded bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 text-[9.5px] text-rose-400 font-normal">
                      ⚠️ 고정됨(실시간 연동 차단 중)
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500 font-normal">단위: KRW(원화) 또는 USD(달러)</span>
              </div>

              {stock.isCalibrated && (
                <div className="rounded-lg bg-zinc-900/50 p-2.5 border border-zinc-850 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">
                    * 이 종목은 현재 시세 직접 교정기로 수치가 고정되어 실시간 연동에 의해 수정되지 않습니다.
                  </span>
                  <button
                    type="button"
                    onClick={handleResetCalibration}
                    disabled={saveStatus === 'SAVING'}
                    className="rounded bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 border border-rose-900/40 px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    {saveStatus === 'SAVING' ? '처리 중...' : '실시간 시세 연동으로 복구'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">현재가 (Price)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">전일 종가 (PrevClose)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.prevClose}
                    onChange={(e) => setFormData({ ...formData, prevClose: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">금일 시가 (Open)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.open}
                    onChange={(e) => setFormData({ ...formData, open: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">금일 고가 (High)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.high}
                    onChange={(e) => setFormData({ ...formData, high: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">금일 저가 (Low)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.low}
                    onChange={(e) => setFormData({ ...formData, low: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">52주 최고가</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.high52Week}
                    onChange={(e) => setFormData({ ...formData, high52Week: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 mb-1">52주 최저가</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.low52Week}
                    onChange={(e) => setFormData({ ...formData, low52Week: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                  />
                </div>
                {/^\d{6}$/.test(stock.symbol) && stock.name.includes('Nx대체') ? (
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Nx 대체거래소 야간가 (선택)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.nxtPrice}
                      onChange={(e) => setFormData({ ...formData, nxtPrice: e.target.value })}
                      placeholder="입력 시 Nx대체 고정"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  <div className="hidden sm:block"></div>
                )}
                <div className="flex items-end col-span-2 sm:col-span-4 mt-1">
                  <button
                    type="submit"
                    disabled={saveStatus === 'SAVING'}
                    className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-sans text-xs font-black py-2.5 cursor-pointer transition-colors"
                  >
                    {saveStatus === 'SAVING' ? '저장 중...' : saveStatus === 'SUCCESS' ? '✓ 저장 성공' : '보정 수치 저장'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
