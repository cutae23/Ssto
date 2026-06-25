import React, { useState, useEffect } from 'react';
import { MarketTheme } from '../types';
import { MARKET_THEMES } from '../data/mockStocks';
import { 
  Layers, 
  Star, 
  TrendingUp, 
  Sparkles, 
  RefreshCw, 
  ShieldAlert, 
  Calendar, 
  GraduationCap, 
  Activity,
  Award
} from 'lucide-react';

interface ThemeLabProps {
  onAddStockToWatchlist: (symbol: string) => void;
  watchlistSymbols: string[];
}

export default function ThemeLab({ onAddStockToWatchlist, watchlistSymbols }: ThemeLabProps) {
  const [themes, setThemes] = useState<MarketTheme[]>(MARKET_THEMES);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState<number>(0);

  // Set initial selection once themes load
  useEffect(() => {
    if (themes.length > 0 && !selectedThemeId) {
      setSelectedThemeId(themes[0].id);
    }
  }, [themes, selectedThemeId]);

  const currentTheme = themes.find(t => t.id === selectedThemeId) || themes[0] || MARKET_THEMES[0];

  const handleGenerateThemes = async () => {
    try {
      setIsGenerating(true);
      setProgressStep(1);
      
      const interval = setInterval(() => {
        setProgressStep(prev => {
          if (prev < 4) return prev + 1;
          return prev;
        });
      }, 1500);

      const passcode = localStorage.getItem('sa_ai_access_code') || '';
      const userApiKey = localStorage.getItem('custom_gemini_api_key') || '';
      const res = await fetch('/api/themes/ai-generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-ai-access-code': passcode,
          'X-Gemini-Api-Key': userApiKey,
        }
      });

      clearInterval(interval);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setThemes(data);
          setSelectedThemeId(data[0].id);
        }
      } else if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'AI_ACCESS_LOCKED') {
          window.dispatchEvent(new CustomEvent('unauthorized-ai'));
        }
      }
    } catch (err) {
      console.error('Error generating AI themes:', err);
    } finally {
      setIsGenerating(false);
      setProgressStep(0);
    }
  };

  const getStatusColorClass = (color?: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cyan': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'amber': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-zinc-800/80 text-zinc-300 border-zinc-700/50';
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left" id="theme-lab-panel">
      {/* Panel Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="font-sans text-base font-bold text-zinc-100">요즘 핫 테마 및 수명주기 대분석</h3>
            <p className="text-[10px] text-zinc-500">글로벌 애널리스트 합의 및 인포그래픽 시각화 트래커</p>
          </div>
        </div>
        <button
          onClick={handleGenerateThemes}
          disabled={isGenerating}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 font-sans text-xs font-black text-zinc-950 shadow-md hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 transition-all font-mono"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          AI 기반 실시간 핫테마 & 전문가 견해 분석
        </button>
      </div>

      {/* Loading overlay with creative status states */}
      {isGenerating && (
        <div className="my-10 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/80 p-8 text-center space-y-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 animate-spin">
            <RefreshCw className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-zinc-200">Gemini LLM 주식 테마 분석 엔진 가동중...</p>
          <div className="max-w-xs mx-auto space-y-1.5 text-left text-[11px] font-mono">
            <div className={`flex items-center gap-2 ${progressStep >= 1 ? 'text-emerald-400' : 'text-zinc-600'}`}>
              <span>•</span>
              <span>{progressStep >= 1 ? '✓' : '◌'} 월가 & 글로벌 IB 수급 레포트 취합 및 스캐닝</span>
            </div>
            <div className={`flex items-center gap-2 ${progressStep >= 2 ? 'text-emerald-400' : 'text-zinc-600'}`}>
              <span>•</span>
              <span>{progressStep >= 2 ? '✓' : '◌'} 요즘 가장 뜨거운 기저동력 기술 테마 6선 특징 비교</span>
            </div>
            <div className={`flex items-center gap-2 ${progressStep >= 3 ? 'text-emerald-400' : 'text-zinc-600'}`}>
              <span>•</span>
              <span>{progressStep >= 3 ? '✓' : '◌'} 테마별 전문가 긍정률 및 거품 지수(Speculation Gap) 정량화</span>
            </div>
            <div className={`flex items-center gap-2 ${progressStep >= 4 ? 'text-emerald-400' : 'text-zinc-600'}`}>
              <span>•</span>
              <span>{progressStep >= 4 ? '✓' : '◌'} 대표 수혜 상장주 파싱 및 인포그래픽 타임라인 도식화</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Theme Contents Block */}
      {!isGenerating && currentTheme && (
        <>
          {/* Concept selection tabs */}
          <div className="mb-6 flex flex-wrap gap-1.5">
            {themes.map(theme => (
              <button
                key={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                className={`rounded-xl px-3.5 py-2 text-[11px] font-bold transition-all border ${
                  selectedThemeId === theme.id
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Core definitions, gauges and expert ratings */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Definition Box */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <span className="inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-400 font-bold mb-2">
                  테마 프로파일
                </span>
                <h4 className="font-sans text-sm font-black text-zinc-100 mb-1.5">{currentTheme.name}</h4>
                <p className="font-sans text-xs text-zinc-400 leading-relaxed mb-3">
                  {currentTheme.description}
                </p>
                <div className="border-t border-zinc-900 pt-2.5 text-[11px] text-zinc-400">
                  <span className="font-semibold text-emerald-400 block sm:inline">성장 핵심동력 (Catalyst):</span> {currentTheme.growthDriver}
                </div>
              </div>

              {/* Status Badge */}
              <div className={`rounded-xl border p-4 ${getStatusColorClass(currentTheme.statusInfo?.color || 'emerald')}`}>
                <div className="mb-1 flex items-center gap-1.5 font-sans text-xs font-black">
                  <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                  현시점 수명주기 진단: {currentTheme.statusInfo?.title || '수명 지표 분석 완료'}
                </div>
                <p className="font-sans text-xs leading-relaxed text-zinc-300">
                  {currentTheme.statusInfo?.description}
                </p>
              </div>

              {/* Advanced Indicators Dashboard (Deep Infographics for Consensus) */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
                <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-1">
                  <Activity className="h-3 w-3 text-emerald-500" />
                  실시간 투심 & 거품 정량 분석기
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Bullishness Meter */}
                  <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-zinc-400 font-medium">전문가 긍정률</span>
                      <span className="text-xs font-mono font-black text-emerald-400">{currentTheme.expertBullishness || 75}%</span>
                    </div>
                    {/* Linear graphic gauge */}
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${currentTheme.expertBullishness || 75}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-1.5 leading-snug">
                      기관/외인 투자 포지티브 합의
                    </p>
                  </div>

                  {/* Bubble Meter */}
                  <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-zinc-400 font-medium">단기 거품 지수</span>
                      <span className={`text-xs font-mono font-black ${
                        (currentTheme.bubbleIndex || 30) > 75 ? 'text-amber-400 animate-pulse' : 'text-cyan-400'
                      }`}>{currentTheme.bubbleIndex || 30}%</span>
                    </div>
                    {/* Linear graphic gauge */}
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          (currentTheme.bubbleIndex || 30) > 75 
                            ? 'bg-gradient-to-r from-amber-600 to-amber-400' 
                            : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                        }`}
                        style={{ width: `${currentTheme.bubbleIndex || 30}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-1.5 leading-snug">
                      실적 대비 과열 및 리스크
                    </p>
                  </div>
                </div>

                {/* Risk and 3Yr Outlook summary cards */}
                {currentTheme.riskFactor && (
                  <div className="border-t border-zinc-900 pt-3 space-y-2.5 text-xs text-left">
                    <div className="bg-rose-950/20 rounded-lg p-2.5 border border-rose-900/10 flex gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-rose-400">주의 구조적 리스크 요인</span>
                        <p className="text-[10.5px] text-zinc-400 mt-0.5">{currentTheme.riskFactor}</p>
                      </div>
                    </div>

                    <div className="bg-teal-950/20 rounded-lg p-2.5 border border-teal-900/10 flex gap-2">
                      <Calendar className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-teal-400">향후 3개년 성장 로드맵</span>
                        <p className="text-[10.5px] text-zinc-400 mt-0.5">{currentTheme.future3YrOutlook}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Life Cycle Infographic Map & Timeline Markers */}
            <div className="lg:col-span-7 space-y-4">
              
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <h4 className="font-sans text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wide flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-emerald-400" />
                  테마 순환 흐름 인포그래픽 (Speculation Lifecycle Trajectory)
                </h4>

                {/* SVG representation of complete speculation lifecycle */}
                <div className="mb-4 relative rounded-lg bg-zinc-900/60 p-3 border border-zinc-850">
                  <svg viewBox="0 0 400 130" className="w-full h-auto">
                    {/* Curve path representation */}
                    <path
                      d="M 15 100 Q 55 70 100 30 T 170 15 Q 210 15 240 55 Q 285 115 320 95 T 385 80"
                      fill="none"
                      stroke="#3f3f46"
                      strokeWidth={2}
                      strokeDasharray="2,2"
                    />

                    {/* Gradient under the curve for design */}
                    <path
                      d="M 15 100 Q 55 70 100 30 T 170 15 Q 210 15 240 55 Q 285 115 320 95 T 385 80 L 385 120 L 15 120 Z"
                      fill="url(#grad)"
                      opacity="0.05"
                    />

                    <defs>
                      <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#18181b" />
                      </linearGradient>
                    </defs>
                    
                    {/* Color coded highlight zones */}
                    <circle cx={40} cy={82} r={4.5} fill="#f59e0b" /> {/* Intro */}
                    <circle cx={145} cy={16} r={5.5} fill="#10b981" className="animate-ping" style={{ transformOrigin: '145px 16px' }} /> {/* Peak / Growth */}
                    <circle cx={145} cy={16} r={5.5} fill="#10b981" /> {/* Peak / Growth */}
                    <circle cx={275} cy={95} r={4.5} fill="#06b6d4" /> {/* Correction */}
                    <circle cx={350} cy={83} r={4.5} fill="#6366f1" /> {/* Stabilization */}

                    {/* Text markers */}
                    <text x={40} y={115} fill="#9ca3af" fontSize={8} fontFamily="sans-serif" textAnchor="middle">1. 도입기</text>
                    <text x={145} y={42} fill="#34d399" fontSize={8} fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">2. 과열 급등기</text>
                    <text x={275} y={115} fill="#22d3ee" fontSize={8} fontFamily="sans-serif" textAnchor="middle">3. 대조정기</text>
                    <text x={355} y={115} fill="#818cf8" fontSize={8} fontFamily="sans-serif" textAnchor="middle">4. 안착회복기</text>
                    
                    {/* Dynamic position indicator pointer */}
                    {currentTheme.status === 'INTRO' && (
                      <g transform="translate(40, 82)">
                        <circle cx={0} cy={0} r={8} stroke="#f59e0b" strokeWidth={1} fill="none" className="animate-ping" />
                        <path d="M 0 -18 L 0 -5" stroke="#f59e0b" strokeWidth={1.5} markerEnd="url(#arrow)" />
                        <text x={0} y={-22} fill="#f59e0b" fontSize={7} textAnchor="middle" fontWeight="bold">진입 마킹</text>
                      </g>
                    )}
                    {currentTheme.status === 'GROWTH' && (
                      <g transform="translate(100, 30)">
                        <circle cx={0} cy={0} r={8} stroke="#10b981" strokeWidth={1} fill="none" className="animate-ping" />
                        <path d="M 0 -18 L 0 -5" stroke="#10b981" strokeWidth={1.5} />
                        <text x={0} y={-22} fill="#10b981" fontSize={7} textAnchor="middle" fontWeight="bold">진입 마킹</text>
                      </g>
                    )}
                    {(currentTheme.status === 'PEAK') && (
                      <g transform="translate(145, 16)">
                        <circle cx={0} cy={0} r={8} stroke="#f59e0b" strokeWidth={1} fill="none" className="animate-ping" />
                        <path d="M 0 14 L 0 5" stroke="#f59e0b" strokeWidth={1.5} />
                        <text x={0} y={26} fill="#f59e0b" fontSize={7} textAnchor="middle" fontWeight="bold">진입 마킹</text>
                      </g>
                    )}
                    {currentTheme.status === 'CORRECTION' && (
                      <g transform="translate(275, 95)">
                        <circle cx={0} cy={0} r={8} stroke="#06b6d4" strokeWidth={1} fill="none" className="animate-ping" />
                        <path d="M 0 -18 L 0 -5" stroke="#06b6d4" strokeWidth={1.5} />
                        <text x={0} y={-22} fill="#06b6d4" fontSize={7} textAnchor="middle" fontWeight="bold">진입 마킹</text>
                      </g>
                    )}
                    {currentTheme.status === 'STABILIZATION' && (
                      <g transform="translate(350, 83)">
                        <circle cx={0} cy={0} r={8} stroke="#6366f1" strokeWidth={1} fill="none" className="animate-ping" />
                        <path d="M 0 -18 L 0 -5" stroke="#6366f1" strokeWidth={1.5} />
                        <text x={0} y={-22} fill="#6366f1" fontSize={7} textAnchor="middle" fontWeight="bold">진입 마킹</text>
                      </g>
                    )}
                  </svg>
                  <div className="text-[10px] text-zinc-500 font-mono text-center mt-2 leading-relaxed">
                    *테마 지지주기는 일반적으로 약 1~2년에 걸쳐 <span className="text-amber-500">도입(태동)</span> → <span className="text-emerald-400">과열(어깨/머리)</span> → <span className="text-cyan-400">대조정(무릎)</span> → <span className="text-indigo-400">안정(재정립)</span> 사이클을 반복 추종합니다.
                  </div>
                </div>

                {/* Structured Professional Opinions Consensus Box */}
                {currentTheme.expertOpinionsSummary && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-xs text-left">
                    <span className="flex items-center gap-1 font-sans text-[11px] font-bold text-emerald-400 mb-1">
                      <GraduationCap className="h-4 w-4" />
                      월가 & 메이저 자산운용 기관 종합 평결 의견
                    </span>
                    <p className="text-[11.5px] leading-relaxed text-zinc-400">
                      {currentTheme.expertOpinionsSummary}
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline list */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-3 text-left">
                  테마 마일스톤 히스토리 타임라인
                </h4>
                <div className="space-y-4">
                  {currentTheme.timeline.map((item, idx) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      {/* Visual Dot and Connector Line */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[9px] font-bold ${
                          item.trend === 'rise' ? 'bg-rose-500/20 text-rose-400' : item.trend === 'fall' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {idx + 1}
                        </div>
                        {idx < currentTheme.timeline.length - 1 && <div className="w-0.5 flex-1 bg-zinc-850 my-1" />}
                      </div>

                      <div className="flex-1 text-left pb-1">
                        <div className="flex flex-wrap items-center gap-1.5 font-semibold text-zinc-200">
                          <span>{item.phase}</span>
                          <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[8.5px] text-zinc-500 font-mono font-normal">{item.label}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Associated Stocks Section with Star Watches */}
          <div className="mt-6 border-t border-zinc-800 pt-5">
            <h4 className="font-sans text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              해당 테마 핵심 대표 주도주 벨류체인 수혜 분석
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {currentTheme.relativeStocks.map(relative => {
                const isAdded = watchlistSymbols.includes(relative.symbol);

                return (
                  <div
                    key={relative.symbol}
                    className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition-all hover:border-zinc-750 hover:bg-zinc-950/60"
                  >
                    <div className="text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-xs font-black text-zinc-100">{relative.name}</span>
                        <span className="font-mono text-[9px] text-zinc-500 bg-zinc-900 px-1.5 py-0.2 rounded font-bold">{relative.symbol}</span>
                      </div>
                      <p className="mt-2.5 font-sans text-[11px] text-zinc-400 leading-relaxed">
                        {relative.relationReason}
                      </p>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => onAddStockToWatchlist(relative.symbol)}
                        disabled={isAdded}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                          isAdded
                            ? 'bg-zinc-900 text-zinc-650 cursor-not-allowed border border-zinc-850'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25'
                        }`}
                      >
                        <Star className={`h-3 w-3 ${isAdded ? 'fill-zinc-600 text-zinc-600' : 'fill-current'}`} />
                        {isAdded ? '이미 주시중' : '관심종목 추가'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
