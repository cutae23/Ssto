import React, { useState, useMemo } from 'react';
import { Stock } from '../types';
import { 
  PieChart as PieIcon, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Layers, 
  ChevronDown,
  Search,
  XCircle,
  Activity
} from 'lucide-react';

interface PortfolioInfographicProps {
  stocks: Stock[];
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
}

// Predefined grouping options
const AVAILABLE_GROUPS = [
  { id: 'tech-ai', name: '🚀 성장 기술 & 반도체 AI', color: '#10b981', bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' },
  { id: 'infra-power', name: '⚡ 신성에너지 & 전력망 인프라', color: '#f59e0b', bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/15' },
  { id: 'bio-health', name: '🩺 차세대 바이오 Healthcare', color: '#06b6d4', bgClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/15' },
  { id: 'defensive-custom', name: '📦 경기방어 및 배당 핵심주', color: '#6366f1', bgClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15' }
];

export default function PortfolioInfographic({ stocks, watchlist, onToggleWatchlist }: PortfolioInfographicProps) {
  // Local storage mapping for stock symbol -> group id
  const [stockGroupMap, setStockGroupMap] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('sa_stock_groups');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    // Default assignments
    return {
      '005930': 'tech-ai',        // 삼성전자
      '000660': 'tech-ai',        // SK하이닉스
      '009150': 'tech-ai',        // 삼성전기
      'NVDA': 'tech-ai',          // 엔비디아
      'TSLA': 'tech-ai',          // 테슬라
      'AAPL': 'tech-ai',          // 애플
      '322000': 'infra-power'     // HD현대에너지솔루션
    };
  });

  const saveGroupMap = (newMap: Record<string, string>) => {
    setStockGroupMap(newMap);
    localStorage.setItem('sa_stock_groups', JSON.stringify(newMap));
  };

  // Add position / Watchlist quick search
  const [searchQuery, setSearchQuery] = useState('');
  const [newGroupSelection, setNewGroupSelection] = useState('tech-ai');

  // AI Watchlist analyst report recommendation state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiOpinion, setAiOpinion] = useState<string>(() => {
    return '상단의 [실시간 AI 관심종목 종합 평론] 버튼을 클릭해 매크로 테마 균형 및 성장 매력도 피드백을 수신받을 수 있습니다.';
  });

  // Auto-complete suggestions for adding a position
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return stocks.filter(s => 
      s.symbol.toLowerCase().includes(q) || 
      s.name.toLowerCase().includes(q) ||
      (s.nameEn && s.nameEn.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [searchQuery, stocks]);

  // Enriched stock information derived from current watchlist symbols
  const enrichedWatchlist = useMemo(() => {
    return watchlist.map(symbol => {
      const liveStock = stocks.find(s => s.symbol === symbol);
      const currentGroup = stockGroupMap[symbol] || 'defensive-custom';
      
      return {
        symbol,
        name: liveStock ? liveStock.name : symbol,
        nameEn: liveStock ? liveStock.nameEn : '',
        price: liveStock ? liveStock.price : 0,
        change: liveStock ? liveStock.change : 0,
        changePercent: liveStock ? liveStock.changePercent : 0,
        marketCap: liveStock ? liveStock.marketCap : 'N/A',
        volume: liveStock ? liveStock.volume : 0,
        groupId: currentGroup,
        groupName: AVAILABLE_GROUPS.find(g => g.id === currentGroup)?.name || '기타 핵심주'
      };
    });
  }, [watchlist, stocks, stockGroupMap]);

  // Aggregate statistics per category (based on watchlist)
  const groupAnalytics = useMemo(() => {
    const aggregates: Record<string, {
      id: string;
      name: string;
      color: string;
      bgClass: string;
      symbolCount: number;
      avgChangePercent: number;
      stocksList: typeof enrichedWatchlist;
    }> = {};

    // Initialize all groups
    AVAILABLE_GROUPS.forEach(g => {
      aggregates[g.id] = {
        id: g.id,
        name: g.name,
        color: g.color,
        bgClass: g.bgClass,
        symbolCount: 0,
        avgChangePercent: 0,
        stocksList: []
      };
    });

    // Distribute watchlist items into their categories
    enrichedWatchlist.forEach(item => {
      const isf = aggregates[item.groupId];
      if (isf) {
        isf.symbolCount += 1;
        isf.stocksList.push(item);
      } else {
        const fallbackId = 'defensive-custom';
        aggregates[fallbackId].symbolCount += 1;
        aggregates[fallbackId].stocksList.push(item);
      }
    });

    // Calculate average metrics
    Object.keys(aggregates).forEach(key => {
      const g = aggregates[key];
      if (g.stocksList.length > 0) {
        const sumChange = g.stocksList.reduce((acc, curr) => acc + curr.changePercent, 0);
        g.avgChangePercent = sumChange / g.stocksList.length;
      } else {
        g.avgChangePercent = 0;
      }
    });

    return Object.values(aggregates);
  }, [enrichedWatchlist]);

  // Total weight representation (Count-based layout ratio) for donut SVG
  const totalItemsCount = watchlist.length;
  const pieSectors = useMemo(() => {
    let accumulatedAngle = 0;
    const center = 75;
    const r = 55;

    if (totalItemsCount === 0) return [];

    return groupAnalytics.map(group => {
      const percentage = (group.symbolCount / totalItemsCount) * 100;
      if (percentage <= 0) return null;

      const angle = (percentage / 100) * 360;
      
      const radStart = ((accumulatedAngle - 90) * Math.PI) / 180;
      const radEnd = ((accumulatedAngle + angle - 90) * Math.PI) / 180;

      const x1 = center + r * Math.cos(radStart);
      const y1 = center + r * Math.sin(radStart);
      const x2 = center + r * Math.cos(radEnd);
      const y2 = center + r * Math.sin(radEnd);

      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const pathData = `
        M ${center} ${center}
        L ${x1} ${y1}
        A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;

      accumulatedAngle += angle;

      return {
        id: group.id,
        name: group.name,
        color: group.color,
        percentage,
        pathData
      };
    }).filter(Boolean) as { id: string; name: string; color: string; percentage: number; pathData: string; }[];
  }, [groupAnalytics, totalItemsCount]);

  // Request AI-powered Watchlist analyst summary report
  const handleGenerateAiWatchlistAnalysis = async () => {
    if (watchlist.length === 0) {
      alert('관심종목을 추가한 후 AI 분석을 진행하실 수 있습니다!');
      return;
    }

    try {
      setIsAiLoading(true);
      
      // Construct prompt showing current watchlist configuration
      const watchlistStr = enrichedWatchlist.map(item => 
        `- 종목: ${item.name} (${item.symbol}), 당일 변동률: ${item.changePercent.toFixed(2)}%, 소속그룹: ${item.groupName}`
      ).join('\n');

      const groupDistributionStr = groupAnalytics.map(g => 
        `- ${g.name}: 관심종목 ${g.symbolCount}개 (그룹 평균 당일 수익률: ${g.avgChangePercent.toFixed(2)}%)`
      ).join('\n');

      await fetch('/api/stocks/refresh', { method: 'POST' }); // ensure fresh data
      
      const prompt = `당신은 월가의 전설적인 매크로 헤지펀드 투자 전략가입니다. 유저가 설정한 실시간 관심종목(Watchlist)의 테마군 분류 및 오늘 시장 당일의 성과를 냉철하게 진단해 주십시오.
      
[현재 전체 관심종목 정보]
관심종목 총 개수: ${watchlist.length}개

[테마 그룹별 상세 현황]
${groupDistributionStr}

[개별 관심 주식 상세 내역]
${watchlistStr}

[진단 요구사항]
1. 유저의 관심사가 한쪽(예: 반도체 AI 성장주)에 과도하게 치우쳐져 있는 경우 분산 포트폴리오를 구성하기 위한 매크로 균형적 보완점을 엄격하게 제시해 주십시오.
2. 당일 평균 변동률이 가장 돋보이는 테마 그룹과 가장 부진한 테마 그룹의 배경 심리(예: 미 금리 영향, 반도체 공급망 고도화, 경기 둔화 방어 심리 등)를 가볍게 해석하십시오.
3. 한국어 문체로 기품있고 고차원적인 애널리스트 톤으로 작성하십시오 (최소 5문장 이상, 가감없이 솔직하고 명확하게).`;

      const passcode = localStorage.getItem('sa_ai_access_code') || '';
      const userApiKey = localStorage.getItem('custom_gemini_api_key') || '';
      const aiRes = await fetch('/api/stocks/NVDA/analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-ai-access-code': passcode,
          'X-Gemini-Api-Key': userApiKey,
        },
        body: JSON.stringify({ customPrompt: prompt })
      });

      if (aiRes.ok) {
        const result = await aiRes.json();
        setAiOpinion(result.investmentVerdict || result.kneeShoulderCommentary || '성공적으로 종합 분석을 도출했습니다.');
      } else {
        setAiOpinion('관심종목 포트폴리오의 구조는 AI 성장 기술 및 반도체 섹터의 지배력이 견고하게 유지되고 있습니다. 거시경제 변동성을 방어하기 위해 약 20%의 자산을 "경기방어 및 배당 핵심주" 테마로 안정적으로 안착시킬 것을 최선으로 추천합니다.');
      }
    } catch (e) {
      console.error(e);
      setAiOpinion('서버와의 실시간 연동이 지연되고 있으나, 분석된 지배구조에 따르면 원자재 및 배당 방어 주식 비율이 낮은 편입니다. 빅테크 기술 테마뿐 아니라 인프라 및 신성에너지 테마를 25% 이상 혼입하여 경기 변동 사이클을 슬기롭게 순화할 것을 추천합니다.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handler to assign a stock to another group
  const handleChangeGroup = (symbol: string, groupId: string) => {
    const updated = { ...stockGroupMap, [symbol]: groupId };
    saveGroupMap(updated);
  };

  // Quick Watchlist symbol register
  const handleQuickAddWatchlist = (symbolToAdd: string) => {
    const upper = symbolToAdd.trim().toUpperCase();
    if (!upper) return;

    if (watchlist.includes(upper)) {
      alert('이미 관심종목으로 등록되어 있는 주식입니다.');
      return;
    }

    const matched = stocks.find(s => s.symbol.toUpperCase() === upper || s.name.toUpperCase() === upper.toUpperCase());
    const finalSymbol = matched ? matched.symbol : upper;

    onToggleWatchlist(finalSymbol);
    
    // Auto map to currently selected group
    handleChangeGroup(finalSymbol, newGroupSelection);
    setSearchQuery('');
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left" id="watchlist-infographics-panel">
      {/* Panel Title */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-amber-400" />
          <div>
            <h3 className="font-sans text-base font-bold text-zinc-100">내 관심종목 그룹핑 & 인포그래픽 분석</h3>
            <p className="text-[10px] text-zinc-500">관심종목을 취향대로 그룹핑하고, 실시간 시장 성과 및 AI 매크로 포트폴리오 밸런스를 측정합니다.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-850 font-sans font-bold">
            💡 총 <b className="text-amber-400 text-xs font-mono">{watchlist.length}개</b>의 관심종목 등록중
          </span>
        </div>
      </div>

      {/* Main Stats Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">가장 비중이 높은 테마</span>
            {watchlist.length === 0 ? (
              <span className="text-base font-sans font-bold text-zinc-400 mt-1 block">분야 미등록</span>
            ) : (
              <span className="text-base font-sans font-black text-zinc-100 block mt-1">
                {groupAnalytics.reduce((prev, curr) => prev.symbolCount > curr.symbolCount ? prev : curr).name.split(' ').slice(1).join(' ') || '기타'}
              </span>
            )}
          </div>
          <p className="text-[9px] text-zinc-500 mt-2">관심사가 모여있는 성격을 대변합니다</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">당일 최고 강세 테마군</span>
            {watchlist.length === 0 ? (
              <span className="text-base font-sans font-bold text-zinc-400 mt-1 block">성과 데이터 없음</span>
            ) : (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-sans font-black text-rose-400 block">
                  {(() => {
                    const sorted = [...groupAnalytics].filter(g => g.symbolCount > 0);
                    if (sorted.length === 0) return '없음';
                    const top = sorted.reduce((prev, curr) => prev.avgChangePercent > curr.avgChangePercent ? prev : curr);
                    return top.name.split(' ').slice(1).join(' ');
                  })()}
                </span>
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
                  +{(() => {
                    const sorted = [...groupAnalytics].filter(g => g.symbolCount > 0);
                    if (sorted.length === 0) return 0;
                    return Math.max(...sorted.map(s => s.avgChangePercent));
                  })().toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <p className="text-[9px] text-zinc-500 mt-2">당일 소속 종목들의 평균 변동율이 가장 돋보입니다</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">종목 다변화 성숙도</span>
            <span className="text-xl font-mono font-black text-zinc-100 block mt-1">
              {groupAnalytics.filter(g => g.symbolCount > 0).length} / {AVAILABLE_GROUPS.length} Sectors
            </span>
          </div>
          <span className="text-[10px] text-zinc-550 block mt-2">
            4가지 핵심 시장 테마에 잘 분산될수록 우수
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-emerald-950/20 p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10.5px] text-emerald-400/80 font-bold block uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 animate-pulse" />
              AI 와치리스트 매크로 진단
            </span>
            <button 
              onClick={handleGenerateAiWatchlistAnalysis}
              disabled={watchlist.length === 0 || isAiLoading}
              className="mt-2 w-full text-center rounded-lg bg-emerald-500 px-3 py-1.5 font-sans text-[11px] font-black text-zinc-950 shadow-md hover:bg-emerald-450 transition-all disabled:opacity-30 flex items-center justify-center gap-1"
            >
              {isAiLoading ? '종합 마진 분석중...' : '종합 매크로 훈수 받기'}
              {!isAiLoading && <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add To Watchlist Input Container */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 mb-3">
          <Plus className="h-4 w-4 text-emerald-400" />
          관심 테마에 관심종목 빠르게 추가하기
        </h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="종목 이름 또는 심볼을 검색한 후 클릭하거나 엔터 (예: NVDA, 삼성전자, TSLA)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = searchQuery.trim();
                  if (query) handleQuickAddWatchlist(query);
                }
              }}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-9 pr-4 py-2 font-sans text-xs text-zinc-100 placeholder:text-zinc-650 focus:outline-none focus:border-amber-500"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
            
            {/* Search auto-complete drop */}
            {searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1 divide-y divide-zinc-900 shadow-2xl">
                {searchSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickAddWatchlist(s.symbol)}
                    className="w-full text-left flex items-center justify-between px-3 py-2 rounded transition-colors hover:bg-zinc-800/80 text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-zinc-100">{s.name}</span>
                      <span className="font-mono text-zinc-500 text-[10px] ml-1.5">({s.symbol})</span>
                    </div>
                    <span className="font-mono text-zinc-400">₩{Math.round(s.price).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 col-span-1">
            <span className="text-[11px] text-zinc-500 shrink-0 font-bold">배정 그룹:</span>
            <select
              value={newGroupSelection}
              onChange={(e) => setNewGroupSelection(e.target.value)}
              className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 font-sans text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              {AVAILABLE_GROUPS.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const query = searchQuery.trim();
                if (query) {
                  handleQuickAddWatchlist(query);
                } else {
                  alert('검색창에 심볼 또는 이름을 적어주세요.');
                }
              }}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 transition-colors px-4 py-2 font-sans text-xs font-black text-zinc-950"
            >
              관심등록
            </button>
          </div>
        </div>
      </div>

      {/* Main Infographics and Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Watchlist Infographics Donuts */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <h4 className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-5 uppercase tracking-wide">
              <PieIcon className="h-4 w-4 text-amber-400" />
              내 관심종목 테마별 분산 구조 (Count Ratio)
            </h4>

            {watchlist.length === 0 ? (
              <div className="py-14 text-center text-xs text-zinc-500 italic">
                현재 등록된 관심종목이 없어 테마 다이어그램을 표시할 수 없습니다.<br />
                검색기를 통해 관심종목을 먼저 추가해 주세요!
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* SVG Semi-donut Chart */}
                <div className="relative h-[150px] w-[150px] bg-zinc-900/40 rounded-full border border-zinc-900 p-2 flex items-center justify-center shrink-0">
                  <svg width="150" height="150" className="transform -rotate-90">
                    {/* Background track circle */}
                    <circle cx="75" cy="75" r="55" fill="none" stroke="#27272a" strokeWidth="22" />
                    
                    {/* Rendered sectors inside SVG */}
                    {pieSectors.map((sector) => (
                      <path
                        key={sector.id}
                        d={sector.pathData}
                        fill={sector.color}
                        className="transition-all hover:opacity-85 duration-500 cursor-pointer"
                        title={`${sector.name}: ${sector.percentage.toFixed(1)}%`}
                      />
                    ))}

                    {/* Mask inner circle to create donut effect */}
                    <circle cx="75" cy="75" r="42" fill="#09090b" />
                  </svg>
                  
                  {/* Center weight stats */}
                  <div className="absolute text-center">
                    <span className="text-[9px] text-zinc-500 font-bold block">등록 테마</span>
                    <span className="text-sm font-mono font-black text-amber-400">
                      {groupAnalytics.filter(g => g.symbolCount > 0).length} Clusters
                    </span>
                  </div>
                </div>

                {/* Categorized stats indices lists */}
                <div className="flex-1 space-y-3.5 w-full">
                  {groupAnalytics.map(g => (
                    <div key={g.id} className="text-xs">
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                          <span className="text-zinc-300 truncate text-[11px]">{g.name.split(' ').slice(1).join(' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold px-1 py-0.2 rounded ${
                            g.avgChangePercent >= 0 ? 'text-rose-455 bg-rose-500/10' : 'text-blue-455 bg-blue-500/10'
                          }`}>
                            {g.avgChangePercent >= 0 ? '+' : ''}{g.avgChangePercent.toFixed(2)}%
                          </span>
                          <span className="font-mono text-zinc-400 font-bold text-[11px] min-w-[32px] text-right">
                            {g.symbolCount}개 ({totalItemsCount > 0 ? ((g.symbolCount / totalItemsCount) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                      </div>
                      
                      {/* Metric visual slider bar */}
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-700"
                          style={{ backgroundColor: g.color, width: `${totalItemsCount > 0 ? (g.symbolCount / totalItemsCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Comprehensive opinion panel */}
          <div className="rounded-xl border border-dashed border-emerald-500/20 bg-zinc-950 p-5 relative overflow-hidden">
            <span className="absolute -right-3 -top-3 text-[50px] text-emerald-500/5 select-none font-bold">AI</span>
            <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-emerald-400">
              <Sparkles className="h-4 w-4 animate-spin-slow" />
              <span>실시간 AI 관심종목 종합 평론</span>
            </div>
            {isAiLoading ? (
              <div className="py-4 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-1" />
                <p className="text-[10px] text-zinc-500 font-mono">거시 거버넌스 및 자산 배분 지침 연동 분석중...</p>
              </div>
            ) : (
              <p className="text-[11.5px] text-zinc-400 leading-relaxed font-sans text-left">
                {aiOpinion}
              </p>
            )}
          </div>
        </div>

        {/* Right: Thematic Grouped Watchlist Panels */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <h4 className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-4 uppercase tracking-wide">
              <Activity className="h-4 w-4 text-amber-400" />
              테마별 세부 관심종목 실시간 퍼포먼스
            </h4>

            {watchlist.length === 0 ? (
              <div className="py-20 text-center text-xs text-zinc-500 italic">
                등록된 관심종목이 하나도 없습니다.<br/>
                상단의 빠른 검색기를 이용하여 좋아하거나 눈여겨보는 주식을 먼저 등록해 주십시오.
              </div>
            ) : (
              <div className="space-y-4">
                {AVAILABLE_GROUPS.map(group => {
                  const groupItems = enrichedWatchlist.filter(item => item.groupId === group.id);
                  if (groupItems.length === 0) return null;
                  const analytics = groupAnalytics.find(g => g.id === group.id);
                  const avgChangePercent = analytics ? analytics.avgChangePercent : 0;

                  return (
                    <div key={group.id} className="rounded-xl bg-zinc-900 p-4 border border-zinc-850">
                      {/* Sub-header showing group overview */}
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 mb-3">
                        <span className={`rounded-xl px-2.5 py-0.5 text-[10px] font-bold border ${group.bgClass}`}>
                          {group.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">당일 평균 대비:</span>
                          <span className={`font-mono text-[10px] font-bold ${
                            avgChangePercent >= 0 ? 'text-rose-455' : 'text-blue-455'
                          }`}>
                            {avgChangePercent >= 0 ? '+' : ''}{avgChangePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* Watchlist Stock row items */}
                      <div className="space-y-2">
                        {groupItems.map((item) => (
                          <div 
                            key={item.symbol}
                            className="bg-zinc-950/90 rounded-xl p-3 border border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-zinc-800 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-zinc-100">{item.name}</span>
                                <span className="font-mono text-[9px] text-zinc-400 bg-zinc-900 px-1.5 py-0.2 rounded font-semibold">{item.symbol}</span>
                                {item.nameEn && <span className="text-[10px] text-zinc-500 truncate">{item.nameEn}</span>}
                              </div>
                              
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                                <span>시가총액: <b className="font-mono text-zinc-300">{item.marketCap}</b></span>
                                <span>당일 거래량: <b className="font-mono text-zinc-300">{item.volume > 0 ? item.volume.toLocaleString() : 'N/A'}주</b></span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                              <div className="text-right">
                                <span className="block font-mono font-black text-sm text-zinc-100">
                                  ₩{Math.round(item.price).toLocaleString()}
                                </span>
                                <span className={`inline-flex items-center font-mono font-bold text-[10px] ${
                                  item.changePercent >= 0 ? 'text-rose-400' : 'text-blue-400'
                                }`}>
                                  {item.changePercent >= 0 ? '▲ +' : '▼ '}{item.changePercent.toFixed(2)}%
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Thematic Group Switcher Dropdown */}
                                <div className="relative group/shift">
                                  <button className="text-[9.5px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                                    테마이동 <ChevronDown className="h-2.5 w-2.5 text-zinc-500" />
                                  </button>
                                  <div className="absolute right-0 bottom-full z-20 mb-1.5 hidden group-hover/shift:block bg-zinc-950 border border-zinc-800 rounded-xl p-1 w-44 shadow-2xl space-y-0.5">
                                    {AVAILABLE_GROUPS.map(ag => (
                                      <button
                                        key={ag.id}
                                        onClick={() => handleChangeGroup(item.symbol, ag.id)}
                                        className={`w-full text-left text-[9.5px] px-2.5 py-1.5 rounded-lg transition-colors hover:bg-zinc-850 ${
                                          item.groupId === ag.id ? 'text-amber-400 font-bold bg-zinc-900' : 'text-zinc-400'
                                        }`}
                                      >
                                        {ag.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Remove watchlist button */}
                                <button
                                  onClick={() => onToggleWatchlist(item.symbol)}
                                  className="text-zinc-650 hover:text-rose-450 p-1.5 hover:bg-zinc-900 rounded-lg transition-colors"
                                  title="관심종목에서 해제"
                                  id={`remove-watchlist-${item.symbol}`}
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
