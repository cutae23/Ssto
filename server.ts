import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { INITIAL_STOCKS, DEFAULT_AI_REPORTS, SEED_DISCUSSIONS, getKneeShoulderStatus, generateHistoricalCandles } from './src/data/mockStocks.ts';
import { Stock, DiscussionPost, AiAnalysisReport } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Live Stock Prices & Discussions to persist state during server runtime
let liveStocks: Stock[] = JSON.parse(JSON.stringify(INITIAL_STOCKS));
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
      '011100', '389260', '002230', '455250', '307750', '372170', '117730', 
      '272290', '160980', '092070', '211270', '049070', '350110', '439090', 
      '460930', '071670', '011930', '101170', '189300', '028080', '036030', 
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
      // If it's a 6-digit Korean stock code, fetch from Naver Finance Polling API
      if (/^\d{6}$/.test(stock.symbol)) {
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
          
          if (!response.ok) {
            return { symbol: stock.symbol, success: false };
          }
          
          const data = await response.json() as any;
          const naverStock = data?.datas?.[0];
          if (!naverStock) {
            return { symbol: stock.symbol, success: false };
          }
          
          const price = parseFloat(naverStock.closePriceRaw);
          const prvCloseRaw = naverStock.compareToPreviousClosePriceRaw;
          // compareToPreviousClosePriceRaw might be negative/positive to indicate move.
          // Naver polling hasfluctuationsRatio and compareToPreviousClosePriceRaw
          // Standard check: prevClose = price - change
          const rawChange = parseFloat(prvCloseRaw) || 0;
          const prevClose = price - rawChange;

          let nxtPrice: number | undefined;
          let nxtChange: number | undefined;
          let nxtChangePercent: number | undefined;

          if (naverStock.overMarketPriceInfo) {
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
          
          return {
            symbol: stock.symbol,
            success: true,
            naver: {
              price,
              prevClose,
              high52Week: stock.high52Week > price ? stock.high52Week : price * 1.15,
              low52Week: stock.low52Week < price ? stock.low52Week : price * 0.85,
              volume: parseFloat(naverStock.accumulatedTradingVolumeRaw) || stock.volume,
              open: parseFloat(naverStock.openPriceRaw) || price,
              high: parseFloat(naverStock.highPriceRaw) || price,
              low: parseFloat(naverStock.lowPriceRaw) || price,
              nxtPrice,
              nxtChange,
              nxtChangePercent
            }
          };
        } catch (err) {
          clearTimeout(timeoutId);
          return { symbol: stock.symbol, success: false };
        }
      } else {
        // US Stocks - Fetch from Yahoo Finance API using public chart v8 endpoints
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
          
          if (!response.ok) {
            return { symbol: stock.symbol, success: false };
          }
          
          const data = await response.json() as any;
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta) {
            return { symbol: stock.symbol, success: false };
          }
          
          return {
            symbol: stock.symbol,
            success: true,
            meta
          };
        } catch (err) {
          clearTimeout(timeoutId);
          return { symbol: stock.symbol, success: false };
        }
      }
    });
    
    const results = await Promise.allSettled(promises);
    
    const dataMap = new Map<string, any>();
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.success) {
        dataMap.set(res.value.symbol, res.value);
      }
    }
    
    liveStocks = liveStocks.map(stock => {
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
      
      let nxtPrice: number | undefined = undefined;
      let nxtChange: number | undefined = undefined;
      let nxtChangePercent: number | undefined = undefined;
      
      if (entry.naver) {
        price = entry.naver.price / factor;
        prevClose = entry.naver.prevClose / factor;
        high52Week = entry.naver.high52Week / factor;
        low52Week = entry.naver.low52Week / factor;
        volume = entry.naver.volume;
        open = entry.naver.open / factor;
        high = entry.naver.high / factor;
        low = entry.naver.low / factor;
        if (entry.naver.nxtPrice !== undefined) {
          nxtPrice = entry.naver.nxtPrice / factor;
          nxtChange = entry.naver.nxtChange !== undefined ? entry.naver.nxtChange / factor : undefined;
          nxtChangePercent = entry.naver.nxtChangePercent;
        }
      } else if (entry.meta) {
        const meta = entry.meta;
        price = (meta.regularMarketPrice ?? stock.price) / factor;
        prevClose = (meta.chartPreviousClose ?? stock.prevClose) / factor;
        high52Week = (meta.fiftyTwoWeekHigh ?? stock.high52Week) / factor;
        low52Week = (meta.fiftyTwoWeekLow ?? stock.low52Week) / factor;
        volume = meta.regularMarketVolume ?? stock.volume;
        open = price;
        high = (meta.regularMarketDayHigh ?? price) / factor;
        low = (meta.regularMarketDayLow ?? price) / factor;
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
    
    console.log('Real stock prices updated successfully from Naver Finance and Yahoo Finance APIs.');
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

// Lazy-initialization helper for Gemini as recommended in rules
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required in settings/secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
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
  const { price, prevClose, open, high, low, high52Week, low52Week, volume } = req.body;
  
  const stockIndex = liveStocks.findIndex(s => s.symbol === symbol);
  if (stockIndex === -1) {
    res.status(404).json({ error: 'Stock not found' });
    return;
  }
  
  const current = liveStocks[stockIndex];
  
  const newPrice = price !== undefined ? Number(price) : current.price;
  const newPrevClose = prevClose !== undefined ? Number(prevClose) : current.prevClose;
  const newOpen = open !== undefined ? Number(open) : (current.open ?? newPrice);
  const newHigh = high !== undefined ? Number(high) : (current.high ?? newPrice);
  const newLow = low !== undefined ? Number(low) : (current.low ?? newPrice);
  const newHigh52 = high52Week !== undefined ? Number(high52Week) : current.high52Week;
  const newLow52 = low52Week !== undefined ? Number(low52Week) : current.low52Week;
  const newVolume = volume !== undefined ? Number(volume) : current.volume;
  
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
    kneeShoulderStatus: stats.status
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
    const client = getGemini();
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
    const parsedReport = JSON.parse(text.trim());
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
    const client = getGemini();
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
    const parsedThemes = JSON.parse(text.trim());
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
