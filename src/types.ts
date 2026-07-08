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

export interface UserProfile {
  riskTolerance: 'aggressive' | 'moderate' | 'conservative';
  horizon: 'short' | 'mid' | 'long';
  region: 'krx' | 'us' | 'global';
  interests: string;
  extraDetails: string;
}

export interface PortfolioHolding {
  name: string;
  ticker?: string;
  purchasePrice?: number;
  currentPrice?: number;
  quantity?: number;
  evaluationAmount?: number;
  profitLoss?: number;
  returnPercent?: number;
  marketPosition?: '발' | '무릎' | '허리' | '어깨' | '머리';
  actionOpinion?: '적극매수' | '추가매수' | '관망유지' | '비중축소' | '교체매도';
  individualVerdict?: string;
}

export interface PortfolioSummary {
  totalPurchaseAmount?: number;
  totalEvaluationAmount?: number;
  totalProfitLoss?: number;
  totalReturnPercent?: number;
  deposit?: number;
}

export interface CaptureAnalysisResult {
  targetTicker: string;               // 판독되거나 사용자가 산 종목/지수명
  marketPosition: '발' | '무릎' | '허리' | '어깨' | '머리'; // 주가 위치 판정 (발, 무릎, 허리, 어깨, 머리)
  marketPositionDescription: string;   // 주가 위치 판정 이유 (현재 위치 진단 상세 설명)
  actionPlan: string;                 // 앞으로의 권장 핵심 행동 (예: "분할 매수 개시", "보유 및 일부 실익 실현", "적극 관망", "전량 비중 축소")
  actionPlanDetail: string;           // 구체적으로 어떻게 행동해야 하는지에 대한 조언 (구체적 비중 제어 전략)
  macroBackground: string;            // 거시경제적 배경 및 금리/유동성 영향도 (왜 오르고 떨어지는지에 대한 배경)
  technicalBackground: string;        // 차트와 수급 등 기술적 분석 배경
  suitabilityScore: number;           // 성향 적합도 점수 (1~100)
  suitabilityComment: string;         // 나의 투자 성향 및 조건 대비 종합 적합도 피드백
  warningSignals: string[];           // 경계해야 할 핵심 리스크 징후 3가지
  isPortfolio?: boolean;               // 포트폴리오(잔고/보유) 캡처 여부
  portfolioSummary?: PortfolioSummary; // 포트폴리오 요약 정보
  portfolioHoldings?: PortfolioHolding[]; // 개별 보유 종목 목록
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

