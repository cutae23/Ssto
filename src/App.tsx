import React, { useState, useEffect, useRef } from 'react';
import { Stock, Candle, AlertSetting, PortfolioItem, AiAnalysisReport } from './types';
import { DEFAULT_AI_REPORTS } from './data/mockStocks';
import Header from './components/Header';
import StockChart from './components/StockChart';
import AlertsPanel from './components/AlertsPanel';
import DiscussionForum from './components/DiscussionForum';
import ThemeLab from './components/ThemeLab';
import PortfolioInfographic from './components/PortfolioInfographic';
import { 
  Star, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Bell, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  Activity, 
  Award,
  Wallet,
  CheckCircle2,
  X,
  HelpCircle,
  TrendingUpIcon,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

const DEFAULT_WATCHLIST = [
  '009150', '000660', '011100', '034220', '322000', '112610', '389260', '336260',
  '018880', '002230', '455250', '307750', '009830', '042660', '372170', '117730',
  '272290', '035720', '058850', '041440', '160980', '092070', '211270', '022100',
  '049070', '350110', '443060', '439090', '005930', '035420', '460930', '071670',
  '011930', '001250', '037560', '101170', '189300', '383800', '089470', '012630',
  '011210', '010470', '023800', '042670', '028080', '058860', '036030', '001740',
  '010140', '126560', '191410', '001180'
];

const POPULAR_STOCK_PRESETS = [
  { symbol: '005930', name: '삼성전자', nameEn: 'Samsung Electronics', price: 78200, prevClose: 77500, high52Week: 88000, low52Week: 65100 },
  { symbol: '000660', name: 'SK하이닉스', nameEn: 'SK Hynix', price: 216200, prevClose: 210100, high52Week: 245000, low52Week: 110000 },
  { symbol: '035720', name: '카카오', nameEn: 'Kakao', price: 42350, prevClose: 41800, high52Week: 61000, low52Week: 37000 },
  { symbol: '035420', name: 'NAVER', nameEn: 'NAVER', price: 168200, prevClose: 167500, high52Week: 235000, low52Week: 155000 },
  { symbol: '005380', name: '현대차', nameEn: 'Hyundai Motor', price: 251000, prevClose: 248500, high52Week: 290000, low52Week: 180000 },
  { symbol: '000270', name: '기아', nameEn: 'Kia', price: 118400, prevClose: 116200, high52Week: 132000, low52Week: 78000 },
  { symbol: '009150', name: '삼성전기', nameEn: 'Samsung Electro-Mechanics', price: 154700, prevClose: 153300, high52Week: 178000, low52Week: 120000 },
  { symbol: '034220', name: 'LG디스플레이', nameEn: 'LG Display', price: 13900, prevClose: 12850, high52Week: 18000, low52Week: 9500 },
  { symbol: '051910', name: 'LG화학', nameEn: 'LG Chem', price: 345000, prevClose: 341500, high52Week: 580000, low52Week: 305000 },
  { symbol: '006400', name: '삼성SDI', nameEn: 'Samsung SDI', price: 372000, prevClose: 368000, high52Week: 620000, low52Week: 340000 },
  { symbol: '005490', name: 'POSCO홀딩스', nameEn: 'POSCO Holdings', price: 365000, prevClose: 361000, high52Week: 600000, low52Week: 320000 },
  { symbol: '207940', name: '삼성바이오로직스', nameEn: 'Samsung Biologics', price: 812000, prevClose: 805000, high52Week: 910000, low52Week: 680000 },
  { symbol: '068270', name: '셀트리온', nameEn: 'Celltrion', price: 184500, prevClose: 181200, high52Week: 230000, low52Week: 135000 },
  { symbol: '105560', name: 'KB금융', nameEn: 'KB Financial Group', price: 78200, prevClose: 77100, high52Week: 84000, low52Week: 48000 },
  { symbol: '055550', name: '신한지주', nameEn: 'Shinhan Financial Group', price: 48500, prevClose: 48000, high52Week: 54000, low52Week: 33000 },
  { symbol: '015760', name: '한국전력', nameEn: 'KEPCO', price: 19800, prevClose: 19650, high52Week: 24000, low52Week: 16500 },
  { symbol: 'NVDA', name: '엔비디아', nameEn: 'NVIDIA', price: 127.5, prevClose: 125.2, high52Week: 140.7, low52Week: 39.2 },
  { symbol: 'TSLA', name: '테슬라', nameEn: 'Tesla', price: 178.5, prevClose: 175.2, high52Week: 299.2, low52Week: 138.8 },
  { symbol: 'AAPL', name: '애플', nameEn: 'Apple', price: 212.4, prevClose: 211.2, high52Week: 220.2, low52Week: 164.1 },
  { symbol: '011100', name: '코콤', nameEn: 'Kocom', price: 3015, prevClose: 2990, high52Week: 4500, low52Week: 2500 },
  { symbol: '322000', name: 'HD현대에너지솔루션', nameEn: 'HD Hyundai Energy Solutions', price: 26200, prevClose: 25400, high52Week: 38000, low52Week: 19000 }
];

const mapPresetsToStocks = (): Stock[] => {
  return POPULAR_STOCK_PRESETS.map(p => {
    const price = p.price;
    const prevClose = p.prevClose;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? Math.round((change / prevClose) * 10000) / 100 : 0;
    const high52Week = p.high52Week || price * 1.25;
    const low52Week = p.low52Week || price * 0.75;
    
    // Knee shoulder calculation helper
    const range = high52Week - low52Week;
    const index = range > 0 ? Math.round(((price - low52Week) / range) * 100) : 50;
    let status: 'FOOT' | 'KNEE' | 'WAIST' | 'SHOULDER' | 'HEAD' = 'WAIST';
    if (index <= 15) status = 'FOOT';
    else if (index <= 35) status = 'KNEE';
    else if (index <= 65) status = 'WAIST';
    else if (index <= 85) status = 'SHOULDER';
    else status = 'HEAD';

    return {
      symbol: p.symbol,
      name: p.name,
      nameEn: p.nameEn,
      price,
      prevClose,
      change,
      changePercent,
      high52Week,
      low52Week,
      volume: 1245000,
      marketCap: p.symbol === 'NVDA' || p.symbol === 'TSLA' || p.symbol === 'AAPL' ? '1.2조 달러' : '5조원',
      peRatio: 15.4,
      rsi: 54,
      ma20: price * 1.02,
      description: `${p.name}의 가상 트래킹 정보입니다.`,
      kneeShoulderIndex: index,
      kneeShoulderStatus: status
    };
  });
};

interface StockListItemProps {
  key?: string;
  stock: Stock;
  isSelected: boolean;
  watchlist: string[];
  onSelect: () => void;
  onToggleWatchlist: (symbol: string) => void;
  onDeleteStock: (symbol: string, name: string) => any;
}

function StockListItem({
  stock,
  isSelected,
  watchlist,
  onSelect,
  onToggleWatchlist,
  onDeleteStock
}: StockListItemProps) {
  const watched = watchlist.includes(stock.symbol);
  const isUp = stock.changePercent >= 0;
  const prevPriceRef = useRef(stock.price);
  const [flash, setFlash] = useState<'UP' | 'DOWN' | null>(null);

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

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between rounded-xl p-3 border cursor-pointer select-none transition-all duration-300 ${
        isSelected
          ? 'border-emerald-500 bg-emerald-500/5'
          : 'border-zinc-800/60 bg-zinc-950/40 hover:border-zinc-700'
      } ${
        flash === 'UP' 
          ? 'bg-rose-500/10 border-rose-500/30' 
          : flash === 'DOWN' 
          ? 'bg-blue-500/10 border-blue-500/30' 
          : ''
      }`}
    >
      <div className="text-left flex items-start gap-2 max-w-[65%]">
        {/* Watch / Star Toggle Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist(stock.symbol);
          }}
          type="button"
          className="mt-0.5 text-zinc-600 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <Star className={`h-3.5 w-3.5 ${watched ? 'fill-current text-amber-400' : 'text-zinc-600'}`} />
        </button>

        <div>
          <div className="font-sans text-xs font-bold text-zinc-100 flex items-center gap-1.5 flex-wrap">
            {stock.name}
            <span className="font-mono text-[9px] text-zinc-500">{stock.symbol}</span>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {stock.kneeShoulderStatus === 'KNEE' ? '🟢 저점 무릎' : stock.kneeShoulderStatus === 'FOOT' ? '🔵 극저평가 무릎이하' : stock.kneeShoulderStatus === 'SHOULDER' ? '🔴 매수경계 어깨' : stock.kneeShoulderStatus === 'HEAD' ? '⚠️ 최고조 머리' : '🟡 보류 허리'} (지수: {stock.kneeShoulderIndex}%)
          </span>
         </div>
       </div>

       {/* Price changes detail column */}
       <div className="text-right flex flex-col justify-center items-end">
         <div className="flex flex-col items-end">
           <span className="font-mono text-xs font-black block text-zinc-100" title="KRX 정규장 종가">
             {stock.symbol === 'NVDA' || stock.symbol === 'TSLA' || stock.symbol === 'AAPL'
               ? `$${stock.price.toLocaleString(undefined, { minimumFractionDigits: 1 })}`
               : `₩${Math.round(stock.price).toLocaleString()}`}
           </span>
           {stock.nxtPrice !== undefined && (
             <span className="font-sans text-[8.5px] font-bold text-indigo-400 bg-indigo-500/10 px-1 py-0.2 rounded mt-0.5" title="Nextrade 대체거래소 야간 종가">
               Nx 대체: ₩{Math.round(stock.nxtPrice).toLocaleString()}
             </span>
           )}
         </div>
         <span className={`font-mono text-[10px] font-bold block mt-0.5 ${isUp ? 'text-rose-500' : 'text-blue-500'}`}>
           {isUp ? '+' : ''}{stock.changePercent}%
         </span>
       </div>

       {/* Interactive hover X delete button to prune custom stock / entries */}
       <button
         onClick={(e) => {
           e.stopPropagation();
           onDeleteStock(stock.symbol, stock.name);
         }}
         className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-700 flex items-center justify-center rounded-full text-[10px] border border-zinc-700 shadow-md transition-all duration-200"
         title="이 종목을 목록에서 영구 제거"
         type="button"
       >
         <span className="text-[10px] font-bold">×</span>
       </button>
     </div>
   );
 }

export default function App() {
  // --- Guest Mode States (Synchronised with LocalStorage) ---
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('sa_nickname') || `투자자_${Math.floor(1000 + Math.random() * 9000)}`;
  });

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('sa_watchlist');
    return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
  });

  const [alerts, setAlerts] = useState<AlertSetting[]>(() => {
    const saved = localStorage.getItem('sa_alerts');
    return saved ? JSON.parse(saved) : [];
  });

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem('sa_portfolio');
    return saved ? JSON.parse(saved) : [
      { symbol: '009150', stockName: '삼성전기', shares: 10, buyAvgPrice: 153300 },
      { symbol: '005930', stockName: '삼성전자', shares: 50, buyAvgPrice: 69500 }
    ];
  });

  const [cash, setCash] = useState<number>(() => {
    const saved = localStorage.getItem('sa_cash');
    return saved ? parseFloat(saved) : 10000000; // ₩10,000,000 initial capital
  });

  // --- Live API Sync States ---
  const [stocks, setStocks] = useState<Stock[]>(mapPresetsToStocks);
  const [selectedSymbol, setSelectedSymbol] = useState('009150');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '1d'>('1d');
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'THEMELAB' | 'MYSTOCKS'>('MONITOR');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Stocks and Live Sync configurations
  const [isLiveSyncEnabled, setIsLiveSyncEnabled] = useState(false);
  const [isSimulationEnabled, setIsSimulationEnabled] = useState(true);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newStockForm, setNewStockForm] = useState({
    symbol: '',
    name: '',
    nameEn: '',
    price: '',
    prevClose: '',
    high52: '',
    low52: ''
  });

  // Autocomplete search suggestions for adding premium/common stocks
  const searchSuggestions = React.useMemo(() => {
    const query = (newStockForm.name || newStockForm.symbol).trim().toLowerCase();
    if (!query) return [];

    const combinedList: any[] = [...stocks];
    POPULAR_STOCK_PRESETS.forEach(preset => {
      if (!combinedList.some(s => s.symbol === preset.symbol)) {
        combinedList.push({
          symbol: preset.symbol,
          name: preset.name,
          nameEn: preset.nameEn,
          price: preset.price,
          prevClose: preset.prevClose,
          high52Week: preset.high52Week,
          low52Week: preset.low52Week
        });
      }
    });

    return combinedList.filter(s => {
      const matchSym = s.symbol.toLowerCase().includes(query);
      const matchName = s.name.toLowerCase().includes(query);
      const matchEn = s.nameEn ? s.nameEn.toLowerCase().includes(query) : false;
      return matchSym || matchName || matchEn;
    }).slice(0, 6);
  }, [newStockForm.name, newStockForm.symbol, stocks]);

  // --- AI Report cache ---
  const [aiReportsCache, setAiReportsCache] = useState<Record<string, AiAnalysisReport>>({...DEFAULT_AI_REPORTS});
  const [aiLoading, setAiLoading] = useState(false);

  // --- AI protection and access code states ---
  const [isAiProtected, setIsAiProtected] = useState(false);
  const [aiPasscode, setAiPasscode] = useState(() => localStorage.getItem('sa_ai_access_code') || '');
  const [showPasscodePrompt, setShowPasscodePrompt] = useState(false);

  // --- Alert notifications toast state ---
  const [activeToast, setActiveToast] = useState<{ id: string; message: string; sub: string } | null>(null);

  // Synchronise settings state changes to localStorage
  useEffect(() => {
    localStorage.setItem('sa_nickname', nickname);
  }, [nickname]);

  useEffect(() => {
    localStorage.setItem('sa_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('sa_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('sa_portfolio', JSON.stringify(portfolio));
    localStorage.setItem('sa_cash', cash.toString());
  }, [portfolio, cash]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch live sync configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          setIsLiveSyncEnabled(data.isLiveSyncEnabled);
          setIsSimulationEnabled(data.isSimulationEnabled !== false);
        }
      } catch (e) {
        console.error('Error fetching live sync config:', e);
      }
    };
    fetchConfig();
  }, []);

  // Fetch AI protection passcode configuration on mount and dynamic event listeners
  useEffect(() => {
    const fetchAiConfig = async () => {
      try {
        const res = await fetch('/api/ai-config');
        if (res.ok) {
          const data = await res.json();
          setIsAiProtected(data.isProtected);
        }
      } catch (e) {
        console.error('Error fetching AI lock config:', e);
      }
    };
    fetchAiConfig();

    const handleUnauthorizedAi = () => {
      setShowPasscodePrompt(true);
    };
    window.addEventListener('unauthorized-ai', handleUnauthorizedAi);
    
    return () => {
      window.removeEventListener('unauthorized-ai', handleUnauthorizedAi);
    };
  }, []);

  const handleToggleLiveSync = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/config/live-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        const data = await res.json();
        setIsLiveSyncEnabled(data.isLiveSyncEnabled);
        setIsSimulationEnabled(data.isSimulationEnabled !== false);
        await fetchStocks();
        if (selectedSymbol) {
          await fetchCandles(selectedSymbol);
        }
      }
    } catch (e) {
      console.error('Error toggling live sync:', e);
    }
  };

  const handleToggleSimulation = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/config/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        const data = await res.json();
        setIsLiveSyncEnabled(data.isLiveSyncEnabled);
        setIsSimulationEnabled(data.isSimulationEnabled !== false);
        await fetchStocks();
      }
    } catch (e) {
      console.error('Error toggling simulation:', e);
    }
  };

  const handleCreateCustomStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: newStockForm.symbol,
          name: newStockForm.name,
          nameEn: newStockForm.nameEn || undefined,
          price: Number(newStockForm.price),
          prevClose: Number(newStockForm.prevClose),
          high52Week: newStockForm.high52 ? Number(newStockForm.high52) : undefined,
          low52Week: newStockForm.low52 ? Number(newStockForm.low52) : undefined
        })
      });
      if (res.ok) {
        const added = await res.json();
        // Add to watchlist
        if (!watchlist.includes(added.symbol)) {
          setWatchlist(prev => [...prev, added.symbol]);
        }
        // Select it
        setSelectedSymbol(added.symbol);
        // Refresh stock list
        await fetchStocks();
        // Clear form
        setNewStockForm({ symbol: '', name: '', nameEn: '', price: '', prevClose: '', high52: '', low52: '' });
        setIsAddingCustom(false);
      } else {
        const err = await res.json();
        alert(err.error || '종목 추가 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서버 연결 실패');
    }
  };

  // Fetch stocks from API endpoint
  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/stocks');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data) && data.length > 0) {
          setStocks(data);
        } else {
          setStocks(mapPresetsToStocks());
        }
      } else {
        setStocks(mapPresetsToStocks());
      }
    } catch (e) {
      console.error('Error fetching live stocks:', e);
      setStocks(mapPresetsToStocks());
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (isLiveSyncEnabled) {
        const res = await fetch('/api/stocks/refresh', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setStocks(data);
        }
      } else {
        // Just refetch from backend to load calibrated values
        await fetchStocks();
      }
    } catch (e) {
      console.error('Error manual refreshing stocks:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch historical candle data
  const fetchCandles = async (symbol: string, currentTf = timeframe) => {
    try {
      const res = await fetch(`/api/stocks/${symbol}/candles?interval=${currentTf}`);
      if (res.ok) {
        const data = await res.json();
        setCandles(data);
      }
    } catch (e) {
      console.error('Error fetching candles:', e);
    }
  };

  // 1. Fetch current stock quotes in a fast 3-second polling interval (instant in-memory data)
  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch historical candles only when selected stock or timeframe changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchCandles(selectedSymbol, timeframe);
    }
  }, [selectedSymbol, timeframe]);

  // Check alarm settings against live stock pricing regularly
  useEffect(() => {
    if (stocks.length === 0 || alerts.length === 0) return;

    let modified = false;
    const updatedAlerts = alerts.map(alert => {
      if (alert.isTriggered) return alert;

      const live = stocks.find(s => s.symbol === alert.symbol);
      if (!live) return alert;

      // Check criteria
      let triggered = false;
      const standardizedPrice = (alert.symbol === 'NVDA' || alert.symbol === 'TSLA' || alert.symbol === 'AAPL') 
        ? live.price * 1350 // Translate to standardized portfolio alerts comparison
        : live.price;

      if (alert.condition === 'ABOVE' && live.price >= alert.targetPrice) {
        triggered = true;
      } else if (alert.condition === 'BELOW' && live.price <= alert.targetPrice) {
        triggered = true;
      }

      if (triggered) {
        modified = true;
        // Trigger elegant floating alert Toast notification
        const sign = alert.condition === 'ABOVE' ? '📈 돌파 상승' : '📉 도출 하락';
        const formattedPrice = (alert.symbol === 'NVDA' || alert.symbol === 'TSLA' || alert.symbol === 'AAPL')
          ? `$${alert.targetPrice.toLocaleString()}`
          : `₩${Math.round(alert.targetPrice).toLocaleString()}`;

        setActiveToast({
          id: alert.id,
          message: `🔔 실시간 지정가 알림 발송 완료!`,
          sub: `${alert.stockName}(${alert.symbol}) 주가가 지정하신 기준치 ${formattedPrice}(${sign})에 도달했습니다. 현재가: ${live.price.toLocaleString()}`
        });

        return {
          ...alert,
          isTriggered: true,
          triggeredAt: new Date().toLocaleTimeString()
        };
      }
      return alert;
    });

    if (modified) {
      setAlerts(updatedAlerts);
    }
  }, [stocks, alerts]);

  // --- Handlers ---
  const handleToggleWatchlist = (symbol: string) => {
    setWatchlist(prev => 
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const handleUpdateStock = async (symbol: string, fields: any) => {
    try {
      const res = await fetch(`/api/stocks/${symbol}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (res.ok) {
        await fetchStocks();
        await fetchCandles(symbol);
      }
    } catch (e) {
      console.error('Error updating stock code:', e);
    }
  };

  const handleAddStockToWatchlist = (symbol: string) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist(prev => [...prev, symbol]);
    }
  };

  const handleCreateAlert = (symbol: string, targetPrice: number, condition: 'ABOVE' | 'BELOW') => {
    const targetStock = stocks.find(s => s.symbol === symbol);
    if (!targetStock) return;

    const newAlert: AlertSetting = {
      id: Date.now().toString(),
      symbol,
      stockName: targetStock.name,
      targetPrice,
      condition,
      isActive: true,
      isTriggered: false,
      createdAt: new Date().toLocaleDateString()
    };

    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleRemoveAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleTradeAction = (symbol: string, shares: number, standardizedPrice: number, type: 'BUY' | 'SELL') => {
    const targetStock = stocks.find(s => s.symbol === symbol);
    if (!targetStock) return;

    const totalCost = shares * standardizedPrice;

    if (type === 'BUY') {
      // Deduct cash
      setCash(prev => prev - totalCost);
      // Append or average to holdings
      setPortfolio(prev => {
        const existing = prev.find(item => item.symbol === symbol);
        if (existing) {
          const totalShares = existing.shares + shares;
          const totalCostBasis = (existing.shares * existing.buyAvgPrice) + totalCost;
          const newAvg = totalCostBasis / totalShares;
          return prev.map(item => item.symbol === symbol ? { ...item, shares: totalShares, buyAvgPrice: Math.round(newAvg) } : item);
        } else {
          return [...prev, { symbol, stockName: targetStock.name, shares, buyAvgPrice: Math.round(standardizedPrice) }];
        }
      });
    } else {
      // Gain cash
      setCash(prev => prev + totalCost);
      // Deduct shares
      setPortfolio(prev => {
        const existing = prev.find(item => item.symbol === symbol);
        if (!existing) return prev;
        
        if (existing.shares <= shares) {
          return prev.filter(item => item.symbol !== symbol); // liquidate entirely
        } else {
          return prev.map(item => item.symbol === symbol ? { ...item, shares: existing.shares - shares } : item);
        }
      });
    }
  };

  const triggerLiveAiAnalysis = async (symbol: string) => {
    setAiLoading(true);
    try {
      const passcode = localStorage.getItem('sa_ai_access_code') || '';
      const res = await fetch(`/api/stocks/${symbol}/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-access-code': passcode
        }
      });
      if (res.ok) {
        const report = await res.json();
        setAiReportsCache(prev => ({
          ...prev,
          [symbol]: report
        }));
      } else if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'AI_ACCESS_LOCKED') {
          window.dispatchEvent(new CustomEvent('unauthorized-ai'));
        }
      }
    } catch (e) {
      console.error('Trigger AI analysis target err:', e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleResetLocalStorage = () => {
    localStorage.removeItem('sa_watchlist');
    localStorage.removeItem('sa_alerts');
    localStorage.removeItem('sa_portfolio');
    localStorage.removeItem('sa_cash');
    setWatchlist(['005930', 'NVDA', 'TSLA']);
    setAlerts([]);
    setPortfolio([
      { symbol: '005930', stockName: '삼성전자', shares: 50, buyAvgPrice: 69500 },
      { symbol: 'TSLA', stockName: '테슬라', shares: 15, buyAvgPrice: 175.5 * 1350 }
    ]);
    setCash(10000000);
  };

  // --- Filters ---
  const currentSelectedStock = stocks.find(s => s.symbol === selectedSymbol) || stocks[0];

  const filteredStocks = stocks.filter(stock => {
    // Text query search
    const query = searchQuery.trim().toLowerCase();
    
    // Watchlist condition filter
    // If we have a text search query, allow seeing matching stocks even block is on
    if (watchlistOnly && !query && !watchlist.includes(stock.symbol)) return false;
    
    if (!query) return true;

    return (
      stock.name.toLowerCase().includes(query) ||
      stock.symbol.toLowerCase().includes(query) ||
      stock.nameEn.toLowerCase().includes(query)
    );
  });

  // Calculate knee-shoulder level visualization factors
  const kneeShoulderPct = currentSelectedStock ? currentSelectedStock.kneeShoulderIndex : 50;
  const kneeStatus = currentSelectedStock ? currentSelectedStock.kneeShoulderStatus : 'WAIST';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans" id="app-root-container">
      {/* Header and guest user profile */}
      <Header
        nickname={nickname}
        onChangeNickname={setNickname}
        onResetData={handleResetLocalStorage}
        isSimulating={stocks.length > 0}
        isAiProtected={isAiProtected}
        isAiUnlocked={!!aiPasscode}
        onOpenPasscodeModal={() => setShowPasscodePrompt(true)}
      />

      {/* Floating Animated Alarm triggers Notification Toast */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-emerald-500/50 bg-zinc-900 p-4 shadow-2xl shadow-emerald-500/10 animate-fade-in" id="live-alert-toast">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left">
              <h5 className="font-sans text-xs font-bold text-zinc-100">{activeToast.message}</h5>
              <p className="mt-1 font-sans text-[11px] text-zinc-400 leading-relaxed">{activeToast.sub}</p>
            </div>
            <button 
              onClick={() => setActiveToast(null)} 
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Primary tab views selection bar */}
      <nav className="border-b border-zinc-800 bg-zinc-950/40 px-6 py-2">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <button
            onClick={() => setActiveTab('MONITOR')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'MONITOR'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
            id="tab-monitor"
          >
            <Activity className="h-4 w-4" />
            실시간 종목 모니터링
          </button>
          <button
            onClick={() => setActiveTab('THEMELAB')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'THEMELAB'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
            id="tab-themelab"
          >
            <Layers className="h-4 w-4" />
            인포그래픽 테마 연구소
          </button>
          <button
            onClick={() => setActiveTab('MYSTOCKS')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'MYSTOCKS'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
            id="tab-mystocks"
          >
            <Star className="h-4 w-4 text-amber-400" />
            관심종목 그룹핑 & 인포그래픽 분석
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-6 space-y-6">
        {activeTab === 'MONITOR' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            
            {/* Left sidebar space: List of available stocks */}
            <div className="lg:col-span-4 flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4" id="stocks-selector-panel">
              <div className="text-left flex items-center justify-between border-b border-zinc-800/60 pb-2">
                <div>
                  <h3 className="font-sans text-sm font-bold text-zinc-100">실시간 종목 리스트</h3>
                  <p className="text-[10px] text-zinc-500">야후 파이낸스 실시간 시세 연동</p>
                </div>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1 rounded bg-zinc-950 hover:bg-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="시세 새로고침"
                  type="button"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? '갱신중' : '새로고침'}
                </button>
              </div>

              {/* Filtering Controls */}
              <div className="space-y-3">
                {/* Watchlist Quick Selection badges */}
                <div className="space-y-1 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">★ 내 관심종목</span>
                    {watchlist.length > 0 && <span className="text-[9px] text-zinc-600">클릭 시 바로 이동</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {watchlist.map(sym => {
                      const st = stocks.find(s => s.symbol === sym);
                      if (!st) return null;
                      return (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setSelectedSymbol(sym)}
                          className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all border ${
                            selectedSymbol === sym
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/45'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800/80 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          <span className="text-amber-500">★</span>
                          <span>{st.name}</span>
                        </button>
                      );
                    })}
                    {watchlist.length === 0 && (
                      <span className="text-[10.5px] text-zinc-500 italic block py-0.5">등록된 관심종목이 없습니다.</span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="종목명 또는 심볼 검색... (예: 육일)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-4 font-sans text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    id="stock-search-box"
                  />
                </div>

                <div className="flex items-center justify-between">
                  {/* Watched list only option */}
                  <button
                    onClick={() => setWatchlistOnly(!watchlistOnly)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                      watchlistOnly
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                    id="btn-filter-watchlist"
                  >
                    <Star className={`h-3 w-3 ${watchlistOnly ? 'fill-current text-amber-400' : ''}`} />
                    관심종목만 보기
                  </button>
                  <span className="font-mono text-[10px] text-zinc-500">
                    전체: {stocks.length}개 종목
                  </span>
                </div>

                {/* --- Live Sync Config Switch --- */}
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 text-left space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-emerald-400 tracking-wider block uppercase">⚙️ 시세 연동 모드 설정</span>
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLiveSyncEnabled ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveSyncEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-zinc-200">
                          {isLiveSyncEnabled ? '실시간 야후 파이낸스 연동 ON' : '사용자 정의 금액 고정 모드'}
                        </p>
                        <p className="text-[9.5px] text-zinc-500">
                          {isLiveSyncEnabled ? '글로벌 외신 실시간 변동 적용' : '내 스크린샷과 시세 고정 보관 (권장)'}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleToggleLiveSync(!isLiveSyncEnabled)}
                        type="button"
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isLiveSyncEnabled ? 'bg-emerald-500' : 'bg-zinc-850'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-100 shadow ring-0 transition duration-200 ease-in-out ${
                            isLiveSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-zinc-900/60 pt-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-indigo-400 tracking-wider block uppercase">📈 실시간 모의 거래 시뮬레이션</span>
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSimulationEnabled ? 'bg-indigo-400' : 'bg-zinc-600'} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulationEnabled ? 'bg-indigo-500' : 'bg-zinc-500'}`}></span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-zinc-200">
                          {isSimulationEnabled ? '미세 호가 변동 활성화' : '시뮬레이션 일시정지'}
                        </p>
                        <p className="text-[9.5px] text-zinc-500 font-normal">
                          시장 비집계 시간이나 주말에도 3초마다 모의 실시간 체결가 변동 효과를 생성합니다.
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleSimulation(!isSimulationEnabled)}
                        type="button"
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isSimulationEnabled ? 'bg-indigo-500' : 'bg-zinc-850'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-100 shadow ring-0 transition duration-200 ease-in-out ${
                            isSimulationEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* --- Add Custom Stock Drawer --- */}
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 text-left space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-zinc-400 tracking-wider block uppercase">➕ 관심종목 직접 발굴 / 추가</span>
                    <button
                      onClick={() => setIsAddingCustom(!isAddingCustom)}
                      type="button"
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      {isAddingCustom ? '닫기' : '종목 만들기'}
                    </button>
                  </div>

                  {isAddingCustom ? (
                    <form onSubmit={handleCreateCustomStock} className="space-y-2 pt-1 border-t border-zinc-900/60 transition-all">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] text-zinc-500 mb-0.5">종목코드 (6자리)</label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="000100"
                            value={newStockForm.symbol}
                            onChange={(e) => setNewStockForm({ ...newStockForm, symbol: e.target.value })}
                            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-100 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-zinc-500 mb-0.5">종목명 (한글/영문)</label>
                          <input
                            type="text"
                            required
                            placeholder="예: 우량홀딩스"
                            value={newStockForm.name}
                            onChange={(e) => setNewStockForm({ ...newStockForm, name: e.target.value })}
                            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-100 outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Search / Preset stock suggestions */}
                      {searchSuggestions.length > 0 && (
                        <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-lg p-1.5 space-y-1">
                          <p className="text-[9px] text-emerald-400 font-bold px-1.5 flex items-center gap-1">
                            <span>🔍 종목 자동검색 매칭</span>
                            <span className="text-[8px] text-zinc-500 font-normal">(클릭하여 자동완성 및 빠른 입력)</span>
                          </p>
                          <div className="max-h-[120px] overflow-y-auto space-y-0.5 subtle-scrollbar">
                            {searchSuggestions.map((s, idx) => {
                              const alreadyInWatchlist = watchlist.includes(s.symbol);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setNewStockForm({
                                      symbol: s.symbol,
                                      name: s.name,
                                      nameEn: s.nameEn || '',
                                      price: String(s.price),
                                      prevClose: String(s.prevClose),
                                      high52: String(s.high52Week || s.price * 1.3),
                                      low52: String(s.low52Week || s.price * 0.7)
                                    });
                                  }}
                                  className="w-full text-left flex items-center justify-between px-2 py-1 rounded transition-colors hover:bg-zinc-800/85 text-[10px] group"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-mono text-[8.5px] text-zinc-400 bg-zinc-900 px-1 py-0.2 rounded shrink-0">{s.symbol}</span>
                                    <span className="font-bold text-zinc-100 truncate">{s.name}</span>
                                    {s.nameEn && <span className="text-[8px] text-zinc-500 font-mono truncate hidden sm:inline">{s.nameEn}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[9.5px] font-mono font-bold text-emerald-400">
                                      {s.symbol === 'NVDA' || s.symbol === 'TSLA' || s.symbol === 'AAPL' ? `$${s.price}` : `₩${Math.round(s.price).toLocaleString()}`}
                                    </span>
                                    <span className="text-[8.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1 transition-colors">
                                      {alreadyInWatchlist ? '✓ 선택' : '선택'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] text-zinc-500 mb-0.5">현재 시세</label>
                          <input
                            type="number"
                            required
                            placeholder="12500"
                            value={newStockForm.price}
                            onChange={(e) => setNewStockForm({ ...newStockForm, price: e.target.value })}
                            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-100 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-zinc-500 mb-0.5">전일 종가</label>
                          <input
                            type="number"
                            required
                            placeholder="12000"
                            value={newStockForm.prevClose}
                            onChange={(e) => setNewStockForm({ ...newStockForm, prevClose: e.target.value })}
                            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-100 outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] text-zinc-500 mb-0.5">52주 고가</label>
                          <input
                            type="number"
                            placeholder="18000"
                            value={newStockForm.high52}
                            onChange={(e) => setNewStockForm({ ...newStockForm, high52: e.target.value })}
                            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-100 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-zinc-500 mb-0.5">52주 저가</label>
                          <input
                            type="number"
                            placeholder="9000"
                            value={newStockForm.low52}
                            onChange={(e) => setNewStockForm({ ...newStockForm, low52: e.target.value })}
                            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-100 outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded bg-emerald-500 hover:bg-emerald-400 py-1 text-zinc-950 font-bold text-[10px] transition-colors active:scale-95 cursor-pointer mt-1"
                      >
                        이 종목 추가 및 관심종목 자동 등록
                      </button>
                    </form>
                  ) : (
                    <p className="text-[9px] text-zinc-500">
                      보유하고 있는 종목 중 리스트에 없는 종목은 직접 코드를 조합해 추가할 수 있습니다.
                    </p>
                  )}
                </div>
              </div>

              {/* Scrolled stocks lists container */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[460px] pr-1">
                {stocks.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    <Clock className="h-6 w-6 mx-auto mb-2 opacity-40 animate-spin" />
                    시세 수신 준비중...
                  </div>
                ) : filteredStocks.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    일치하는 종목이 포착되지 않았습니다.
                  </div>
                ) : (
                  filteredStocks.map(stock => (
                    <StockListItem
                      key={stock.symbol}
                      stock={stock}
                      isSelected={selectedSymbol === stock.symbol}
                      watchlist={watchlist}
                      onSelect={() => setSelectedSymbol(stock.symbol)}
                      onToggleWatchlist={handleToggleWatchlist}
                      onDeleteStock={async (symbol, name) => {
                        if (confirm(`'${name}(${symbol})' 종목을 주식 목록에서 제외하시겠습니까?`)) {
                          try {
                            const res = await fetch(`/api/stocks/${symbol}`, { method: 'DELETE' });
                            if (res.ok) {
                              if (selectedSymbol === symbol) {
                                setSelectedSymbol('009150');
                              }
                              setWatchlist(prev => prev.filter(sym => sym !== symbol));
                              await fetchStocks();
                            }
                          } catch (err) {
                            console.error('Error deleting stock:', err);
                          }
                        }
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right main visualization: Detailed stock metrics and analyzer */}
            {currentSelectedStock ? (
              <div className="lg:col-span-8 space-y-6">
                
                {/* Visual Chart Panel */}
                <StockChart 
                  stock={currentSelectedStock} 
                  candles={candles} 
                  isWatched={watchlist.includes(currentSelectedStock.symbol)}
                  onToggleWatchlist={handleToggleWatchlist}
                  onUpdateStock={handleUpdateStock}
                  timeframe={timeframe}
                  onTimeframeChange={setTimeframe}
                />

                {/* Knee and Shoulder Visual Diagnostic scale */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left" id="knee-shoulder-diagnostic-hub">
                  <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-emerald-400" />
                      <h3 className="font-sans text-base font-bold text-zinc-100">
                        {currentSelectedStock.name} 무릎-어깨 지표 (Knee-Shoulder Ratio)
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="rounded bg-zinc-950 px-2 py-0.5 text-[9.5px] font-mono tracking-wide text-zinc-400 border border-zinc-800">
                        수식: (현재가 - 52주저가) ÷ (52주고가 - 52주저가)
                      </span>
                      <span className="text-[8.5px] text-zinc-500">
                        * 52주 가격 진폭 상의 기계적 현 시세 통계 백분율
                      </span>
                    </div>
                  </div>

                  {/* 5-segmented scale body slider diagram */}
                  <div className="mb-6">
                    <div className="relative mb-2 h-4 w-full rounded-full bg-zinc-950 overflow-hidden flex">
                      <div className="h-full bg-blue-500/30 border-r border-zinc-900 flex-1 text-center text-[8px] text-blue-300 font-bold justify-center" title="과매도">머나먼 발밑 (0-20%)</div>
                      <div className="h-full bg-emerald-500/40 border-r border-zinc-900 flex-1 text-center text-[8px] text-emerald-300 font-bold" title="저평가 분할진입">최적 무릎 (21-40%)</div>
                      <div className="h-full bg-amber-500/20 border-r border-zinc-900 flex-1 text-center text-[8px] text-amber-300 font-bold" title="적성">안전 허리 (41-70%)</div>
                      <div className="h-full bg-rose-500/20 border-r border-zinc-900 flex-1 text-center text-[8px] text-rose-300 font-bold" title="고평가 주의">비중축소 어깨 (71-90%)</div>
                      <div className="h-full bg-red-600/40 flex-1 text-center text-[8px] text-red-300 font-bold" title="과매수 상투">한계의 머리 (91-100%)</div>

                      {/* Moving indicator pointer needle */}
                      <div
                        className="absolute top-0 bottom-0 w-1.5 bg-white border border-black shadow-lg transition-all duration-700"
                        style={{ left: `${kneeShoulderPct}%`, transform: 'translateX(-50%)' }}
                      />
                    </div>

                    <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                      <span>52주 최저: {currentSelectedStock.symbol === 'NVDA' || currentSelectedStock.symbol === 'TSLA' || currentSelectedStock.symbol === 'AAPL' ? `$${currentSelectedStock.low52Week}` : `₩${currentSelectedStock.low52Week.toLocaleString()}`}</span>
                      <span className="text-zinc-300 font-bold bg-zinc-950 px-2 py-0.5 rounded">현재 위치: {kneeStatus === 'FOOT' ? '발밑 발바닥' : kneeStatus === 'KNEE' ? '달콤한 무릎 부근 🟢' : kneeStatus === 'WAIST' ? '적정지대 허리 부근' : kneeStatus === 'SHOULDER' ? '고평가 어깨 부근 🔴' : '과열 상투 머리끝 ⚠️'} ({kneeShoulderPct}%)</span>
                      <span>52주 최고: {currentSelectedStock.symbol === 'NVDA' || currentSelectedStock.symbol === 'TSLA' || currentSelectedStock.symbol === 'AAPL' ? `$${currentSelectedStock.high52Week}` : `₩${currentSelectedStock.high52Week.toLocaleString()}`}</span>
                    </div>
                  </div>

                  {/* AI analyzer catalysts report section (Why is it up or down?) */}
                  <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800/80">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-900 pb-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
                        <span className="font-sans text-xs font-bold text-zinc-200">
                          {currentSelectedStock.name} 오름/내림 원인 정밀 보고서
                        </span>
                      </div>
                      
                      {/* Live call to Gemini analyzer button */}
                      <button
                        onClick={() => triggerLiveAiAnalysis(currentSelectedStock.symbol)}
                        disabled={aiLoading}
                        className="flex items-center gap-1 rounded bg-emerald-500 px-3 py-1 font-sans text-[10px] font-bold text-zinc-950 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all active:scale-95"
                        id="btn-live-ai-analyze"
                      >
                        {aiLoading ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 animate-spin" /> 분석 보고서 작성중...
                          </span>
                        ) : (
                          '실시간 AI 인텔리전트 분석 요청 (공짜)'
                        )}
                      </button>
                    </div>

                    {/* AI report content layout splits */}
                    <div className="space-y-4">
                      {/* Diagnostic verbal commentary */}
                      <div>
                        <p className="font-sans text-xs text-zinc-300 leading-relaxed text-left border-l-2 border-emerald-500 pl-3">
                          {aiReportsCache[currentSelectedStock.symbol]?.kneeShoulderCommentary || 
                           '위의 실시간 AI 분석 요청 버튼을 클릭하면, 최신 수급 현황 및 거시 경제를 기반으로 무릎-어깨 여부의 정밀 해설을 Gemini가 실시간 생성하여 제공합니다.'}
                        </p>
                      </div>

                      {/* Positive / Negative table list details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Positive factors (Why is it up?) */}
                        <div className="bg-rose-500/5 rounded-xl border border-rose-500/10 p-3 text-left">
                          <h5 className="flex items-center gap-1 font-sans text-xs font-bold text-rose-400 mb-2">
                            <TrendingUp className="h-3.5 w-3.5" /> 오르면 왜 오르는가? (상승 핵심 촉매)
                          </h5>
                          <ul className="space-y-1.5 text-[11px] text-zinc-400">
                            {(aiReportsCache[currentSelectedStock.symbol]?.positiveFactors || []).map((factor, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-rose-500/60 font-mono">▸</span>
                                <span className="leading-snug">{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Negative factors (Why is it down?) */}
                        <div className="bg-blue-500/5 rounded-xl border border-blue-500/10 p-3 text-left">
                          <h5 className="flex items-center gap-1 font-sans text-xs font-bold text-blue-400 mb-2">
                            <TrendingDown className="h-3.5 w-3.5" /> 떨어지면 왜 지연되는가? (하방 저지 요인)
                          </h5>
                          <ul className="space-y-1.5 text-[11px] text-zinc-400">
                            {(aiReportsCache[currentSelectedStock.symbol]?.negativeFactors || []).map((factor, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-blue-500/60 font-mono">▸</span>
                                <span className="leading-snug">{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Unified advice verdict */}
                      {aiReportsCache[currentSelectedStock.symbol]?.investmentVerdict && (
                        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-center">
                          <span className="font-sans text-[11px] font-bold text-emerald-400">
                            ★ 전문가 종합 한줄코멘트: {aiReportsCache[currentSelectedStock.symbol].investmentVerdict}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Unified grid for Discussionboard, and Alerts setup */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DiscussionForum stock={currentSelectedStock} nickname={nickname} />
                  <AlertsPanel 
                    stocks={stocks} 
                    alerts={alerts} 
                    onAddAlert={handleCreateAlert} 
                    onRemoveAlert={handleRemoveAlert} 
                  />
                </div>

              </div>
            ) : null}

          </div>
        )}

        {activeTab === 'THEMELAB' && (
          <ThemeLab 
            onAddStockToWatchlist={handleAddStockToWatchlist} 
            watchlistSymbols={watchlist} 
          />
        )}

        {activeTab === 'MYSTOCKS' && (
          <PortfolioInfographic
            stocks={stocks}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}
      </main>

      {/* Page Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-6 py-8 text-center text-zinc-600 text-xs">
        <p className="font-sans leading-relaxed">
          © 2026 Stock-er. All simulated calculations reserved.
        </p>
        <p className="mt-1 font-sans opacity-70">
          본 플랫폼에서 제공되는 모든 개별가와 인지 수명주기는 전면 가공 모의 시뮬레이션 데이터입니다. 실제 투자 대안 판단에 유의해 주시기 바랍니다. API: Free Client Engine.
        </p>
      </footer>

      {showPasscodePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in" id="ai-passcode-modal">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <ShieldAlert className="h-6 w-6 font-bold text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-sans text-sm font-bold text-zinc-100">AI 분석 액세스 코드 인증</h3>
                <p className="font-sans text-[11px] text-zinc-400 leading-normal mt-0.5">공개용 공유 링크의 무제한 API 오용 방지를 위한 보안 인증</p>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-xs text-zinc-300 leading-relaxed font-sans mb-4">
                이 플랫폼의 소유자가 Gemini AI 요금 과다 지출을 막기 위해 <b>패스코드 보호막</b>을 작동시켰습니다.
                보안 코드를 올바르게 기입해야 AI 애널리스트 및 테마 인포그래픽 기능이 정상 가동됩니다.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.querySelector('input') as HTMLInputElement;
                  const value = input.value.trim();
                  if (value) {
                    localStorage.setItem('sa_ai_access_code', value);
                    setAiPasscode(value);
                    setShowPasscodePrompt(false);
                    // Quick alert/refresh trigger
                    if (activeToast === null) {
                      setActiveToast({
                        id: Date.now().toString(),
                        message: '🔑 AI 액세스 키 업데이트 완료',
                        sub: '암호가 브라우저에 임시 저장되었습니다. AI 기능 실행을 다시 시도해주세요!'
                      });
                      setTimeout(() => setActiveToast(null), 4000);
                    }
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">패스워드 입력</label>
                  <input
                    type="password"
                    placeholder="서버 설정용 AI_ACCESS_CODE를 입력하세요"
                    defaultValue={aiPasscode}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 font-sans text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasscodePrompt(false);
                    }}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 font-sans text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all active:scale-[0.98]"
                  >
                    닫기
                  </button>
                  
                  {aiPasscode && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('sa_ai_access_code');
                        setAiPasscode('');
                        setShowPasscodePrompt(false);
                        if (activeToast === null) {
                          setActiveToast({
                            id: Date.now().toString(),
                            message: '🔓 AI 기입 내역 초기화',
                            sub: '저장된 로컬 액세스 코드를 비웠습니다.'
                          });
                          setTimeout(() => setActiveToast(null), 3000);
                        }
                      }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 font-sans text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
                    >
                      삭제
                    </button>
                  )}

                  <button
                    type="submit"
                    className="flex-1.5 rounded-xl bg-amber-500 py-2.5 px-4 font-sans text-xs font-black text-zinc-950 hover:bg-amber-400 transition-all active:scale-[0.98]"
                  >
                    확인 후 적용
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
