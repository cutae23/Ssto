import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { INITIAL_STOCKS, DEFAULT_AI_REPORTS, SEED_DISCUSSIONS, getKneeShoulderStatus, generateHistoricalCandles } from './src/data/mockStocks.ts';
import { Stock, DiscussionPost, AiAnalysisReport } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ limit: '12mb', extended: true }));

// In-Memory Live Stock Prices & Discussions to persist state during server runtime
let liveStocks: Stock[] = JSON.parse(JSON.stringify(INITIAL_STOCKS)).map((stock: Stock) => {
  return { ...stock, isCalibrated: false };
});
let liveDiscussions: DiscussionPost[] = [...SEED_DISCUSSIONS];

// Format Market Cap from number to reader-friendly string
function formatMarketCap(capNum: number, symbol: string): string {
  if (symbol === 'NVDA' || symbol === 'TSLA' || symbol === 'AAPL') {
    const trillion = capNum / 1e12;
    if (trillion >= 1) {
      return `${trillion.toFixed(2)}조 달러`;
    }
    const billion = capNum / 1e9;
    return `${billion.toFixed(1)}억 달러`;
  } else {
    // Yahoo returns KRW-local market cap for KS/KQ stocks
    const trillion = capNum / 1e12;
    if (trillion >= 1) {
      const rest = capNum % 1e12;
      const billion = Math.round(rest / 1e8);
      if (billion > 0) {
        return `${Math.floor(trillion)}조 ${billion}억원`;
      }
      return `${Math.floor(trillion)}조원`;
    }
    const billion = Math.round(capNum / 1e8);
    return `${billion}억원`;
  }
}

// Global State for Yahoo Live Sync (default enabled to start with accurate, verified market prices)
let isLiveSyncEnabled = true;
let isSimulationEnabled = true;

// Helper to resolve standard Korean stocks and world tickers
function getYahooTicker(symbol: string): string {
  if (symbol === 'NVDA' || symbol === 'TSLA' || symbol === 'AAPL') {
    return symbol;
  }
  // Check if it's a 6-digit Korean stock code
  if (/^\d{6}$/.test(symbol)) {
    const kosdaqList = [
      '015710', '382900', '002230', '277810', '322180', '108490', '117730', 
      '272290', '160980', '092070', '211270', '049070', '232140', '439090', 
      '460930', '071670', '065350', '101170', '189300', '028080', '036030', 
      '191410'
    ];
    if (kosdaqList.includes(symbol)) {
      return `${symbol}.KQ`;
    }
    return `${symbol}.KS`;
  }
  return symbol;
}

// Helper to resolve stock scaling issues (Yahoo/Naver prices are fully correct and match user watchlist)
function getStockScaleFactor(symbol: string): number {
  return 1;
}

// Fetch daily candles from Naver FChart XML
async function fetchNaverDailyCandles(symbol: string, count: number = 100): Promise<any[]> {
  const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${symbol}&timeframe=day&count=${count}&requestType=0`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6500);
  
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
    }
  });
  clearTimeout(timeoutId);
  
  if (!response.ok) {
    throw new Error(`Naver FChart request failed: ${response.statusText}`);
  }
  
  const xmlText = await response.text();
  const itemRegex = /<item data="([^"]+)" \/>/g;
  const candles: any[] = [];
  const factor = getStockScaleFactor(symbol);
  
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const rawData = match[1];
    const parts = rawData.split('|');
    if (parts.length >= 6) {
      // Format: Date (YYYYMMDD)|Open|High|Low|Close|Volume
      const rawDate = parts[0];
      const open = parseFloat(parts[1]) / factor;
      const high = parseFloat(parts[2]) / factor;
      const low = parseFloat(parts[3]) / factor;
      const close = parseFloat(parts[4]) / factor;
      const volume = parseFloat(parts[5]);
      
      const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
      candles.push({
        time: formattedDate,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume
      });
    }
  }
  
  return candles;
}

// Fetch real stock prices from Naver Finance (for domestic stocks) and Yahoo Finance (for US stocks)
async function fetchRealStockPrices() {
  if (!isLiveSyncEnabled) {
    return; // Sync is disabled, preserve manually defined / snapshot values
  }
  
  try {
    const promises = liveStocks.map(async (stock) => {
      const isKrx = /^\d{6}$/.test(stock.symbol);
      let naverData: any = null;
      let yahooMeta: any = null;
      
      // 1. Fetch Naver Polling API for KRX Stocks (to get Nextrade overMarket and real-time prices)
      if (isKrx) {
        const url = `https://polling.finance.naver.com/api/realtime/domestic/stock/${stock.symbol}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
            }
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json() as any;
            const naverStock = data?.datas?.[0];
            if (naverStock) {
              const price = parseFloat(naverStock.closePriceRaw) || stock.price;
              const compareToPreviousClosePriceRaw = naverStock.compareToPreviousClosePriceRaw;
              const rawChange = parseFloat(compareToPreviousClosePriceRaw) || 0;
              const prevClose = price - rawChange;
              
              let nxtPrice: number | undefined;
              let nxtChange: number | undefined;
              let nxtChangePercent: number | undefined;
              
              const supportsNextrade = stock.name.includes('Nx대체') || stock.isCalibrated;
              if (supportsNextrade && naverStock.overMarketPriceInfo) {
                const overPriceStr = naverStock.overMarketPriceInfo.overPrice;
                if (overPriceStr) {
                  nxtPrice = parseFloat(overPriceStr.replace(/,/g, ''));
                }
                const overChangeStr = naverStock.overMarketPriceInfo.compareToPreviousClosePrice;
                if (overChangeStr) {
                  nxtChange = parseFloat(overChangeStr.replace(/,/g, ''));
                  const signName = naverStock.overMarketPriceInfo.compareToPreviousPrice?.name;
                  if (signName === 'FALLING' || naverStock.overMarketPriceInfo.compareToPreviousPrice?.text === '하락') {
                    nxtChange = -Math.abs(nxtChange);
                  }
                }
                const overRatioStr = naverStock.overMarketPriceInfo.fluctuationsRatio;
                if (overRatioStr) {
                  nxtChangePercent = parseFloat(overRatioStr);
                  const signName = naverStock.overMarketPriceInfo.compareToPreviousPrice?.name;
                  if (signName === 'FALLING' || naverStock.overMarketPriceInfo.compareToPreviousPrice?.text === '하락') {
                    nxtChangePercent = -Math.abs(nxtChangePercent);
                  }
                }
              }
              
              naverData = {
                price,
                prevClose,
                changeRaw: rawChange,
                volume: parseFloat(naverStock.accumulatedTradingVolumeRaw) || stock.volume,
                open: parseFloat(naverStock.openPriceRaw) || price,
                high: parseFloat(naverStock.highPriceRaw) || price,
                low: parseFloat(naverStock.lowPriceRaw) || price,
                overMarketPriceInfo: naverStock.overMarketPriceInfo,
                nxtPrice,
                nxtChange,
                nxtChangePercent,
                rawStock: naverStock
              };
            }
          }
        } catch (err) {
          clearTimeout(timeoutId);
          console.error(`Error fetching Naver realtime for ${stock.symbol}:`, err);
        }
      }
      
      // 2. Fetch Yahoo Finance for BOTH US and KRX Stocks (to get stable previous close, highs, lows, etc.)
      const yahooSymbol = getYahooTicker(stock.symbol);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1d`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
          }
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json() as any;
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta) {
            yahooMeta = meta;
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error(`Error fetching Yahoo chart for ${stock.symbol} (${yahooSymbol}):`, err);
      }
      
      return {
        symbol: stock.symbol,
        success: (naverData !== null || yahooMeta !== null),
        naver: naverData,
        meta: yahooMeta
      };
    });
    
    const results = await Promise.allSettled(promises);
    
    const dataMap = new Map<string, any>();
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.success) {
        dataMap.set(res.value.symbol, res.value);
      }
    }
    
    liveStocks = liveStocks.map(stock => {
      // If the stock is flagged as manually calibrated, keep all its values completely safe from background sync overthrows!
      if (stock.isCalibrated) {
        return stock;
      }

      const entry = dataMap.get(stock.symbol);
      if (!entry) return stock;
      
      let price = stock.price;
      let prevClose = stock.prevClose;
      let high52Week = stock.high52Week;
      let low52Week = stock.low52Week;
      let volume = stock.volume;
      let open = stock.open ?? price;
      let high = stock.high ?? price;
      let low = stock.low ?? price;
      
      const factor = getStockScaleFactor(stock.symbol);
      
      let nxtPrice: number | undefined = stock.nxtPrice;
      let nxtChange: number | undefined = stock.nxtChange;
      let nxtChangePercent: number | undefined = stock.nxtChangePercent;
      
      if (entry.naver) {
        const naverPrice = entry.naver.price / factor;
        const naverPrevClose = entry.naver.prevClose / factor;
        const hasActiveNaverChange = (entry.naver.changeRaw !== 0);
        
        // During trading hours when there is a real-time Naver price change, use Naver.
        if (hasActiveNaverChange) {
          price = naverPrice;
          prevClose = naverPrevClose;
        } else {
          // Off-market/Pre-market fallback: use Yahoo Finance for regular session close stats
          if (entry.meta) {
            price = (entry.meta.regularMarketPrice ?? naverPrice) / factor;
            prevClose = (entry.meta.chartPreviousClose ?? naverPrevClose) / factor;
          } else {
            price = naverPrice;
            prevClose = naverPrevClose !== price ? naverPrevClose : stock.prevClose;
          }
        }
        
        // Populate 52-week parameters cleanly
        if (entry.meta) {
          high52Week = (entry.meta.fiftyTwoWeekHigh ?? stock.high52Week) / factor;
          low52Week = (entry.meta.fiftyTwoWeekLow ?? stock.low52Week) / factor;
        } else {
          high52Week = stock.high52Week > price ? stock.high52Week : price * 1.15;
          low52Week = stock.low52Week < price ? stock.low52Week : price * 0.85;
        }
        
        // Fallback for daily candles high, low & open
        open = (entry.meta && entry.meta.regularMarketPrice) ? entry.meta.regularMarketPrice / factor : (entry.naver.open / factor);
        high = (entry.meta && entry.meta.regularMarketDayHigh) ? entry.meta.regularMarketDayHigh / factor : (entry.naver.high / factor);
        low = (entry.meta && entry.meta.regularMarketDayLow) ? entry.meta.regularMarketDayLow / factor : (entry.naver.low / factor);
        
        const naverVol = entry.naver.volume;
        volume = (!isNaN(naverVol) && naverVol > 0) ? naverVol : (entry.meta?.regularMarketVolume ?? stock.volume);
        
        const supportsNextrade = stock.name.includes('Nx대체') || stock.isCalibrated;
        if (supportsNextrade && entry.naver.nxtPrice !== undefined) {
          nxtPrice = entry.naver.nxtPrice / factor;
          nxtChange = entry.naver.nxtChange !== undefined ? entry.naver.nxtChange / factor : undefined;
          nxtChangePercent = entry.naver.nxtChangePercent;
        } else if (supportsNextrade) {
          // Retain previous Nextrade data instead of destroying it
          nxtPrice = stock.nxtPrice;
          nxtChange = stock.nxtChange;
          nxtChangePercent = stock.nxtChangePercent;
        } else {
          nxtPrice = undefined;
          nxtChange = undefined;
          nxtChangePercent = undefined;
        }
      } else if (entry.meta) {
        const meta = entry.meta;
        price = (meta.regularMarketPrice ?? stock.price) / factor;
        prevClose = (meta.chartPreviousClose ?? stock.prevClose) / factor;
        high52Week = (meta.fiftyTwoWeekHigh ?? stock.high52Week) / factor;
        low52Week = (meta.fiftyTwoWeekLow ?? stock.low52Week) / factor;
        volume = meta.regularMarketVolume ?? stock.volume;
        open = price;
        high = (meta.regularMarketDayHigh || meta.regularMarketPrice || price) / factor;
        low = (meta.regularMarketDayLow || meta.regularMarketPrice || price) / factor;
      }
      
      const change = price - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
      
      const stats = getKneeShoulderStatus(price, low52Week, high52Week);
      
      return {
        ...stock,
        price,
        prevClose,
        open,
        high,
        low,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        high52Week,
        low52Week,
        volume,
        kneeShoulderIndex: stats.index,
        kneeShoulderStatus: stats.status,
        nxtPrice,
        nxtChange,
        nxtChangePercent
      };
    });
    
    console.log('Real stock prices updated successfully from combined Naver and Yahoo pipelines.');
  } catch (err) {
    console.error('Error in fetchRealStockPrices:', err);
  }
}

// Calm background interval - update real-time stock quotes every 30 seconds if live sync is on
setInterval(fetchRealStockPrices, 30000);

// Active micro-simulator: tick mock-fluctuations every 3 seconds to keep UI lively
function simulateMicroFluctuations() {
  if (!isSimulationEnabled) return;
  if (isLiveSyncEnabled) return; // Skip simulated fluctuations if live Yahoo Finance sync is active
  
  // Choose random stocks to update this turn to feel realistic (e.g. 40% of stocks update per 3 seconds)
  const symbolsToUpdate = liveStocks
    .map(s => s.symbol)
    .filter(() => Math.random() < 0.4); 
    
  if (symbolsToUpdate.length === 0 && liveStocks.length > 0) {
    // Ensure at least one stock ticks
    const randomIdx = Math.floor(Math.random() * liveStocks.length);
    symbolsToUpdate.push(liveStocks[randomIdx].symbol);
  }

  liveStocks = liveStocks.map(stock => {
    if (!symbolsToUpdate.includes(stock.symbol)) return stock;

    // Generate minute change: -0.25% to +0.25%
    const pctChange = (Math.random() * 0.5 - 0.25) / 100;
    let newPrice = stock.price * (1 + pctChange);
    
    // Bounds guard
    if (newPrice < 1) newPrice = 1;

    // Proper Korean/US market tick sizing
    const isKoreanStock = /^\d{6}$/.test(stock.symbol);
    if (isKoreanStock) {
      if (newPrice > 500000) {
        newPrice = Math.round(newPrice / 1000) * 1000;
      } else if (newPrice > 100000) {
        newPrice = Math.round(newPrice / 500) * 500;
      } else if (newPrice > 50000) {
        newPrice = Math.round(newPrice / 100) * 100;
      } else if (newPrice > 10000) {
        newPrice = Math.round(newPrice / 50) * 50;
      } else if (newPrice > 1000) {
        newPrice = Math.round(newPrice / 5) * 5;
      } else {
        newPrice = Math.round(newPrice);
      }
    } else {
      // US or global stock (e.g. USD)
      newPrice = Math.round(newPrice * 100) / 100;
    }

    const change = newPrice - stock.prevClose;
    const changePercent = (change / stock.prevClose) * 100;

    // Daily High/Low tracker
    const todayOpen = stock.open ?? stock.price;
    const todayHigh = Math.max(stock.high ?? stock.price, newPrice);
    const todayLow = Math.min(stock.low ?? stock.price, newPrice);
    
    const high52Week = Math.max(stock.high52Week, newPrice);
    const low52Week = Math.min(stock.low52Week, newPrice);

    const stats = getKneeShoulderStatus(newPrice, low52Week, high52Week);

    let nxtPrice = stock.nxtPrice;
    let nxtChange = stock.nxtChange;
    let nxtChangePercent = stock.nxtChangePercent;
    if (nxtPrice !== undefined) {
      nxtPrice = nxtPrice * (1 + pctChange);
      if (isKoreanStock) {
        if (nxtPrice > 500000) {
          nxtPrice = Math.round(nxtPrice / 1000) * 1000;
        } else if (nxtPrice > 100000) {
          nxtPrice = Math.round(nxtPrice / 500) * 500;
        } else if (nxtPrice > 50000) {
          nxtPrice = Math.round(nxtPrice / 100) * 100;
        } else if (nxtPrice > 10000) {
          nxtPrice = Math.round(nxtPrice / 50) * 50;
        } else if (nxtPrice > 1000) {
          nxtPrice = Math.round(nxtPrice / 5) * 5;
        } else {
          nxtPrice = Math.round(nxtPrice);
        }
      } else {
        nxtPrice = Math.round(nxtPrice * 100) / 100;
      }
      nxtChange = nxtPrice - stock.prevClose;
      nxtChangePercent = (nxtChange / stock.prevClose) * 100;
      nxtChange = Math.round(nxtChange * 100) / 100;
      nxtChangePercent = Math.round(nxtChangePercent * 100) / 100;
    }

    return {
      ...stock,
      price: newPrice,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      high: todayHigh,
      low: todayLow,
      high52Week,
      low52Week,
      kneeShoulderIndex: stats.index,
      kneeShoulderStatus: stats.status,
      nxtPrice,
      nxtChange,
      nxtChangePercent
    };
  });
}

// Tick simulated live stock trade desk prices every 3 seconds!
setInterval(simulateMicroFluctuations, 3000);

function getCleanKey(key?: string): string {
  if (!key) return '';
  return key.trim().replace(/^['"]|['"]$/g, '');
}

function safeJsonParse(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    // Remove starting ```json or ```
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '');
    // Remove ending ```
    cleaned = cleaned.replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned.trim());
}

// Dynamic initialization helper for Gemini supporting standard API keys, Google OAuth2 bearer tokens (ya29.), and client-provided custom keys
function getGemini(customKey?: string): GoogleGenAI {
  const reqKey = customKey ? (customKey as string) : '';
  const key = getCleanKey(reqKey || process.env.GEMINI_API_KEY);
  
  if (!key) {
    throw new Error('GEMINI_API_KEY가 존재하지 않습니다. 우측 상단의 AI Studio Secrets 메뉴에 설정하거나, 앱 우측 상단의 [Gemini API 개인키 설정] 칸에 개인 API 키를 입력해 주세요.');
  }

  const isOAuth = key.startsWith('ya29.');
  if (isOAuth) {
    const originalEnvKey = process.env.GEMINI_API_KEY;
    // Temporarily clear to prevent the SDK from auto-loading it from process.env as apiKey
    delete process.env.GEMINI_API_KEY;
    try {
      return new GoogleGenAI({
        apiKey: '', // Empty string to prevent appending ?key=
        httpOptions: {
          headers: {
            'Authorization': `Bearer ${key}`,
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } finally {
      process.env.GEMINI_API_KEY = originalEnvKey;
    }
  }

  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Authentication middleware to restrict Gemini API usage on the shared link
function verifyAiAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const code = process.env.AI_ACCESS_CODE;
  if (!code || code.trim() === '') {
    return next();
  }
  
  const providedCode = req.headers['x-ai-access-code'] || req.body?.accessCode;
  if (providedCode === code.trim()) {
    return next();
  }
  
  res.status(403).json({
    error: 'AI_ACCESS_LOCKED',
    message: 'AI 기능 접근이 패스코드로 잠겨있습니다. 올바른 액세스 코드를 입력해 주세요.'
  });
}

// REST API Endpoints
// Check if Gemini AI access has been password-protected
app.get('/api/ai-config', (req, res) => {
  const code = process.env.AI_ACCESS_CODE;
  res.json({
    isProtected: !!(code && code.trim() !== '')
  });
});

// Check if Gemini API key exists server-side
app.get('/api/ai-config-status', (req, res) => {
  const cleanServerKey = getCleanKey(process.env.GEMINI_API_KEY);
  res.json({
    serverKeyActive: !!(cleanServerKey !== '')
  });
});

// Live test endpoint for client or developer API keys
app.post('/api/test-gemini', async (req, res) => {
  const keyToUse = getCleanKey(process.env.GEMINI_API_KEY);

  if (!keyToUse) {
    res.status(400).json({ 
      success: false, 
      error: '서버 내 환경변수(GEMINI_API_KEY)가 구성되어 있지 않습니다.' 
    });
    return;
  }

  try {
    const testClient = new GoogleGenAI({
      apiKey: keyToUse,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-validator',
        }
      }
    });

    const response = await testClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Say hello in Korean. Briefly in 3 words.',
    });

    const text = response.text || '';
    if (text) {
      res.json({ 
        success: true, 
        mode: 'SERVER_KEY' 
      });
    } else {
      res.json({ 
        success: false, 
        error: '응답이 수신되었으나 반환 텍스트가 비어있습니다.' 
      });
    }
  } catch (err: any) {
    console.error('Gemini valid check fail:', err);
    res.json({ 
      success: false, 
      error: err?.message || '구글 Gemini 백엔드 호출 도중 오류 발생: API 키가 잘못되었거나 만료되었을 수 있습니다.' 
    });
  }
});

// 1. Get Live Stocks
app.get('/api/stocks', (req, res) => {
  res.json(liveStocks);
});

// Cache for Yahoo candles to prevent rate-limiting and browser lag
const candleCache = new Map<string, { data: any[]; timestamp: number }>();

// Helper to fetch real day candles from Naver or Yahoo Finance
async function fetchRealCandles(symbol: string, interval: string = '1d'): Promise<any[]> {
  const cacheKey = `${symbol}_${interval}`;
  const now = Date.now();
  const cached = candleCache.get(cacheKey);
  
  if (cached && (now - cached.timestamp < 180000)) {
    return cached.data;
  }

  let candles: any[] = [];

  // 1. For domestic K-stocks and daily timeframe, try Naver FChart first
  if (/^\d{6}$/.test(symbol) && interval === '1d') {
    try {
      candles = await fetchNaverDailyCandles(symbol, 75);
    } catch (err) {
      console.error(`Error fetching Naver daily candles for ${symbol}, fallback to Yahoo:`, err);
    }
  }

  // 2. Fallback to Yahoo Finance (or use Yahoo for US shares and intraday)
  if (candles.length === 0) {
    const yahooSymbol = getYahooTicker(symbol);
    
    let range = '3mo';
    let queryInterval = '1d';
    
    if (interval === '1m') {
      range = '1d';
      queryInterval = '1m';
    } else if (interval === '5m') {
      range = '5d';
      queryInterval = '5m';
    }
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${queryInterval}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json() as any;
        const result = data?.chart?.result?.[0];
        if (result) {
          const timestamps = result.timestamp || [];
          const quote = result.indicators?.quote?.[0] || {};
          const opens = quote.open || [];
          const highs = quote.high || [];
          const lows = quote.low || [];
          const closes = quote.close || [];
          const volumes = quote.volume || [];
          
          const factor = getStockScaleFactor(symbol);
          
          for (let i = 0; i < timestamps.length; i++) {
            const epoch = timestamps[i];
            const date = new Date(epoch * 1000);
            
            let timeStr = '';
            if (interval === '1d') {
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              timeStr = `${yyyy}-${mm}-${dd}`;
            } else {
              // Intraday (1m, 5m): Show Month/Day and Hour:Minute
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              const hh = String(date.getHours()).padStart(2, '0');
              const mi = String(date.getMinutes()).padStart(2, '0');
              timeStr = `${mm}/${dd} ${hh}:${mi}`;
            }
            
            // Skip if closing/opening prices are null or undefined
            if (closes[i] === null || closes[i] === undefined || opens[i] === null || opens[i] === undefined) {
              continue;
            }
            
            candles.push({
              time: timeStr,
              open: Number((opens[i] / factor).toFixed(2)),
              high: Number(((highs[i] ?? closes[i]) / factor).toFixed(2)),
              low: Number(((lows[i] ?? closes[i]) / factor).toFixed(2)),
              close: Number((closes[i] / factor).toFixed(2)),
              volume: volumes[i] ?? 0
            });
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch candles from Yahoo for ${symbol}:`, err);
    }
  }
  
  const sliced = candles.slice(-50);
  candleCache.set(cacheKey, { data: sliced, timestamp: now });
  return sliced; // Return last 50 candles for high-density rendering
}

// Get system configuration (e.g. live sync enabled status)
app.get('/api/config', (req, res) => {
  res.json({ isLiveSyncEnabled, isSimulationEnabled });
});

// Update live sync configuration
app.post('/api/config/live-sync', async (req, res) => {
  const { enabled } = req.body;
  isLiveSyncEnabled = !(() => {
    if (enabled === false || enabled === 'false') return true;
    return false;
  })();
  
  if (isLiveSyncEnabled) {
    // Perform an immediate fetch cycle to update prices
    await fetchRealStockPrices();
  }
  
  res.json({ isLiveSyncEnabled, isSimulationEnabled });
});

// Update simulation configuration
app.post('/api/config/simulation', (req, res) => {
  const { enabled } = req.body;
  isSimulationEnabled = !!enabled;
  res.json({ isLiveSyncEnabled, isSimulationEnabled });
});

// Add a completely new custom stock to the backend database
app.post('/api/stocks', (req, res) => {
  const { symbol, name, nameEn, price, prevClose, high52Week, low52Week, volume, marketCap, description } = req.body;
  if (!symbol || !name) {
    res.status(400).json({ error: '종목 코드와 종목명은 필수 입력 항목입니다.' });
    return;
  }
  
  // Check if stock exists
  if (liveStocks.some(s => s.symbol === symbol)) {
    res.status(450).json({ error: '이미 존재하는 종목 코드입니다.' });
    return;
  }
  
  const numPrice = Number(price || 0);
  const numPrev = Number(prevClose || numPrice);
  const numHigh = Number(high52Week || numPrice * 1.3);
  const numLow = Number(low52Week || numPrice * 0.7);
  const stats = getKneeShoulderStatus(numPrice, numLow, numHigh);
  
  const newStock: Stock = {
    symbol,
    name,
    nameEn: nameEn || symbol,
    price: numPrice,
    prevClose: numPrev,
    change: Math.round((numPrice - numPrev) * 100) / 100,
    changePercent: numPrev !== 0 ? Math.round(((numPrice - numPrev) / numPrev) * 100 * 100) / 100 : 0,
    high52Week: numHigh,
    low52Week: numLow,
    volume: Number(volume || 10000),
    marketCap: marketCap || '1,000억원',
    peRatio: 12.5,
    rsi: 50,
    ma20: numPrice,
    description: description || `${name} (${symbol}) 사용자 추가 종목입니다.`,
    kneeShoulderIndex: stats.index,
    kneeShoulderStatus: stats.status
  };
  
  liveStocks.push(newStock);
  res.status(201).json(newStock);
});

// Delete a custom / existing stock from the database
app.delete('/api/stocks/:symbol', (req, res) => {
  const { symbol } = req.params;
  const exists = liveStocks.some(s => s.symbol === symbol);
  if (!exists) {
    res.status(404).json({ error: '종목을 찾을 수 없습니다.' });
    return;
  }
  liveStocks = liveStocks.filter(s => s.symbol !== symbol);
  res.json({ success: true, symbol });
});

// Helper to generate mock candles for sub-day timeframes when Yahoo is unavailable or simulated
function generateSimulatedCandlesForInterval(stock: any, interval: string = '1d'): any[] {
  const count = 50;
  const rawCandles = generateHistoricalCandles(stock, count);
  const now = new Date();
  
  return rawCandles.map((c, i) => {
    const date = new Date(now);
    if (interval === '1m') {
      date.setMinutes(now.getMinutes() - (count - i));
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mi = String(date.getMinutes()).padStart(2, '0');
      return { ...c, time: `${mm}/${dd} ${hh}:${mi}` };
    } else if (interval === '5m') {
      date.setMinutes(now.getMinutes() - (count - i) * 5);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mi = String(date.getMinutes()).padStart(2, '0');
      return { ...c, time: `${mm}/${dd} ${hh}:${mi}` };
    } else {
      // 1d
      date.setDate(now.getDate() - (count - i));
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return { ...c, time: `${yyyy}-${mm}-${dd}` };
    }
  });
}

// 2. Get Historical Candle Data for specific stock
app.get('/api/stocks/:symbol/candles', async (req, res) => {
  const { symbol } = req.params;
  const { interval = '1d' } = req.query as { interval?: string };
  const stock = liveStocks.find(s => s.symbol === symbol);
  if (!stock) {
    res.status(404).json({ error: 'Stock not found' });
    return;
  }
  
  let candles: any[] = [];
  let isReal = false;
  if (isLiveSyncEnabled) {
    try {
      const realCandles = await fetchRealCandles(symbol, interval);
      if (realCandles && realCandles.length > 0) {
        candles = realCandles;
        isReal = true;
      }
    } catch (err) {
      console.error(`Error fetching real candles for ${symbol} with interval ${interval}, falling back to simulations:`, err);
    }
  }
  
  if (candles.length === 0) {
    candles = generateSimulatedCandlesForInterval(stock, interval).map(c => ({ ...c, isReal: false }));
  } else {
    candles = candles.map(c => ({ ...c, isReal: true }));
  }

  // Force align the last candle with the accurate todays regular session Open, High, Low, Close from liveStocks Quote
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    const todayOpen = stock.open ?? stock.price;
    const todayHigh = stock.high ?? stock.price;
    const todayLow = stock.low ?? stock.price;
    const todayClose = stock.price;

    last.open = todayOpen;
    last.close = todayClose;
    last.high = Math.max(todayHigh, last.high, todayOpen, todayClose);
    last.low = Math.min(todayLow, last.low, todayOpen, todayClose);
    last.isReal = isReal;
  }
  
  res.json(candles);
});

// 3. Get Stock Discussions
app.get('/api/stocks/:symbol/discussions', (req, res) => {
  const { symbol } = req.params;
  const comments = liveDiscussions.filter(post => post.symbol === symbol);
  res.json(comments);
});

// Update specific stock metrics / calibrate price
app.post('/api/stocks/:symbol/update', (req, res) => {
  const { symbol } = req.params;
  const { 
    price, 
    prevClose, 
    open, 
    high, 
    low, 
    high52Week, 
    low52Week, 
    volume, 
    nxtPrice, 
    nxtChange, 
    nxtChangePercent, 
    resetCalibration 
  } = req.body;
  
  const stockIndex = liveStocks.findIndex(s => s.symbol === symbol);
  if (stockIndex === -1) {
    res.status(404).json({ error: 'Stock not found' });
    return;
  }
  
  const current = liveStocks[stockIndex];
  
  let newIsCalibrated = current.isCalibrated;
  if (resetCalibration === true) {
    newIsCalibrated = false;
  } else if (
    price !== undefined || 
    prevClose !== undefined || 
    open !== undefined || 
    high !== undefined || 
    low !== undefined || 
    high52Week !== undefined || 
    low52Week !== undefined || 
    volume !== undefined ||
    nxtPrice !== undefined
  ) {
    newIsCalibrated = true;
  }

  const newPrice = price !== undefined ? Number(price) : current.price;
  const newPrevClose = prevClose !== undefined ? Number(prevClose) : current.prevClose;
  const newOpen = open !== undefined ? Number(open) : (current.open ?? newPrice);
  const newHigh = high !== undefined ? Number(high) : (current.high ?? newPrice);
  const newLow = low !== undefined ? Number(low) : (current.low ?? newPrice);
  const newHigh52 = high52Week !== undefined ? Number(high52Week) : current.high52Week;
  const newLow52 = low52Week !== undefined ? Number(low52Week) : current.low52Week;
  const newVolume = volume !== undefined ? Number(volume) : current.volume;
  
  // Handled calibration for Nextrade over-market parameters
  let newNxtPrice = nxtPrice !== undefined ? (nxtPrice === null ? undefined : Number(nxtPrice)) : current.nxtPrice;
  let newNxtChange = nxtChange !== undefined ? (nxtChange === null ? undefined : Number(nxtChange)) : current.nxtChange;
  let newNxtChangePercent = nxtChangePercent !== undefined ? (nxtChangePercent === null ? undefined : Number(nxtChangePercent)) : current.nxtChangePercent;
  
  // If user calibrated a new nxtPrice but nxtChange/nxtChangePercent are omitted, calculate them relative to prevClose
  if (nxtPrice !== undefined && nxtChange === undefined && newNxtPrice !== undefined) {
    const calcChange = newNxtPrice - newPrevClose;
    newNxtChange = Math.round(calcChange * 100) / 100;
    newNxtChangePercent = Math.round((calcChange / newPrevClose) * 100 * 100) / 100;
  }

  const change = newPrice - newPrevClose;
  const changePercent = newPrevClose !== 0 ? (change / newPrevClose) * 100 : 0;
  
  const stats = getKneeShoulderStatus(newPrice, newLow52, newHigh52);
  
  const updatedStock = {
    ...current,
    price: newPrice,
    prevClose: newPrevClose,
    open: newOpen,
    high: newHigh,
    low: newLow,
    high52Week: newHigh52,
    low52Week: newLow52,
    volume: newVolume,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    kneeShoulderIndex: stats.index,
    kneeShoulderStatus: stats.status,
    nxtPrice: newNxtPrice,
    nxtChange: newNxtChange,
    nxtChangePercent: newNxtChangePercent,
    isCalibrated: newIsCalibrated
  };
  
  liveStocks[stockIndex] = updatedStock;
  res.json(updatedStock);
});

// 4. Save User Observation / Comment
app.post('/api/stocks/:symbol/discussions', (req, res) => {
  const { symbol } = req.params;
  const { username, content } = req.body;
  
  if (!username || !content) {
     res.status(400).json({ error: 'Name and content are required' });
     return;
  }
  
  const newPost: DiscussionPost = {
    id: Date.now().toString(),
    symbol,
    username,
    content,
    timestamp: '방금 전',
    likes: 0
  };
  
  liveDiscussions.unshift(newPost); // Add to top

  // Only trigger a reactive funny/expert brief AI Comment reply if authorized or protection is disabled
  const code = process.env.AI_ACCESS_CODE;
  const isProtected = code && code.trim() !== '';
  const providedCode = req.headers['x-ai-access-code'] || req.body?.accessCode;
  const isAuthorized = !isProtected || (providedCode === code?.trim());

  if (isAuthorized) {
    setTimeout(async () => {
      try {
        const stock = liveStocks.find(s => s.symbol === symbol);
        const isUp = stock ? stock.changePercent > 0 : true;
        const targetMessage = content;
        
        const key = process.env.GEMINI_API_KEY;
        if (key) {
          const client = getGemini();
          const aiResponse = await client.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `Financial Chat Bot. Reply briefly (1-2 short sentences in Korean) to this investor remark on stock ${stock?.name || symbol}. 
            Remark: "${targetMessage}". Current pricing status: ${isUp ? '상승세' : '하락세'}, Knee-Shoulder status: ${stock?.kneeShoulderStatus || 'WAIST'}.
            Keep it realistic, analytical, and slightly friendly. Avoid using markdown format.`,
          });
          
          if (aiResponse.text) {
            const botPost: DiscussionPost = {
              id: (Date.now() + 1).toString(),
              symbol,
              username: '🔥 AI 수석 연구원',
              content: aiResponse.text.trim(),
              timestamp: '방금 전',
              isAi: true,
              likes: 1
            };
            liveDiscussions.unshift(botPost);
          }
        }
      } catch (e) {
        console.error('Error generating automated bot reaction:', e);
      }
    }, 1500);
  }

  res.status(201).json(newPost);
});

// 5. Trigger Real-Time Stock Diagnostic Analysis via Gemini AI
app.post('/api/stocks/:symbol/analysis', verifyAiAccess, async (req, res) => {
  const { symbol } = req.params;
  const stock = liveStocks.find(s => s.symbol === symbol);
  if (!stock) {
     res.status(404).json({ error: 'Stock not found' });
     return;
  }

  try {
    const customApiKey = req.headers['x-gemini-api-key'] || req.headers['X-Gemini-Api-Key'];
    const client = getGemini(customApiKey as string);
    const prompt = `주식 종목 분석 요청:
종목명: ${stock.name} (${stock.symbol})
최근 주가: ${stock.price}
52주 최고가: ${stock.high52Week}
52주 최저가: ${stock.low52Week}
종목 설명: ${stock.description}

다음 핵심 내용을 재미있고 전문적인 주식 애널리스트 관점으로 분석해 주십시오.

요구사항:
1. 무릎인지 어깬지 상태 정밀 점검 (수익 지표 상세 진단):
   - 52주 변동 범위 내 현재 주가의 위치(${stock.kneeShoulderStatus} 구간, 지수 ${stock.kneeShoulderIndex}%)에 맞춰 투자 리스크 진단.
2. 상승 원인 (오르면 왜 오르는지 분석):
   - 주가 상승을 촉진하는 주요 호재 3가지를 구체적이고 전문적으로 도출하십시오.
3. 하락 원인 (떨어지면 왜 떨어지는지 분석):
   - 주가의 하락 또는 하방 리스크 요인 2가지를 현실적으로 지적하십시오.
4. 한줄 종합평가

반드시 아래 스키마를 따르는 JSON 하나만 반환해주십시오. 문자열 등 다른 장식 텍스트나 마크다운 기호(\`\`\`json 등)는 제외하십시오.

{
  "symbol": "${symbol}",
  "kneeShoulderCommentary": "어깨/무릎에 대한 상세한 애널리스트 코멘트 (3~4문장)",
  "positiveFactors": ["호재1 요약", "호재2 요약", "호재3 요약"],
  "negativeFactors": ["악재1 요약", "악재2 요약"],
  "investmentVerdict": "종합 1줄 투자 의견과 지지 구도 제언",
  "analyzedAt": "2026-06-12"
}`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: 'You are an elite stock research analyst expert. You must output a JSON structure matching the requested keys exactly.',
      }
    });

    const text = response.text || '';
    const parsedReport = safeJsonParse(text.trim());
    res.json(parsedReport);
  } catch (err: any) {
    console.error('Gemini live analysis failed, using static fallback reports:', err);
    // Graceful fallback to rich mock data if GEMINI_API_KEY is not setup or fails
    const fallback = DEFAULT_AI_REPORTS[symbol] || {
      symbol,
      kneeShoulderCommentary: `현재 ${stock.name} 주가는 52주 최저치와 최고치 기준으로 보았을 때 ${stock.kneeShoulderStatus} 즉, 약 ${stock.kneeShoulderIndex}%의 자리에 있습니다. 무릎 이하 구간일 때는 장기 분할 매수 모멘텀이 가능하고, 어깨 부근이라면 단기 차익 실현 욕구가 강해질 수 있습니다.`,
      positiveFactors: [
        '해당 산업의 전반적인 고스펙 공급 계약 연장 가시화',
        '외국인 및 기관 투자자의 연속 메이저 수매수 흐름 유입',
        '경기 선행 지수의 개선과 단실 유휴 비용 축소'
      ],
      negativeFactors: [
        '글로벌 환율 불확실성 증대에 따른 외환 회계 수지 변동 리스크',
        '원자재 공급망 경쟁 심화로 인한 단기 원가 지출 한도 가중'
      ],
      investmentVerdict: '중단기 밸류에이션 매력을 충분히 검증한 후 저점 무릎 부분에서 편안히 매수하는 것이 좋습니다.',
      analyzedAt: '2026-06-12 (기본 분석 보고서)'
    };
    res.json(fallback);
  }
});

// 6. Refresh Prices on Demand
app.post('/api/stocks/refresh', async (req, res) => {
  await fetchRealStockPrices();
  res.json(liveStocks);
});

// 6. Refresh Prices on Demand
app.post('/api/stocks/refresh', async (req, res) => {
  await fetchRealStockPrices();
  res.json(liveStocks);
});

// 7. AI-Powered Hot Theme Synthesis (Expert Consensus and Deep Infographics)
app.post('/api/themes/ai-generate', verifyAiAccess, async (req, res) => {
  try {
    const customApiKey = req.headers['x-gemini-api-key'] || req.headers['X-Gemini-Api-Key'];
    const client = getGemini(customApiKey as string);
    const prompt = `요즘 주식 시장에서 가장 뜨겁게 논의되고 있는 6가지 이상의 핵심 메가 테마를 선정하고, 각 테마별로 세계 최고 수준의 투자 전문가 및 리서치 센터의 분석 가이드라인을 합성하여 깊이 있는 분석 보고서를 생성해 주십시오.

요구사항:
1. 선정할 최신 테마 풀 (예시 중 6개 이상 반드시 골고루 구성):
   - AI 가속기 및 온디바이스 AI 반도체 테마
   - AI 데이터센터 폭증 수혜용 전력망/초고압 변압기/동선 인프라 테마
   - 소형 모듈형 원자로 (SMR) 및 친환경 에너지 지지주기 테마
   - 차세대 비만치료제 Glp-1 및 ADC 표적 항암 바이오 테마
   - 휴머노이드 로봇 및 자율제어 물류 엔지니어링 테마
   - 저궤도 인공위성 우주 항공 스타링크 벨류체인 테마
   - 글로벌 인프라 리쇼어링 및 지정학적 K-방산/우주방위 테마
   - 게임체인저용 전고체 전기차 배터리 테마

2. 각 테마는 다음 속성을 가진 객체여야 합니다:
   - "id": 고유 영문 식별자 (예: 'semicon-ai', 'power-grid', 'smr-fusion', 'bio-glp1', 'humanoid', 'space-tech', 'defense-k', 'battery-solid')
   - "name": '한글 테마명'
   - "description": '테마의 현대적인 정의 및 시장 배경 (3줄 이내)'
   - "growthDriver": '그 테마의 장기 성장을 견인할 실질 핵심 동력(Catalyst) 기술/정책 요인'
   - "status": 다음 수명주기 단계 중 단 하나만 지정: 'INTRO' (태동기) | 'GROWTH' (성장기) | 'PEAK' (과열기) | 'CORRECTION' (조정기) | 'STABILIZATION' (안정기)
   - "statusInfo": {
       "title": "현재 국면 명칭 (예: '도입 태동 단계', '본격 고성장 단계', '차익 조정 및 저평가 탈출 단계' 등 한국 정서에 맞게 작명)",
       "description": "국면의 디테일한 특징과 개인투자자가 처한 현재 포지셔닝 진단",
       "color": "emerald" | "cyan" | "amber" 중 하나 (emerald=성장/태동, cyan=조정/탈출, amber=대장과열 등 자유롭게 선택)
     }
   - "relativeStocks": 실제 야후 파이낸스나 코스피에 상장된 대표 주식 2~4개 리스트
       [{"symbol": "주식코드/티커", "name": "회사명 한글", "relationReason": "이 테마와 어떤 기술적 결속이나 매출 연관성이 있는지 상세히 설명"}]
   - "timeline": 각 테마 수명주기를 시각화하기 우한 4단계(1단계~4단계) 트래킹 구조 목록:
       [{"phase": "X단계 명칭", "label": "대표 마일스톤 레이블", "description": "해당 단계에서 벌어진 핵심 마진 시나리오", "trend": "rise" | "fall" | "flat"}]
   - "expertBullishness": 전문가 긍정적인 평가 합의율 % (10에서 98 사이의 숫자형)
   - "bubbleIndex": 거품 지수 혹은 단기 고평가 상태 % (5에서 95 사이의 숫자형)
   - "expertOpinionsSummary": "월가 빌리언네어 헤지펀드 매니저 및 글로벌 IB(골드만삭스, JP모건 등) 소속 애널리스트들의 종합 합의 평결 요약 (3문장 이상)"
   - "riskFactor": "이 테마가 맞닥뜨릴 수 있는 가장 치명적인 거시경제 혹은 기술적 규제 리스크"
   - "future3YrOutlook": "앞으로 3년(2026-2029)간 해당 테마의 장기 예상 이익 흐름과 실크로드 성장 로드맵 전망"

의견 수집 및 요약 시 반드시 전문가의 가감없는 회의적 관점과 낙관적 관점을 정밀하게 합성하고, 심도 깊은 수치 데이터(긍정률, 거품지수 등)를 반영하십시오.
JSON 형식으로 완전한 배열 구조로만 응답해 주십시오. 마크다운 장식(\`\`\`json ...)은 빼고 완전한 원시 JSON 텍스트만 출력해야 합니다.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: 'You are an elite top-tier global stock analyst and fund manager strategist. You must synthesize expert institutional investment consensus and output list of high-depth market themes in standard single JSON array without markdown wrapping.',
      }
    });

    const text = response.text || '[]';
    const parsedThemes = safeJsonParse(text.trim());
    res.json(parsedThemes);
  } catch (err: any) {
    console.error('Failed to generate high-depth-themes from Gemini, serving static augmented mock themes:', err);
    // Sophisticated expert-augmented mock fallback data satisfying the user request with rich metadata
    const fallbackThemes = [
      {
        id: 'semicon-ai',
        name: 'AI 가속기 및 온디바이스 반도체 테마',
        description: 'HBM(고대역폭 메모리) 및 초미세 공정을 활용한 AI 가속 칩셋 시장이 스마트스페이스 및 모바일로 옮겨가는 초대형 순환 사이클입니다.',
        growthDriver: '글로벌 초거대 빅테크들의 차세대 거대 언어 모델(LLM) 자율화 대규모 추론 인프라 도입 경쟁',
        status: 'GROWTH',
        statusInfo: {
          title: '글로벌 본격 성장기 (Growth)',
          description: 'HBM 공급 과잉 우려가 일시 해소 및 단품 선행 수주 잔고가 증명되는 실적 극대화 성숙 국면입니다.',
          color: 'emerald'
        },
        expertBullishness: 89,
        bubbleIndex: 45,
        expertOpinionsSummary: '골드만삭스와 모건스탠리는 하이엔드 AI 인프라 공급 쇼티지가 최소 2027년까지 해소되지 않을 것으로 판단하고 있으며, 대형 팹과 다층 기판 기업들의 마진이 구조적으로 레벨업되었다고 동의합니다.',
        riskFactor: '미중 기술 갈등 고조에 따른 대만 파운드리 라인의 수출 제재 및 설비 가동 비상 사태 발생 소지',
        future3YrOutlook: '추론 비용 단가의 극적인 하락으로 모바일 기기별 전용 에이전트 온디바이스 AI 칩이 폭발하는 2기 성장이 예정되어 있습니다.',
        relativeStocks: [
          { symbol: '005930', name: '삼성전자', relationReason: 'HBM 5세대 일괄 검증 및 첨단 패키징 라인 대규모 공급 파트너' },
          { symbol: '000660', name: 'SK하이닉스', relationReason: '글로벌 톱티어 AI 가속기 탑재 제품 단독 기성 독점 체계' },
          { symbol: 'NVDA', name: '엔비디아', relationReason: '쿠다(CUDA) 생태계를 독점 장악한 압도적 아키텍처 파이오니어' }
        ],
        timeline: [
          { phase: '1단계: 도입', label: '인프라 불씨', description: '생성형 챗봇 촉발로 하드 에인블러 최초 수혜 수급 집중.', trend: 'rise' },
          { phase: '2단계: 과열', label: '단가 상승 폭증', description: 'HBM 확보 경쟁으로 마진율이 40%를 초과하며 주가 최고점 갱신.', trend: 'rise' },
          { phase: '3단계: 점검', label: '투자 이익률 검증', description: '클라우드 비용 정량 편익 부족 제기에 따른 밸류에이션 리턴 조정.', trend: 'fall' },
          { phase: '4단계: 성장 (현재)', label: '실적 2차 도약', description: '본격 양산 신뢰성 확보와 차세대 규격 출하로 실질 우상향 궤적 재진입.', trend: 'rise' }
        ]
      },
      {
        id: 'power-grid',
        name: 'AI 전력 인력 및 초고압 송전 변압기 테마',
        description: '초거대 AI 데이터센터 가동 및 노후 송배전망 신재생 연계 수요가 일시에 폭발하며 발생한 장기 수주 사이클 테마입니다.',
        growthDriver: '글로벌 가설 변전소 확충 일정 및 미 연방 인공지능 지원을 위한 클린 전력 공급 가속 개입',
        status: 'PEAK',
        statusInfo: {
          title: '이익 정점 과열 국면 (Peak Speculation)',
          description: '수주 잔고가 향후 5~6년치 채워진 단계로 단기 주가 상승폭이 비약적으로 커져 밸류 과열이 진단되는 영역입니다.',
          color: 'amber'
        },
        expertBullishness: 72,
        bubbleIndex: 82,
        expertOpinionsSummary: 'JP모건을 비롯한 메이저 테크 인프라 펀드는 변압기 제조 기업의 공급 슬롯이 한계를 넘었다고 호평하면서도, 인프라 특성상 경기 성장에 선행해 주가가 선반영되었기에 신규 진입보다는 추세 관조를 조언하고 있습니다.',
        riskFactor: '동선 및 구리 원자재 현물 시세의 높은 변동성과 신규 경쟁업체들의 저가 아시안 셀러 침입',
        future3YrOutlook: '2027년까지 중복 오더에 대한 취소 검증 단계를 지나며 고품질 고용량 제품을 생산할 수 있는 국내 톱메이커들 위주로 장기 안정 정당화 단계에 돌입할 전망입니다.',
        relativeStocks: [
          { symbol: '005380', name: '현대차 (인프라 협력)', relationReason: '그룹 지분 기반의 스마트팩토리 내 독자 전기 제어계 설비 파트너쉽 보유' },
          { symbol: '009150', name: '삼성전기 (기성부품)', relationReason: '고신뢰 전기 차량 및 지능형 전력 분배용 고압 MLCC 메이저 납품사' }
        ],
        timeline: [
          { phase: '1단계: 대호황기', label: '전력 쇼티지 감지', description: '데이터센터 가동 연도의 전력수요 예측 상향 조정으로 발주 급증.', trend: 'rise' },
          { phase: '2단계: 수주 러시 (현재)', label: '멀티플 프리미엄', description: '설비 증편 가시성과 리드타임이 2년 이상 급상승하며 실질 가치 대폭 개정.', trend: 'rise' }
        ]
      },
      {
        id: 'smr-fusion',
        name: '소형 모듈 원자로 SMR 및 청정 핵분열 테마',
        description: '지정학적 에너지 고립 해결과 무탄소 데이터센터 실현을 위해 대형 원자로 대비 안전하고 유연한 SMR 기반 미래형 분산 에너지 테마입니다.',
        growthDriver: '글로벌 거대 테크 기업들과 SMR 사업체 간의 장기 전력 구매 계약(PPA) 체결',
        status: 'INTRO',
        statusInfo: {
          title: '장기 도입 태동기 (Long-term Intro)',
          description: '실증 가설 검증과 규제 승인 단계에 있으나 미래 10년을 좌우할 전력 게임체인저로 꼽히며 큰 성장이 도모되는 국면입니다.',
          color: 'emerald'
        },
        expertBullishness: 95,
        bubbleIndex: 15,
        expertOpinionsSummary: '래리 핑크 블랙록 회장을 중심으로 한 초대형 자산운용가들은 차세대 AI 서버 인프라를 지탱할 유일무이한 기저 부하 전원으로서 이산화탄소 비방출 SMR의 핵심 지적재산권(IP) 보유자들에 대한 적극적 벤처 투자를 단행해야 함에 목소리를 모으고 있습니다.',
        riskFactor: '각국 원자력 안전 위원회의 가설 실증 허가 보류 사태 및 고중량 노후 방사성 폐기물 지상 처분 규제 갈등',
        future3YrOutlook: '실증 핵심 설계가 확정되어 주요 상업 운전 가동 로드맵이 최초 집행되는 2028-2029년 시점까지 연평균 40% 이상의 메가 밸류에이션 성장이 관측됩니다.',
        relativeStocks: [
          { symbol: '000660', name: 'SK하이닉스 (고객사)', relationReason: '그린 넷제로 자가 데이터센터 실현을 위해 테라파워 지분 지배 파트너 결속 주도' }
        ],
        timeline: [
          { phase: '1단계: 개념 형성 (현재)', label: '빅테크 연합 PPA', description: '마이크로소프트 및 아마존의 전력 계약 완료 소식에 톱 설계원 벤처 자본 대폭 수혈.', trend: 'rise' },
          { phase: '2단계: 설계 완성', label: 'NRC 6단계 인증', description: '설계 규격 최종 안전 승인 획득으로 시제품 발주 기대 개시.', trend: 'rise' }
        ]
      }
    ];
    res.json(fallbackThemes);
  }
});

// 8. Capture & Analyze endpoint using Gemini Vision model
app.post('/api/analyze-capture', async (req, res) => {
  const { image, mimeType = 'image/png', profile, stockName, stockTicker, purchasePrice, targetPrice } = req.body;

  if (!image) {
    res.status(400).json({ error: '분석 대상 이미지가 전송되지 않았습니다.' });
    return;
  }

  const userProfile = profile || {
    riskTolerance: 'moderate',
    horizon: 'mid',
    interests: '반도체/테크',
    region: 'global',
    extraDetails: '전체적인 흐름 진단 및 리스크 관리 대안 분석요망'
  };

  const toleranceMap: Record<string, string> = {
    aggressive: '공격형 성장 투자 (높은 변동성 감수, 초과수익 추구)',
    moderate: '균형 균등 투자 (적정 변동성 감수, 중단기 시세 추구)',
    conservative: '안정 지향 투자 (원금 보호 우선, 배당 및 우량 채권형 선호)'
  };

  const horizonMap: Record<string, string> = {
    short: '단기 트레이딩 (수일~수주 단위 스윙 및 모멘텀 대응)',
    mid: '중기 추세 매매 (수개월 단위 주도테마 편승 및 가치 회복)',
    long: '장기 가치 분할매수 (수년 단위 바이앤홀드 및 배당 재투자)'
  };

  const regionMap: Record<string, string> = {
    krx: '국내 시장 (KOSPI & KOSDAQ 주력, 환노출 최소화)',
    us: '미국 시장 (S&P 500, NASDAQ 핵심 성장주 주력, 달러 자산)',
    global: '글로벌 자산 분산 (미국, 유럽, 신흥국 및 원자재 균형)'
  };

  const toleranceKorean = toleranceMap[userProfile.riskTolerance] || userProfile.riskTolerance;
  const horizonKorean = horizonMap[userProfile.horizon] || userProfile.horizon;
  const regionKorean = regionMap[userProfile.region] || userProfile.region;

  try {
    const customApiKey = req.headers['x-gemini-api-key'] || req.headers['X-Gemini-Api-Key'];
    const ai = getGemini(customApiKey as string);

    // Clean base64 header if present
    let base64Part = image;
    if (image.startsWith('data:')) {
      const commaIndex = image.indexOf(',');
      if (commaIndex !== -1) {
        base64Part = image.substring(commaIndex + 1);
      }
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Part
      }
    };

    const textPart = {
      text: `당신은 세계 최고의 자산운용사 수석 펀드매니저이자 대한민국 최고의 개인 투자 전략 어드바이저입니다.
사용자가 자신이 소유하거나 관심 있는 종목의 차트 이미지 또는 자신의 계좌 잔고/보유 종목 목록 캡처 이미지(MTS/HTS 주식 잔고 및 손익 스크린샷)와 함께 자신의 투자 자산 성향과 추가 요청 사항을 전달했습니다.

전달된 이미지를 시각적으로 정밀하게 판독하여 다음 두 가지 경우 중 하나로 자동 분류하고 분석을 수행하십시오:

[경우 1: 단일 종목의 가격 차트 이미지인 경우]
- "isPortfolio": false 로 설정하십시오.
- 해당 단일 종목이 주가 사이클 상 **발, 무릎, 허리, 어깨, 머리** 중 어디에 위치해 있는지 판정하십시오.
- "portfolioSummary": null, "portfolioHoldings": null 로 설정하십시오.

[경우 2: 계좌 잔고 / 보유 종목 리스트 이미지(MTS/HTS 주식 잔고 · 손익 목록)인 경우]
- "isPortfolio": true 로 설정하십시오.
- 계좌의 총평가손익, 총매입금액, 총평가금액, 예수금, 총수익률 등을 텍스트에서 완전히 인식하여 "portfolioSummary" 객체에 수치로 기입하십시오.
  예시 (이미지 상의 숫자를 정확히 읽어 양수/음수를 보존하십시오):
  "portfolioSummary": {
    "totalPurchaseAmount": 89111000,
    "totalEvaluationAmount": 60465680,
    "totalProfitLoss": -28645320,
    "totalReturnPercent": -32.15,
    "deposit": 21826915
  }
- 이미지에 실제로 표시되어 있는 개별 보유 종목 목록을 정확하게 해독하여 "portfolioHoldings" 배열에 객체 형태로 추출하십시오.
  * 매우 중요: 이미지 상에 존재하는 실제 종목들만 정밀 해독해서 반환해야 합니다. 다른 샘플이나 임의의 예시 종목들(대원전선, 씨에스윈드 등)을 기계적으로 채우지 마십시오. 사용자가 올린 이미지에 4개 종목만 보인다면 반드시 그 4개 종목만 결과 배열에 있어야 합니다.
  - "name": 종목명 (이미지에서 직접 인식된 실제 한글 종목명)
  - "ticker": 종목의 상장 코드 (예: 한국 종목은 6자리숫자.KS 또는 6자리숫자.KQ 형태로 유추 기입)
  - "purchasePrice": 매입단가 (숫자)
  - "currentPrice": 현재가 (숫자)
  - "quantity": 보유 수량 (숫자)
  - "evaluationAmount": 평가금액 (숫자)
  - "profitLoss": 평가손익 (숫자)
  - "returnPercent": 수익률 % (숫자, 예: -11.79)
  - "marketPosition": 해당 개별 종목의 주가 사이클 위치 판정 ('발' | '무릎' | '허리' | '어깨' | '머리' 중 하나)
  - "actionOpinion": 해당 종목에 대해 추천할 개별 행동 의견 ('적극매수' | '추가매수' | '관망유지' | '비중축소' | '교체매도' 중 하나)
  - "individualVerdict": 해당 종목의 현재 손익 상태와 사이클 위치에 근거한 구체적인 맞춤형 AI 조언 및 처방 (2~3문장)
- 전체 포트폴리오의 평균적인 주가 사이클 상태를 종합적으로 평가하여 **발, 무릎, 허리, 어깨, 머리** 중 하나를 "marketPosition"에 판정하고, 포트폴리오 전체 관점에서의 진단과 개별 종목들의 손익 분포 현황을 감안한 맞춤형 자산 대응 및 예수금(현금 비중) 운영 세부 전략을 도출하십시오. (이때, "targetTicker"는 "보유 주식 포트폴리오 (총 X개 종목)" 과 같은 형태로 설정하십시오)

[공통 판정 기준]
- **발**: 역사적 저점 부근, 매수 매력이 극에 달함.
- **무릎**: 하방이 지지되고 상승 전환의 신호가 뚜렷하며 분할 매수 진입에 최적인 구간.
- **허리**: 중간 수준의 밸류에이션, 보유자의 영역이거나 추세 지속 시점.
- **어깨**: 상당 부분 과열되어 분할 매도로 수익을 챙겨야 하거나 비중을 적극 관리해야 하는 경계 구간.
- **머리**: 밸류에이션 버블 및 추세 붕괴 위험성이 매우 높은 최고점 구역. 신규 진입 절대 불가.

[분석 대상 기본 정보 (단일 종목용, 포트폴리오 분석 시에는 이미지 내용을 우선시함)]
- 종목명: ${stockName || '미확인/기타 종목'}
- 티커 및 코드: ${stockTicker || '미확인 코드'}
${purchasePrice ? `- 사용자의 현재 매수 평단가: ${purchasePrice}` : ''}
${targetPrice ? `- 사용자의 희망 목표가: ${targetPrice}` : ''}

[사용자 투자 성향 정보]
1. 위험 감내 성향: ${toleranceKorean}
2. 희망 투자 기간(호라이즌): ${horizonKorean}
3. 주력 선호 지역: ${regionKorean}
4. 주요 관심 테마/섹터: ${userProfile.interests || '글로벌 지수/안정성'}
5. 기타 세부 요구조건: "${userProfile.extraDetails || '추가 요구사항 없음'}"

반드시 아래 JSON 스키마 구조를 정합하게 채운 하나의 완벽한 JSON 문자열만 반환하십시오. 다른 설명이나 마크다운 백틱(\`\`\`json ...)은 배제하십시오.

{
  "isPortfolio": true,
  "portfolioSummary": {
    "totalPurchaseAmount": 89111000,
    "totalEvaluationAmount": 60465680,
    "totalProfitLoss": -28645320,
    "totalReturnPercent": -32.15,
    "deposit": 21826915
  },
  "portfolioHoldings": [
    {
      "name": "삼성전자",
      "ticker": "005930.KS",
      "purchasePrice": 352000,
      "currentPrice": 310500,
      "quantity": 1,
      "evaluationAmount": 310500,
      "profitLoss": -41500,
      "returnPercent": -11.79,
      "marketPosition": "무릎",
      "actionOpinion": "추가매수",
      "individualVerdict": "글로벌 반도체 업황 개선과 기술적 바닥 다지기가 뚜렷하여 현 단가에서의 분할 추가 매수는 위험 대비 기대수익률이 매우 높은 무릎 지대입니다."
    }
  ],
  "targetTicker": "보유 주식 포트폴리오 (총 8개 종목)",
  "marketPosition": "무릎", 
  "marketPositionDescription": "현재 차트 또는 포트폴리오가 전체 사이클에서 왜 '무릎' (또는 발, 허리, 어깨, 머리) 위치인지에 대한 정밀 진단 이유 (3~4문장. 잔고 캡처인 경우 총 평가 손실 규모와 전반적인 낙폭 수준을 고려한 설명 포함)",
  "actionPlan": "핵심 대응 권장 행동 요약",
  "actionPlanDetail": "사용자의 투자 성향, 보유 현금(예수금), 개별 종목 손실 상태에 맞춘 구체적인 비중 조절 및 대응 가이드라인 (3~4문장. 잔고 캡처인 경우 남은 예수금을 어떻게 현명하게 배분하여 물타기하거나 리밸런싱할지 구체적 금액 배분 팁 제시)",
  "macroBackground": "글로벌 거시 경제(금리 결정, 유동성, 인플레이션) 및 해당 산업 섹터의 배경 요인 설명 (3~4문장. 잔고 캡처인 경우 보유한 핵심 업종들인 반도체, 송배전/전선, 신재생에너지 등의 매크로 기류 융합 분석)",
  "technicalBackground": "주요 지지선, 저항선, 이평선 정배열/역배열 여부, 골든/데드크로스, 거래량 등의 기술적 분석 배경 (3~4문장. 잔고 캡처인 경우 주요 큰 비중 종목들의 차트상 저점 지지 여부 및 과매도 이탈 극복 여부 분석)",
  "suitabilityScore": 85,
  "suitabilityComment": "사용자의 위험감내도 및 기간을 대입했을 때 이 자산들(또는 종목)이 현재 위치에서 얼마나 적합한지 종합 의견 (2~3문장)",
  "warningSignals": [
    "경계해야 할 돌발 악재 또는 위험 시그널 1",
    "경계해야 할 돌발 악재 또는 위험 시그널 2",
    "경계해야 할 돌발 악재 또는 위험 시그널 3"
  ]
}`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        systemInstruction: 'You are an elite stock analyst. You diagnose whether a stock or a portfolio is at Foot, Knee, Waist, Shoulder, or Head, giving absolute concrete action plans, detailed portfolio extraction if applicable, and macro/technical background in pristine Korean JSON. Do not write any other markup.',
      }
    });

    const text = response.text || '';
    const parsedReport = safeJsonParse(text.trim());
    res.json(parsedReport);

  } catch (err: any) {
    console.error('Gemini screenshot analysis failed:', err);
    
    // If it is a missing/invalid key error, send a clear error response instead of faking the analysis
    if (err.message && (err.message.includes('API_KEY') || err.message.includes('apiKey') || err.message.includes('key') || err.message.includes('required'))) {
      res.status(400).json({
        error: 'GEMINI_API_KEY가 설정되지 않았거나 올바르지 않습니다. AI Studio 우측 상단의 Settings > Secrets 메뉴에서 GEMINI_API_KEY를 설정해 주시면, 고객님이 실제로 캡처해서 올리신 이미지를 분석해 드립니다.'
      });
      return;
    }
    
    let errMsg = err.message || '알 수 없는 서버 오류가 발생했습니다.';
    const status = err.status || 500;
    
    // Check for 503 / high demand / unavailable
    if (status === 503 || (err.message && (err.message.includes('503') || err.message.includes('demand') || err.message.includes('UNAVAILABLE') || err.message.includes('temporary')))) {
      errMsg = '구글 Gemini AI 모델이 현재 일시적으로 트래픽 폭주(High Demand) 상태입니다. 잠시 후 다시 이미지를 업로드하고 분석을 시도해 주세요.';
    }
    
    // Always use 400 (Bad Request) instead of 503/500 to prevent Cloud Run/ingress load balancers from intercepting and returning standard HTML outage pages
    res.status(400).json({
      error: `이미지 분석에 실패했습니다: ${errMsg} (상태 코드: ${status}).`
    });
  }
});

// 9. AI Chat assistant endpoint
app.post('/api/chat', verifyAiAccess, async (req, res) => {
  const { message, history = [], portfolio, profile } = req.body;

  if (!message) {
    res.status(400).json({ error: '질문 메시지를 입력해 주세요.' });
    return;
  }

  try {
    const customApiKey = req.headers['x-gemini-api-key'] || req.headers['X-Gemini-Api-Key'];
    const ai = getGemini(customApiKey as string);

    const formattedHistory = history.map((h: any) => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    }));

    // Construct full system instructions context about portfolio and user profile
    let portfolioContext = '보유한 포트폴리오가 없습니다. 사용자는 일반적인 주식 정보나 투자 관련 질문을 하고 있습니다.';
    if (portfolio) {
      const summary = portfolio.portfolioSummary;
      const holdings = portfolio.portfolioHoldings || [];
      const holdingsStr = holdings.map((h: any) => 
        `- 종목명: ${h.name} (${h.ticker}), 평단가: ${h.purchasePrice?.toLocaleString()}원, 현재가: ${h.currentPrice?.toLocaleString()}원, 보유수량: ${h.quantity?.toLocaleString()}주, 평가손익: ${h.profitLoss?.toLocaleString()}원 (수익률: ${h.returnPercent?.toFixed(2)}%), AI 주가 단계: ${h.marketPosition || '미정'}, AI 의견: ${h.actionOpinion || '미정'}`
      ).join('\n');

      portfolioContext = `
[사용자 보유 포트폴리오 정보]
- 총 매입 금액: ${summary?.totalPurchaseAmount?.toLocaleString()}원
- 총 평가 금액: ${summary?.totalEvaluationAmount?.toLocaleString()}원
- 총 평가 손익: ${summary?.totalProfitLoss?.toLocaleString()}원 (수익률: ${summary?.totalReturnPercent?.toFixed(2)}%)
- 예수금: ${summary?.deposit?.toLocaleString()}원
- 권장 현금 비중: ${summary?.recommendedCashPercent}%

[보유 종목 리스트]
${holdingsStr}
`;
    }

    let profileContext = '';
    if (profile) {
      profileContext = `
[사용자 투자 성향]
- 위험 성향: ${profile.riskTolerance === 'conservative' ? '보수안정' : profile.riskTolerance === 'aggressive' ? '공격투자' : '균형적'}
- 희망 투자 주기: ${profile.horizon === 'short' ? '단기 트레이딩' : profile.horizon === 'long' ? '장기 투자' : '중기 투자'}
- 관심 분야: ${profile.interests || '미지정'}
- 선호 시장: ${profile.region === 'krx' ? '국내 주식' : profile.region === 'us' ? '미국 주식' : '글로벌 분산'}
`;
    }

    const systemInstruction = `당신은 대한민국 최고의 엘리트 주식 분석가이자 개인 자산 관리 파트너 "VISION MARKET AI"입니다.
사용자가 자신의 포트폴리오 자산, 개별 종목, 혹은 거시경제 트렌드에 대해 질문하고 있습니다.
사용자의 질문에 친절하고, 분석적이며, 전문적이면서도 알기 쉽게 설명해 주십시오.

존댓말을 사용하고, 신뢰감을 주는 어조로 조언하십시오.
사용자의 투자 성향과 보유 포트폴리오를 기반으로 맞춤형으로 설명하되, 필요 시 객관적인 시장 리스크도 짚어주십시오.

${portfolioContext}
${profileContext}

답변은 마크다운 형식을 적극 활용하여 가독성 있게 작성해 주십시오. (예: 볼드체, 글머리 기호, 넘버링 등)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const reply = response.text || '죄송합니다. 답변을 생성하는 도중 오류가 발생했습니다.';
    res.json({ reply });
  } catch (err: any) {
    console.error('Chat AI failed:', err);
    res.json({
      reply: '죄송합니다. AI 서비스 연결이 일시적으로 원활하지 않습니다. 질문하신 내용에 대한 정밀 답변을 도출할 수 없습니다. 잠시 후 다시 시도해 주십시오.'
    });
  }
});

// Live server and Vite integration configuration
async function startServer() {
  if (process.env.VERCEL) {
    // Vercel Serverless environment handles routing and listening automatically.
    // Warm up the stock prices cache asynchronously.
    fetchRealStockPrices().catch(err => {
      console.error('Initial price fetch failed:', err);
    });
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Fetch initial real-time prices from Yahoo Finance API in background (non-blocking)
  fetchRealStockPrices().catch(err => {
    console.error('Initial price fetch failed:', err);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;
