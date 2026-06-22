export interface Stock {
  symbol: string;
  name: string;
  nameEn: string;
  price: number;
  prevClose: number;
  open?: number;
  high?: number;
  low?: number;
  change: number; // price change amount
  changePercent: number; // percentage change
  high52Week: number;
  low52Week: number;
  volume: number;
  marketCap: string;
  peRatio: number;
  rsi: number;
  ma20: number;
  description: string;
  kneeShoulderIndex: number; // Calculated percentage: (price - low) / (high - low) * 100
  kneeShoulderStatus: 'FOOT' | 'KNEE' | 'WAIST' | 'SHOULDER' | 'HEAD'; // 발, 무릎, 허리, 어깨, 머리
  nxtPrice?: number;
  nxtChange?: number;
  nxtChangePercent?: number;
  isCalibrated?: boolean;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isReal?: boolean;
}

export interface AlertSetting {
  id: string;
  symbol: string;
  stockName: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  isActive: boolean;
  isTriggered: boolean;
  createdAt: string;
  triggeredAt?: string;
}

export interface DiscussionPost {
  id: string;
  symbol: string;
  username: string;
  content: string;
  timestamp: string;
  isAi?: boolean;
  likes: number;
}

export interface PortfolioItem {
  symbol: string;
  stockName: string;
  shares: number;
  buyAvgPrice: number;
}

export interface MarketTheme {
  id: string;
  name: string;
  description: string;
  growthDriver: string;
  status: 'INTRO' | 'GROWTH' | 'PEAK' | 'CORRECTION' | 'STABILIZATION'; // 도입, 성장, 과열(어깨/머리), 조정, 안정화
  statusInfo: {
    title: string;
    description: string;
    color: string;
  };
  relativeStocks: {
    symbol: string;
    name: string;
    relationReason: string;
  }[];
  timeline: {
    phase: string;
    label: string;
    description: string;
    trend: 'rise' | 'fall' | 'flat';
  }[];
  expertBullishness?: number; // 전문가 긍정률 (0-100)
  bubbleIndex?: number;       // 거품 지수 (0-100)
  expertOpinionsSummary?: string; // 전문가들의 상세 의견 요약
  riskFactor?: string;        // 핵심 리스크 요인
  future3YrOutlook?: string;  // 향후 3개년 전망
}

export interface AiAnalysisReport {
  symbol: string;
  kneeShoulderCommentary: string; // "무릎인지 어깬지" 상세 진단 내용
  positiveFactors: string[]; // 호재 분석 (오르면 왜 오르는지)
  negativeFactors: string[]; // 악재 분석 (떨어지면 왜 떨어지는지)
  investmentVerdict: string; // 종합 투자 판단 (매수, 보수, 관망 등)
  analyzedAt: string;
}
