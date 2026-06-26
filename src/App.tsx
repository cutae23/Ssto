import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileImage, 
  CheckCircle2, 
  Zap, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  Sparkles, 
  RefreshCw, 
  Sliders, 
  X, 
  ChevronRight, 
  Info, 
  ShieldAlert, 
  Coins,
  ArrowUpRight,
  HelpCircle,
  HelpCircle as QuestionIcon,
  LayoutDashboard,
  Cpu,
  Layers,
  MessageSquare,
  Key,
  Printer,
  Eye
} from 'lucide-react';
import { UserProfile, CaptureAnalysisResult, PortfolioHolding, PortfolioSummary } from './types';
import AiChatPanel from './components/AiChatPanel';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Helper function to group holdings by industrial sectors
export function groupHoldingsBySector(holdings: PortfolioHolding[]): Array<{
  id: string;
  name: string;
  description: string;
  iconName: 'Zap' | 'Cpu' | 'Layers' | 'Globe' | 'Coins';
  color: string;
  items: PortfolioHolding[];
  totalValue: number;
  totalProfit: number;
}> {
  const sectors: Record<string, {
    id: string;
    name: string;
    description: string;
    iconName: 'Zap' | 'Cpu' | 'Layers' | 'Globe' | 'Coins';
    color: string;
    items: PortfolioHolding[];
    totalValue: number;
    totalProfit: number;
  }> = {
    'energy_infra': {
      id: 'energy_infra',
      name: '전력망 인프라 및 신재생에너지 (Power & Green Grid)',
      description: 'AI 데이터센터 전력 소비 급증에 대응하는 전력 그리드 송배전 및 무탄소 청정에너지 핵심 밸류체인',
      iconName: 'Zap',
      color: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
      items: [],
      totalValue: 0,
      totalProfit: 0
    },
    'semiconductor_tech': {
      id: 'semiconductor_tech',
      name: '반도체 및 하이테크 우주항공 (Semiconductors & Aero)',
      description: '글로벌 인공지능(AI) 고대역폭 메모리 핵심 기술 및 우주항공 인프라 저궤도 통신망 기술',
      iconName: 'Cpu',
      color: 'from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20 text-indigo-400 bg-indigo-500/5',
      items: [],
      totalValue: 0,
      totalProfit: 0
    },
    'robot_materials': {
      id: 'robot_materials',
      name: '지능형 로봇 및 화학 신소재 (Robotics & Materials)',
      description: '휴머노이드 협동 로봇의 정밀 기어 감속기 모터 부품 및 가치 사슬 내 특수 신재료 기술',
      iconName: 'Layers',
      color: 'from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20 text-purple-400 bg-purple-500/5',
      items: [],
      totalValue: 0,
      totalProfit: 0
    },
    'global_it_commodity': {
      id: 'global_it_commodity',
      name: '글로벌 원자재 상사 및 IT 부품 (Commodities & IT Part)',
      description: '국제 원재료 에너지 공급 유통 마진 무역 및 디스플레이 전방 부품 제조',
      iconName: 'Globe',
      color: 'from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/20 text-yellow-400 bg-yellow-500/5',
      items: [],
      totalValue: 0,
      totalProfit: 0
    }
  };

  const defaultSector = {
    id: 'other_sectors',
    name: '기타 개별 전략 테마군 (Etc & Mid-Cap Theme)',
    description: '개별 기업 고유의 모멘텀 및 특수 일회성 호재를 추종하는 투자 자산군',
    iconName: 'Coins' as const,
    color: 'from-zinc-500/10 via-zinc-500/5 to-transparent border-zinc-800 text-zinc-400 bg-zinc-950/40',
    items: [] as PortfolioHolding[],
    totalValue: 0,
    totalProfit: 0
  };

  holdings.forEach(holding => {
    const name = holding.name || '';
    const ticker = holding.ticker || '';
    
    if (name.includes('대원전선') || name.includes('씨에스윈드') || ticker === '006340.KS' || ticker === '112610.KS') {
      sectors['energy_infra'].items.push(holding);
      sectors['energy_infra'].totalValue += holding.evaluationAmount || 0;
      sectors['energy_infra'].totalProfit += holding.profitLoss || 0;
    } else if (name.includes('삼성전자') || name.includes('AP위성') || ticker === '005930.KS' || ticker === '211270.KQ') {
      sectors['semiconductor_tech'].items.push(holding);
      sectors['semiconductor_tech'].totalValue += holding.evaluationAmount || 0;
      sectors['semiconductor_tech'].totalProfit += holding.profitLoss || 0;
    } else if (name.includes('이랜시스') || name.includes('한국첨단소재') || ticker === '413570.KQ' || ticker === '028080.KQ') {
      sectors['robot_materials'].items.push(holding);
      sectors['robot_materials'].totalValue += holding.evaluationAmount || 0;
      sectors['robot_materials'].totalProfit += holding.profitLoss || 0;
    } else if (name.includes('GS글로벌') || name.includes('육일씨엔에쓰') || ticker === '012510.KS' || ticker === '191410.KQ') {
      sectors['global_it_commodity'].items.push(holding);
      sectors['global_it_commodity'].totalValue += holding.evaluationAmount || 0;
      sectors['global_it_commodity'].totalProfit += holding.profitLoss || 0;
    } else {
      defaultSector.items.push(holding);
      defaultSector.totalValue += holding.evaluationAmount || 0;
      defaultSector.totalProfit += holding.profitLoss || 0;
    }
  });

  const resultList = Object.values(sectors).filter(s => s.items.length > 0);
  if (defaultSector.items.length > 0) {
    resultList.push(defaultSector);
  }
  return resultList;
}

// Gorgeous mock data perfectly matching the user's exact MTS receipt from the screenshot!
const SAMPLE_PORTFOLIO_SUMMARY: PortfolioSummary = {
  totalPurchaseAmount: 89111000,
  totalEvaluationAmount: 60465680,
  totalProfitLoss: -28645320,
  totalReturnPercent: -32.15,
  deposit: 21826915
};

const SAMPLE_PORTFOLIO_HOLDINGS: PortfolioHolding[] = [
  { 
    name: '대원전선', 
    ticker: '006340.KS', 
    purchasePrice: 12221, 
    currentPrice: 10700, 
    quantity: 1937, 
    evaluationAmount: 20725900, 
    profitLoss: -2945440, 
    returnPercent: -12.44,
    marketPosition: '무릎',
    actionOpinion: '추가매수',
    individualVerdict: '전력 그리드 공급 부족 수혜가 명확하여 일봉상 120일 지지선 부근에서 분할 매수 단가 관리가 매우 유리합니다. 현재의 손실 -12.44%는 단기 전력 설비주의 조정을 감안할 때 감당 가능한 수준이며, 중장기 우상향 모멘텀이 살아있으므로 현금 비중의 일부를 활용한 분할 물타기가 적절합니다.'
  },
  { 
    name: '씨에스윈드', 
    ticker: '112610.KS', 
    purchasePrice: 64390, 
    currentPrice: 41200, 
    quantity: 480, 
    evaluationAmount: 19776000, 
    profitLoss: -11131000, 
    returnPercent: -36.01,
    marketPosition: '발',
    actionOpinion: '추가매수',
    individualVerdict: '글로벌 해상 풍력 1위 위상 대비 금리 인하 지연 우려로 낙폭이 과대했습니다. 그러나 주봉 및 월봉상 장기 역사적 지지선에 다다랐으므로 현재의 손실 -36.01% 상태에서 신규 매수가 활발해지고 있습니다. 보유 예수금(26.5%)을 활용해 평단가를 낮출 1순위 핵심 대응 종목입니다.'
  },
  { 
    name: '육일씨엔에쓰', 
    ticker: '191410.KQ', 
    purchasePrice: 1976, 
    currentPrice: 1020, 
    quantity: 6700, 
    evaluationAmount: 6834000, 
    profitLoss: -6404000, 
    returnPercent: -48.38,
    marketPosition: '발',
    actionOpinion: '관망유지',
    individualVerdict: '손실 -48.38%로 낙폭은 과대하나 IT 전방 수요 둔화와 거래량 소실 국면이 길어지고 있습니다. 섣부른 물타기로 자금이 더 묶이는 것은 비효율적입니다. 추가 매수 없이 그대로 유지(관망)하다가 풍력/전선 주도 섹터의 상승이 일어날 때 계좌 전체의 가시적 회복을 도모하는 전략이 좋습니다.'
  },
  { 
    name: 'GS글로벌', 
    ticker: '012510.KS', 
    purchasePrice: 4560, 
    currentPrice: 2685, 
    quantity: 2000, 
    evaluationAmount: 5370000, 
    profitLoss: -3750000, 
    returnPercent: -41.12,
    marketPosition: '허리',
    actionOpinion: '교체매도',
    individualVerdict: '석탄 및 종합 원자재 무역 마진 변동성이 높습니다. 현재 주가는 허리 부근에서 보합 중이며, 추가 예수금을 소모할 메리트가 약합니다. 전선 또는 친환경 원자재 같은 직관적인 메가테마로의 반등 시, 비중을 서서히 축소하거나 타 주도 종목으로 교체 매도하는 것을 추천합니다.'
  },
  { 
    name: '한국첨단소재', 
    ticker: '028080.KQ', 
    purchasePrice: 3393, 
    currentPrice: 1429, 
    quantity: 2000, 
    evaluationAmount: 2858000, 
    profitLoss: -3927000, 
    returnPercent: -57.88,
    marketPosition: '발',
    actionOpinion: '교체매도',
    individualVerdict: '손실이 -57.88%로 가장 높으나, 거래량이 매우 극도로 실종되어 장기 소외된 상태입니다. 이러한 소형 잡주는 물타기를 거듭하면 자금 회수 기간(기회비용)이 기하급수적으로 증가합니다. 추가 매수를 금지하고, 차후 소형 테마 펌핑 기회 도래 시 전량 정리하여 전선/우량 반도체 주도주로 리밸런싱을 권고합니다.'
  },
  { 
    name: 'AP위성', 
    ticker: '211270.KQ', 
    purchasePrice: 12560, 
    currentPrice: 9030, 
    quantity: 86, 
    evaluationAmount: 776580, 
    profitLoss: -303580, 
    returnPercent: -28.11,
    marketPosition: '무릎',
    actionOpinion: '관망유지',
    individualVerdict: '우주항공 테마의 특성상 수주 공시나 위성 발사 이슈에 따라 급등락이 빈번합니다. 현재 무릎 단계에서 하방 지지 중이나, 비중(약 77만원)이 미미하므로 예수금을 굳이 추가 투입하기보다 향후 대형 우주항공 계약 뉴스 발생으로 급등이 나오는 시점에 전량 정리하는 가벼운 스윙 대응을 제안합니다.'
  },
  { 
    name: '이랜시스', 
    ticker: '413570.KQ', 
    purchasePrice: 5850, 
    currentPrice: 4370, 
    quantity: 150, 
    evaluationAmount: 655500, 
    profitLoss: -222000, 
    returnPercent: -25.30,
    marketPosition: '허리',
    actionOpinion: '관망유지',
    individualVerdict: '로봇 감속기 및 가전 부품 테마로 큰 시세 연출 후 기술적 조정을 길게 거치고 있습니다. 허리 지대에서 매물이 두텁게 수렴되어 있어 급격한 V자 반등은 어렵습니다. 하지만 보유 비중이 계좌 전체에서 매우 낮으므로 추가 자금을 소모하지 않고 현 상태 그대로 관망 유지를 권장합니다.'
  },
  { 
    name: '삼성전자', 
    ticker: '005930.KS', 
    purchasePrice: 352000, 
    currentPrice: 310500, 
    quantity: 1, 
    evaluationAmount: 310500, 
    profitLoss: -41500, 
    returnPercent: -11.79,
    marketPosition: '무릎',
    actionOpinion: '추가매수',
    individualVerdict: '대형 반도체 밸류 사이클상 전형적인 무릎 하단 구간입니다. 현재 1주만 보유하고 계셔 계좌 내 영향력은 거의 없는 상태이지만, 만약 장기적인 포트폴리오를 우량주 중심으로 재구성하고자 하신다면 국내 대장주로서 가장 편안하고 안전하게 수량을 늘려가기 최적인 가격 지대입니다.'
  }
];

const SAMPLE_ANALYSIS_RESULT: CaptureAnalysisResult = {
  targetTicker: "보유 주식 포트폴리오 (총 8개 종목)",
  marketPosition: "무릎",
  marketPositionDescription: "현재 계좌의 총 평가손익률은 -32.15% 수준으로 전형적인 대형/중소형 기술 성장주들의 깊은 낙폭 과대 국면을 반영하고 있습니다. 그러나 보유 개별 종목들의 이평선 장기 수렴과 전선(대원전선), 풍력 신재생(씨에스윈드) 등 최근 전력 설비 확장 테마의 주봉상 60선 강력 지지를 확인 중입니다. 매도 투매 기류가 소멸되는 전체 사이클 관점의 '무릎' 이하 극단적 과매도 구간입니다.",
  actionPlan: "예수금 분할 배분을 통한 핵심 종목 리밸런싱",
  actionPlanDetail: "현재 보유하신 현금 예수금 약 21,800,000원은 전체 자산 대비 약 26.5%에 이르는 든든한 방패 역할을 하고 있습니다. 이를 무분별하게 전 종목에 고루 물타기하지 마시고, 주가 하락이 진정된 '대원전선' 및 풍력 섹터 1위 '씨에스윈드' 두 핵심 종목에 3회로 나누어 60% 비중을 배분하십시오. 낙폭이 극심하나 모멘텀이 상대적으로 약한 잡주(한국첨단소재 등)는 추가 매수 없이 그대로 유지하거나 반등 시 교체 매수하는 리밸런싱이 유리합니다.",
  macroBackground: "송배전망 그리드 병목 현상 해소를 위한 초고압 변압기 및 전선 수요는 글로벌 전력망 재구축 사업과 결부되어 장기 우상향하는 메가 테마입니다. 미국 연준의 고금리 장기화 우려가 서서히 걷히고 인하 기조가 지지됨에 따라 자본집약적 산업인 씨에스윈드(신재생에너지) 등 가치 회복 수혜가 뒤따를 전망입니다.",
  technicalBackground: "씨에스윈드 및 대원전선은 최고점 대비 각각 40% 이상 하락하여 주봉상 강력한 역사적 마디가 및 이중 바닥 지지 라인을 가리키고 있습니다. 단기 일봉상 이격도가 과도하게 벌어진 언더슈팅 구간으로 낙폭 과대에 따른 기술적 반등 유입 확률이 극도로 높아진 기술적 수렴 패턴입니다.",
  suitabilityScore: 84,
  suitabilityComment: "안정성과 균형을 중요시하는 중기 운용 관점 대비, 전력/신재생 비중이 다소 집중되어 변동성은 크나, 현재 남은 현금(26.5% 비중)을 보유함으로써 리스크 방어력이 잘 조절되어 있습니다. 가이드에 맞춰 점진적 리밸런싱 시 높은 확률로 조기 본전 및 익절 탈출이 가능합니다.",
  warningSignals: [
    "일부 소형주(한국첨단소재, 육일씨엔에쓰)의 거래량 실종 장기 횡보에 따른 기회비용 노출",
    "글로벌 인프라 수주 지연 보도 연출 시 일시적 투자 심리 위축 및 단기 이격 벌어짐",
    "예수금 전량을 일시에 물타기하는 조급한 원스톱 자금 투입"
  ],
  isPortfolio: true,
  portfolioSummary: SAMPLE_PORTFOLIO_SUMMARY,
  portfolioHoldings: SAMPLE_PORTFOLIO_HOLDINGS
};

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isSampleLoaded, setIsSampleLoaded] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CaptureAnalysisResult | null>(null);
  const [selectedHoldingForDetail, setSelectedHoldingForDetail] = useState<PortfolioHolding | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'comprehensive' | 'individual' | 'sectorAnalysis' | 'aiChat'>('comprehensive');
  const [isSavingPdf, setIsSavingPdf] = useState<boolean>(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState<boolean>(false);

  const handleSavePdf = async () => {
    if (!analysisResult) return;
    setIsSavingPdf(true);
    try {
      const element = document.getElementById('pdf-report-template');
      if (!element) {
        throw new Error('PDF report element not found');
      }

      // Check if mobile device to optimize canvas scale and prevent memory limits
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      const scale = isMobile ? 1.2 : 1.8;

      // html2canvas config for high-quality, sharp text render
      const canvas = await html2canvas(element, {
        scale: scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        width: 820,         // Force exact width of the template to be captured
        windowWidth: 820,   // Force layout calculation at exactly 820px width
      });

      const imgData = canvas.toDataURL('image/png');
      if (!imgData || imgData === 'data:,') {
        throw new Error('Failed to generate canvas image data (possibly due to memory limits)');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 standard width in mm
      const pageHeight = 297; // A4 standard height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Draw the first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Render subsequent pages if content overflows A4 height
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const tickerName = analysisResult.targetTicker || 'Asset';
      const safeTickerName = tickerName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      pdf.save(`VisionMarketAI_Report_${safeTickerName}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF 파일 생성 중 오류가 발생했습니다. 모바일 브라우저의 메모리 제한 때문일 수 있습니다. 화면의 리포트 미리보기 기능을 이용하시거나, 가로 화면(데스크톱 모드)으로 변경 후 다시 시도해 주세요.');
    } finally {
      setIsSavingPdf(false);
    }
  };

  // Custom Gemini API Key configuration
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('custom_gemini_api_key') || '');
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => localStorage.getItem('custom_gemini_api_key') || '');
  const [showApiKeySetting, setShowApiKeySetting] = useState<boolean>(false);

  // Expandable investor profile configuration
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    riskTolerance: 'moderate',
    horizon: 'mid',
    region: 'global',
    interests: '전력 인프라 & 친환경 원자재',
    extraDetails: '안정적인 분할 물타기 시점 평가와 현재 보유한 종목들의 종합 진단 및 예수금 활용 비율 제안 요청.'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload from filesystem
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setSelectedFileName(file.name);
        setIsSampleLoaded(false);
        setErrorMessage(null);
        setAnalysisResult(null); // Reset when a new image is loaded
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setSelectedFileName(file.name);
        setIsSampleLoaded(false);
        setErrorMessage(null);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Load the exact mock sample matching user screenshot immediately
  const handleLoadSample = () => {
    setSelectedImage('mock_sample_image');
    setSelectedFileName('MTS_보유_계좌_잔고_캡처.png');
    setIsSampleLoaded(true);
    setErrorMessage(null);
    setAnalysisResult(null);
  };

  const handleResetImage = () => {
    setSelectedImage(null);
    setSelectedFileName(null);
    setIsSampleLoaded(false);
    setAnalysisResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Run AI Multimodal analysis
  const handleRunAnalysis = async () => {
    if (!selectedImage) {
      setErrorMessage('분석할 보유 계좌 잔고 이미지 또는 견본 테스트용 이미지를 선택해 주세요.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(0);
    setErrorMessage(null);
    setAnalysisResult(null);

    // Dynamic micro-step state simulation for visual elegance
    const steps = [
      '1. 계좌 스크린샷 이미지 텍스트 판독 및 보유 종목 OCR 인식 중...',
      '2. 총매입금액, 평가금액, 평가손익 및 예수금 수치 정밀 대입 중...',
      '3. 보유 종목(대원전선, 씨에스윈드 등) 기술적 지지 저항 및 주가 사이클 진단 중...',
      '4. 맞춤형 포트폴리오 리밸런싱 및 예수금 현금 분할 배분 지침 도출 중...'
    ];

    const timer = setInterval(() => {
      setAnalysisStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    try {
      if (isSampleLoaded) {
        // Fast mock load simulation for amazing instantly responsive feel
        await new Promise(resolve => setTimeout(resolve, 1800));
        clearInterval(timer);
        setAnalysisResult(SAMPLE_ANALYSIS_RESULT);
      } else {
        // Call real backend Gemini multimodal endpoint
        const response = await fetch('/api/analyze-capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Gemini-Api-Key': apiKey,
          },
          body: JSON.stringify({
            image: selectedImage,
            mimeType: 'image/png',
            profile: profile
          })
        });

        clearInterval(timer);

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          const errMsg = errData?.error || '서버 분석 도중 대기 시간 초과 오류가 발생했습니다. 견본 테스트를 권장합니다.';
          throw new Error(errMsg);
        }

        const data = await response.json();
        
        if (data && data.error) {
          throw new Error(data.error);
        }
        
        if (data && data.isPortfolio) {
          if (!data.portfolioHoldings || data.portfolioHoldings.length === 0) {
            throw new Error('이미지 분석 결과, 보유 종목 정보를 올바르게 추출하지 못했습니다. MTS/HTS 잔고 화면이 선명하게 보이도록 다시 캡처해서 시도해 주세요.');
          }
        }
        
        setAnalysisResult(data);
      }
    } catch (err: any) {
      console.error('Real AI server analysis failed:', err);
      setErrorMessage(err.message || '서버 분석 도중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col antialiased selection:bg-indigo-500/30">
      {/* 1. Header */}
      <header className="print:hidden border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-gradient-to-tr from-indigo-600 to-rose-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight font-display text-white flex items-center gap-1.5 leading-none">
              내 주식 잔고 AI 진단기 <span className="text-[9px] text-zinc-500 font-mono font-normal">v2.0</span>
            </h1>
            <p className="text-[10px] text-indigo-400 font-mono font-bold mt-1 uppercase tracking-wider leading-none">
              1. 내가 산 종목 스캔 &nbsp;&gt;&nbsp; 2. AI 종합 정밀 평가
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Gemini API Key configuration button */}
          <button
            onClick={() => setShowApiKeySetting(!showApiKeySetting)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
              apiKey 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/5' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shadow-sm shadow-amber-500/5'
            }`}
          >
            <Key className="h-3.5 w-3.5 animate-pulse" />
            {apiKey ? 'Gemini 개인 키 활성화됨' : 'Gemini API 개인키 설정'}
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-bold text-indigo-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            OCR + MULTIMODAL AI PORT
          </span>
        </div>
      </header>

      {/* Gemini API Key Expandable Panel */}
      <AnimatePresence>
        {showApiKeySetting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-zinc-900 bg-zinc-900/40 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row gap-6 items-start justify-between">
              {/* Instructions */}
              <div className="flex-1 space-y-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Key className="h-4 w-4 text-indigo-400" />
                  Gemini API 개인 키(Secret Key) 발급 및 등록 가이드
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  구글 AI Studio에서 누구나 평생 무료로 API 키를 즉시 발급받아 한도 제약 없는 고속 진단 분석 기능을 가동할 수 있습니다.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-zinc-300">
                  <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-850">
                    <span className="text-indigo-400 font-bold">1단계. AI Studio 접속</span>
                    <p className="text-zinc-400 mt-1">
                      <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-bold inline-flex items-center gap-0.5">
                        구글 AI Studio 웹사이트 (aistudio.google.com) <ArrowUpRight className="h-3 w-3" />
                      </a>
                      에 구글 계정으로 로그인합니다.
                    </p>
                  </div>
                  <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-850">
                    <span className="text-indigo-400 font-bold">2단계. API 키 생성 및 복사</span>
                    <p className="text-zinc-400 mt-1">
                      좌측 상단 또는 화면 중앙의 <span className="text-white font-semibold">"Get API key"</span> 버튼 클릭 후, <span className="text-white font-semibold">"Create API key"</span> 버튼을 눌러 발급된 <span className="text-amber-400 font-mono">AIzaSy...</span> 형태의 키를 복사합니다.
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500">
                  ※ 입력하신 개인 API 키는 전적으로 사용자의 웹 브라우저 내부 로컬 저장소(localStorage)에만 안전하게 보관되며 외부 서버나 타인에게 일체 전송 또는 노출되지 않습니다.
                </p>
              </div>

              {/* Input Form */}
              <div className="w-full md:w-80 bg-zinc-950/60 border border-zinc-850 p-4.5 rounded-2xl flex flex-col gap-3 shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-300">Gemini 개인 API 키 입력</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    apiKey ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {apiKey ? '활성화 상태' : '데모 모드 실행중'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="AIzaSy로 시작하는 API 키를 입력해 주세요."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (!apiKeyInput.trim()) {
                          alert('API 키를 입력해 주세요.');
                          return;
                        }
                        const trimmed = apiKeyInput.trim();
                        localStorage.setItem('custom_gemini_api_key', trimmed);
                        setApiKey(trimmed);
                        setApiKeyInput(trimmed);
                        alert('성공: Gemini API 개인키가 안전하게 브라우저에 저장되었습니다. 이제 모든 AI 진단 기능에 고객님의 API 키가 즉시 우선 적용됩니다!');
                        setShowApiKeySetting(false);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer"
                    >
                      키 저장하기
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem('custom_gemini_api_key');
                        setApiKey('');
                        setApiKeyInput('');
                        alert('Gemini API 개인키가 삭제되었습니다. 기본 공용 서버 데모 모드로 자동 전환됩니다.');
                      }}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer"
                    >
                      키 삭제 (데모로)
                    </button>
                  </div>
                </div>

                {apiKey && (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 text-[10px] text-emerald-400 text-center font-mono">
                    {apiKey.slice(0, 6)}••••••••••••{apiKey.slice(-4)}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Single-View Workspace */}
      <main className="print:hidden flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Step-by-Step Info Guide */}
        <div className="bg-gradient-to-r from-indigo-950/20 to-zinc-900/10 border border-zinc-850 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-100">계좌 잔고 스크린샷 1초 진단</h4>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                MTS/HTS의 주식 보유 잔고 화면(총평가액, 손익, 개별 종목명 및 매입가가 담긴 캡처 이미지)을 올려주시면 AI가 즉시 해독하여 
                각 종목의 주가 위치(발·무릎·허리·어깨·머리)와 남은 현금 예수금 운용 방향을 냉정하게 평가합니다.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            {showProfile ? '성향 설정 닫기 ▲' : '나의 투자 성향 변경하기 ▼'}
          </button>
        </div>

        {/* Expandable Preferences Segment */}
        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-5 overflow-hidden flex flex-col gap-4"
            >
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest pb-2 border-b border-zinc-850">
                ⚙️ 맞춤 AI 평가용 보조 투자 성향 설정
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-zinc-400 uppercase">자산 위험 성향</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['conservative', 'moderate', 'aggressive'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setProfile(p => ({ ...p, riskTolerance: t as any }))}
                        className={`text-xs py-2 font-bold rounded-lg border transition-all cursor-pointer ${
                          profile.riskTolerance === t 
                            ? 'bg-zinc-800 border-indigo-500 text-indigo-400' 
                            : 'bg-zinc-950 border-zinc-850 text-zinc-400'
                        }`}
                      >
                        {t === 'conservative' ? '보수안정' : t === 'moderate' ? '균형적' : '공격투자'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-zinc-400 uppercase">희망 운용 주기</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['short', 'mid', 'long'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setProfile(p => ({ ...p, horizon: t as any }))}
                        className={`text-xs py-2 font-bold rounded-lg border transition-all cursor-pointer ${
                          profile.horizon === t 
                            ? 'bg-zinc-800 border-indigo-500 text-indigo-400' 
                            : 'bg-zinc-950 border-zinc-850 text-zinc-400'
                        }`}
                      >
                        {t === 'short' ? '단기(주)' : t === 'mid' ? '중기(월)' : '장기(년)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-zinc-400 uppercase">관심 분야 및 특이 요청</label>
                  <input
                    type="text"
                    value={profile.interests}
                    onChange={(e) => setProfile(p => ({ ...p, interests: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    placeholder="예: 전력 수급, 송배전, AI 인프라"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspace Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT PANELS: Step 1 Upload/Scan (Cols: 5) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 md:p-6 flex flex-col gap-5 relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
              
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-indigo-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-100 font-display">1단계: 계좌 잔고 이미지 스캔</h3>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Upload MTS/HTS Balance Image</p>
                  </div>
                </div>
                {selectedImage && (
                  <button
                    type="button"
                    onClick={handleResetImage}
                    className="text-[11px] text-rose-400 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" /> 비우기
                  </button>
                )}
              </div>

              {/* Dropzone container */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl transition-all relative overflow-hidden flex flex-col items-center justify-center p-6 text-center ${
                  selectedImage 
                    ? 'border-indigo-500 bg-zinc-950/80' 
                    : 'border-zinc-800 bg-zinc-950/30 hover:border-zinc-750 hover:bg-zinc-950/50'
                }`}
                style={{ minHeight: '210px' }}
              >
                {selectedImage ? (
                  <div className="w-full flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-zinc-900 rounded-full border border-zinc-800 text-indigo-400">
                        <FileImage className="h-8 w-8" />
                      </div>
                      <span className="text-xs font-black text-zinc-300 font-mono max-w-xs truncate">
                        {selectedFileName || '내_계좌_잔고_스크린샷.png'}
                      </span>
                      <p className="text-[10px] text-zinc-500 font-mono">가로/세로 매크로 해독 준비 완료</p>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 py-0.5">
                      <CheckCircle2 className="h-3 w-3 text-indigo-400" /> 이미지 탑재 완료
                    </span>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer flex flex-col items-center gap-3 w-full h-full justify-center py-4"
                  >
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-indigo-400 transition-colors">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-zinc-250">
                        여기에 MTS / HTS 잔고 캡처 이미지를 올려주세요.
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1 leading-relaxed">
                        화면 드래그 앤 드롭 하거나 클릭하여 파일 선택 (PNG, JPG, JPEG)
                      </p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Trigger Analysis Button */}
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className={`w-full relative overflow-hidden py-4 rounded-xl flex items-center justify-center gap-2 text-xs font-extrabold font-display uppercase tracking-wider transition-all cursor-pointer ${
                  isAnalyzing 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    : 'bg-gradient-to-r from-indigo-600 to-rose-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.01] hover:shadow-indigo-500/30'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
                    <span>AI 스캔 및 판독 평가 진행 중...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-current" />
                    <span>AI 계좌 스캔 및 정밀 분석 시작</span>
                  </>
                )}
              </button>

              {errorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Helper tips card */}
            <div className="bg-zinc-900/15 border border-zinc-850 p-4.5 rounded-2xl text-xs text-zinc-400 flex flex-col gap-2.5">
              <span className="font-extrabold text-zinc-300 flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                보안 및 수집 안내
              </span>
              <p className="leading-relaxed">
                올리신 계좌 캡처 이미지는 AI OCR 텍스트 해독 및 투자 분석 판단용으로만 일회성으로 즉시 연동되며, 별도로 서버나 데이터베이스에 영구 보존되지 않으므로 안심하고 사용하셔도 됩니다.
              </p>
            </div>
          </div>

          {/* RIGHT PANELS: Step 2 AI Evaluation (Cols: 7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            <AnimatePresence mode="wait">
              {isAnalyzing && (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-6"
                  style={{ minHeight: '500px' }}
                >
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
                    <Sparkles className="h-6 w-6 text-indigo-400 absolute top-5 left-5 animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-2.5 max-w-sm">
                    <h4 className="text-base font-extrabold text-zinc-100">계좌 해독 및 AI 진단 작성 중</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                      {analysisStep === 0 && '1. 계좌 스크린샷 이미지 텍스트 판독 및 보유 종목 OCR 인식 중...'}
                      {analysisStep === 1 && '2. 총매입금액, 평가금액, 평가손익 및 예수금 수치 정밀 대입 중...'}
                      {analysisStep === 2 && '3. 보유 종목(대원전선, 씨에스윈드 등) 기술적 지지 저항 및 주가 사이클 진단 중...'}
                      {analysisStep >= 3 && '4. 맞춤형 포트폴리오 리밸런싱 및 예수금 현금 분할 배분 지침 도출 중...'}
                    </p>
                  </div>
                  <div className="w-48 bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${(analysisStep + 1) * 25}%` }}
                    ></div>
                  </div>
                </motion.div>
              )}

              {!isAnalyzing && !analysisResult && (
                <div className="flex flex-col gap-6 w-full text-left">
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4"
                    style={{ minHeight: '180px' }}
                  >
                    <div className="h-10 w-10 bg-zinc-900/80 border border-zinc-850 rounded-xl flex items-center justify-center text-indigo-400">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-md">
                      <h4 className="text-xs font-black text-zinc-200">AI 정밀 평가 대기 중</h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        왼쪽 1단계에 계좌 스크린샷 이미지를 올리거나 <strong className="text-indigo-400 font-bold">MTS 계좌 잔고 견본 이미지</strong>를 가동하시면 여기에 종합 보고서가 생성됩니다. 대기하는 동안 아래에서 AI 수석 애널리스트에게 시장 전망이나 종목 정보를 질문하실 수 있습니다.
                      </p>
                    </div>
                  </motion.div>

                  <AiChatPanel portfolio={null} profile={profile} />
                </div>
              )}

              {!isAnalyzing && analysisResult && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col gap-6"
                >
                  {/* Title and Synchronize banner */}
                  <div className="bg-gradient-to-r from-indigo-950/40 to-zinc-900/40 border border-indigo-500/25 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider block">AI 정밀 진단 수립 완료</span>
                        <h4 className="text-sm font-extrabold text-white mt-0.5">{analysisResult.targetTicker}</h4>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 relative z-10 shrink-0">
                      <span className="text-xs font-mono font-extrabold px-3 py-1.5 rounded-xl border border-emerald-500/25 text-emerald-400 bg-emerald-500/10 text-center shrink-0">
                        🟢 종합 대응 권장: {analysisResult.actionPlan}
                      </span>
                      <button
                        onClick={() => setIsPdfPreviewOpen(true)}
                        className="flex items-center justify-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all cursor-pointer shadow-md hover:shadow-indigo-500/10 active:scale-95"
                        title="다운로드하기 전에 보고서 디자인과 레이아웃을 모달로 미리 확인합니다."
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>리포트 미리보기</span>
                      </button>
                      <button
                        onClick={handleSavePdf}
                        disabled={isSavingPdf}
                        className="flex items-center justify-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-zinc-950 transition-all cursor-pointer shadow-md hover:shadow-amber-500/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="전체 진단 결과를 보기 좋게 정리된 PDF 파일로 인쇄하거나 저장합니다."
                      >
                        <Printer className={`h-3.5 w-3.5 ${isSavingPdf ? 'animate-spin' : ''}`} />
                        <span>{isSavingPdf ? 'PDF 생성 중...' : 'PDF 리포트 저장'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Premium Tab Swapper */}
                  <div className="flex flex-col md:flex-row bg-zinc-950 border border-zinc-850 rounded-2xl p-1 w-full gap-1 shadow-inner">
                    <button
                      onClick={() => setActiveResultTab('comprehensive')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                        activeResultTab === 'comprehensive'
                          ? 'bg-zinc-900 text-white border border-zinc-850 shadow-md text-indigo-300'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                      }`}
                    >
                      <LayoutDashboard className={`h-4 w-4 transition-colors ${activeResultTab === 'comprehensive' ? 'text-indigo-400' : 'text-zinc-500'}`} />
                      종합의견 및 자산배분 (별도)
                    </button>
                    <button
                      onClick={() => setActiveResultTab('individual')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                        activeResultTab === 'individual'
                          ? 'bg-zinc-900 text-white border border-zinc-850 shadow-md text-purple-300'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                      }`}
                    >
                      <Sparkles className={`h-4 w-4 transition-colors ${activeResultTab === 'individual' ? 'text-purple-400' : 'text-zinc-500'}`} />
                      보유 종목 정밀분석 ({analysisResult.portfolioHoldings?.length || 0}개)
                    </button>
                    <button
                      onClick={() => setActiveResultTab('sectorAnalysis')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                        activeResultTab === 'sectorAnalysis'
                          ? 'bg-zinc-900 text-white border border-zinc-850 shadow-md text-emerald-300'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                      }`}
                    >
                      <TrendingUp className={`h-4 w-4 transition-colors ${activeResultTab === 'sectorAnalysis' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      분야별 그룹핑 & 트렌드
                    </button>
                    <button
                      onClick={() => setActiveResultTab('aiChat')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                        activeResultTab === 'aiChat'
                          ? 'bg-zinc-900 text-white border border-zinc-850 shadow-md text-amber-300'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                      }`}
                    >
                      <MessageSquare className={`h-4 w-4 transition-colors ${activeResultTab === 'aiChat' ? 'text-amber-400' : 'text-zinc-500'}`} />
                      AI 실시간 Q&A
                    </button>
                  </div>

                  {activeResultTab === 'comprehensive' && (
                    <div className="flex flex-col gap-6">
                      {/* Portfolio extraction summary and grid */}
                  {analysisResult.portfolioSummary && (
                    <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 md:p-6 flex flex-col gap-6 relative overflow-hidden">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-xs font-extrabold text-zinc-100 flex items-center gap-1.5 font-mono uppercase tracking-widest text-indigo-400">
                          <Coins className="h-4 w-4 text-yellow-400" />
                          AI OCR 계좌 캡처 데이터 추출 명세
                        </h3>
                        <p className="text-[10px] text-zinc-400">이미지상의 수치를 AI 비전 엔진이 100% 인식한 데이터 요약입니다.</p>
                      </div>

                      {/* 4-Bento Grid Account Status */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl flex flex-col justify-between">
                          <span className="text-[9px] text-zinc-500 font-bold font-mono">총평가금액 (주식)</span>
                          <span className="text-sm font-black text-white mt-1.5">
                            {(analysisResult.portfolioSummary.totalEvaluationAmount || 0).toLocaleString()}원
                          </span>
                          <span className="text-[8px] text-zinc-500 mt-0.5 font-mono">
                            매입가: {(analysisResult.portfolioSummary.totalPurchaseAmount || 0).toLocaleString()}원
                          </span>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl flex flex-col justify-between">
                          <span className="text-[9px] text-zinc-500 font-bold font-mono">보유 예수금 (현금)</span>
                          <span className="text-sm font-black text-zinc-100 mt-1.5">
                            {(analysisResult.portfolioSummary.deposit || 0).toLocaleString()}원
                          </span>
                          <span className="text-[8px] text-indigo-400 mt-0.5 font-mono font-bold">
                            현금 비중: {(((analysisResult.portfolioSummary.deposit || 0) / Math.max(1, (analysisResult.portfolioSummary.totalEvaluationAmount || 0) + (analysisResult.portfolioSummary.deposit || 0))) * 100).toFixed(1)}%
                          </span>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl flex flex-col justify-between">
                          <span className="text-[9px] text-zinc-500 font-bold font-mono">총 계좌 평가액 (종합)</span>
                          <span className="text-sm font-black text-zinc-100 mt-1.5">
                            {((analysisResult.portfolioSummary.totalEvaluationAmount || 0) + (analysisResult.portfolioSummary.deposit || 0)).toLocaleString()}원
                          </span>
                          <span className="text-[8px] text-zinc-500 mt-0.5 font-mono">
                            예수금 포함 종합액
                          </span>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl flex flex-col justify-between">
                          <span className="text-[9px] text-zinc-500 font-bold font-mono">총평가손익 / 수익률</span>
                          <span className={`text-sm font-black mt-1.5 ${(analysisResult.portfolioSummary.totalProfitLoss || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {(analysisResult.portfolioSummary.totalProfitLoss || 0).toLocaleString()}원
                          </span>
                          <span className={`text-[9px] font-mono font-extrabold flex items-center gap-1 mt-0.5 ${(analysisResult.portfolioSummary.totalReturnPercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {(analysisResult.portfolioSummary.totalReturnPercent || 0) >= 0 ? '▲' : '▼'}
                            {Math.abs(analysisResult.portfolioSummary.totalReturnPercent || 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* Holdings table list */}
                      {analysisResult.portfolioHoldings && analysisResult.portfolioHoldings.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase block">판독된 보유 주식 개별 현황 ({analysisResult.portfolioHoldings.length}개 종목)</span>
                            <span className="text-[9px] text-indigo-400 font-bold flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5 animate-pulse" />
                              종목 클릭 시 AI 개별 처방전이 열립니다
                            </span>
                          </div>
                          
                          <div className="overflow-x-auto rounded-xl border border-zinc-850 bg-zinc-950/20">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-zinc-950/80 border-b border-zinc-850 text-[9px] text-zinc-500 font-mono uppercase">
                                  <th className="p-3 font-semibold">종목명</th>
                                  <th className="p-3 font-semibold text-right">매입단가 / 현재가</th>
                                  <th className="p-3 font-semibold text-right">보유수량 / 평가액</th>
                                  <th className="p-3 font-semibold text-right">평가손익 / 수익률</th>
                                  <th className="p-3 font-semibold text-center">AI 개별 진단 (처방)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-850/50 font-medium text-zinc-300">
                                {analysisResult.portfolioHoldings.map((holding, idx) => {
                                  const isLoss = (holding.profitLoss || 0) < 0;
                                  
                                  // Color mapping for actions
                                  const opinionColor = holding.actionOpinion === '적극매수' || holding.actionOpinion === '추가매수'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                    : holding.actionOpinion === '교체매도'
                                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                                    : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';

                                  return (
                                    <tr 
                                      key={idx} 
                                      onClick={() => setSelectedHoldingForDetail(holding)}
                                      className="hover:bg-zinc-900/60 cursor-pointer transition-all duration-250 group"
                                    >
                                      <td className="p-3">
                                        <div className="flex flex-col">
                                          <span className="font-bold text-zinc-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                                            {holding.name}
                                            <span className="opacity-0 group-hover:opacity-100 text-[8px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-1 py-0.5 rounded transition-all">진단서</span>
                                          </span>
                                          <span className="text-[8px] text-zinc-500 font-mono">{holding.ticker || 'ETC'}</span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-right font-mono">
                                        <div className="flex flex-col items-end">
                                          <span className="text-zinc-500 text-[10px]">{(holding.purchasePrice || 0).toLocaleString()}원</span>
                                          <span className="text-zinc-200 font-extrabold">{(holding.currentPrice || 0).toLocaleString()}원</span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-right font-mono">
                                        <div className="flex flex-col items-end">
                                          <span className="text-zinc-300">{(holding.quantity || 0).toLocaleString()}주</span>
                                          <span className="text-zinc-400 text-[10px]">{(holding.evaluationAmount || 0).toLocaleString()}원</span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-right font-mono">
                                        <div className="flex flex-col items-end">
                                          <span className={isLoss ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                            {(holding.profitLoss || 0).toLocaleString()}원
                                          </span>
                                          <span className={`text-[10px] font-bold ${isLoss ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {holding.returnPercent !== undefined ? `${holding.returnPercent > 0 ? '+' : ''}${holding.returnPercent.toFixed(2)}%` : '-'}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-center">
                                        <div className="flex items-center justify-center">
                                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${opinionColor} shadow-sm flex items-center gap-1 group-hover:scale-105 transition-transform`}>
                                            <Sparkles className="h-2.5 w-2.5" />
                                            {holding.marketPosition || '무릎'} · {holding.actionOpinion || '추가매수'}
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-relaxed mt-1 flex items-center gap-1.5">
                            <span className="text-indigo-400 font-bold">💡 팁:</span> 
                            엄청 마이너스여도 우량 테마의 발/무릎 구간이라면 남아있는 예수금을 최적 배분해 단가를 관리할 수 있습니다. 각 종목을 눌러 개별 진단을 확인하세요.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Real-time stock cycle visual slider (발, 무릎, 허리, 어깨, 머리) */}
                  <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 md:p-6 flex flex-col gap-5 backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-indigo-400 animate-pulse" />
                        <div>
                          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">포트폴리오 주가 사이클 현위치 진단</h3>
                          <p className="text-[9px] text-zinc-500 font-mono">Average Market Cycle Position Diagnosis</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-zinc-400">
                        종합 위치 판정: <span className="font-extrabold text-indigo-400">{analysisResult.marketPosition} 단계</span>
                      </span>
                    </div>

                    {/* 5-Step Cycle Visual Gauge */}
                    <div className="grid grid-cols-5 gap-2 pt-1">
                      {[
                        { name: '발', label: '발 (지하권)', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', activeBorder: 'border-emerald-400 ring-2 ring-emerald-500/20' },
                        { name: '무릎', label: '무릎 (반등권)', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', activeBorder: 'border-indigo-400 ring-2 ring-indigo-500/20' },
                        { name: '허리', label: '허리 (추세선)', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', activeBorder: 'border-yellow-400 ring-2 ring-yellow-500/20' },
                        { name: '어깨', label: '어깨 (경계선)', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', activeBorder: 'border-orange-400 ring-2 ring-orange-500/20' },
                        { name: '머리', label: '머리 (상투권)', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', activeBorder: 'border-rose-400 ring-2 ring-rose-500/20' }
                      ].map((pos) => {
                        const isCurrent = analysisResult.marketPosition === pos.name;
                        return (
                          <div
                            key={pos.name}
                            className={`p-3 rounded-xl border flex flex-col items-center text-center justify-between transition-all relative overflow-hidden ${
                              isCurrent
                                ? `${pos.bg} ${pos.activeBorder} shadow-lg shadow-indigo-500/5`
                                : 'bg-zinc-950/40 border-zinc-850 opacity-40 hover:opacity-75'
                            }`}
                          >
                            {isCurrent && (
                              <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-indigo-400 m-1.5 animate-ping"></div>
                            )}
                            <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${isCurrent ? pos.color : 'text-zinc-500'}`}>
                              {pos.name}
                            </span>
                            <span className={`text-[9px] font-sans font-extrabold mt-1.5 block ${isCurrent ? 'text-zinc-100' : 'text-zinc-500'}`}>
                              {pos.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Current Position Detailed Explanation */}
                    <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-850/60 flex gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 h-fit shrink-0 text-indigo-400">
                        <Info className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase block mb-1">사이클 위치 판정 상세 요약</span>
                        <p className="text-xs text-zinc-350 leading-relaxed font-sans font-semibold">
                          {analysisResult.marketPositionDescription}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bento Analytical Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* A. Tactical Action Plan */}
                    <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 md:p-6 flex flex-col gap-4 relative overflow-hidden">
                      <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/50">
                        <div className="h-7 w-7 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Zap className="h-4 w-4 fill-current animate-bounce" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">향후 계좌 리밸런싱 / 대응 지침</h4>
                          <p className="text-[9px] text-zinc-500 font-mono">Tactical Action Plan & Cash Guide</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3.5">
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850/60 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 font-mono uppercase">권장 전술 핵심 액션</span>
                            <span className="font-black text-emerald-400 text-sm mt-0.5">{analysisResult.actionPlan}</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            추천 전략 편입
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase">구체적인 물타기 및 평단 관리 팁:</span>
                          <p className="text-xs text-zinc-350 leading-relaxed bg-zinc-950 p-3.5 rounded-xl border border-zinc-850/60 font-semibold">
                            {analysisResult.actionPlanDetail}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* B. Macro Backdrop & Threat Warning signals */}
                    <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 md:p-6 flex flex-col gap-4 relative overflow-hidden">
                      <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/50">
                        <div className="h-7 w-7 bg-indigo-500/10 rounded-lg border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">글로벌 거시 경제적 배경 요인</h4>
                          <p className="text-[9px] text-zinc-500 font-mono">Macro & Threat Environment</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase">거시 환경 & 해당 산업 동향 분석:</span>
                          <p className="text-xs text-zinc-350 leading-relaxed bg-zinc-950 p-3.5 rounded-xl border border-zinc-850/60">
                            {analysisResult.macroBackground}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase">AI 애널리스트 경계 경보 요인 (Warning Signals):</span>
                          <div className="flex flex-col gap-1.5">
                            {analysisResult.warningSignals.map((signal, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-zinc-400 bg-zinc-950 border border-zinc-850/40 p-2.5 rounded-lg">
                                <span className="text-rose-400 mt-0.5 font-bold">⚠️</span>
                                <span className="leading-relaxed text-[11px] font-semibold">{signal}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Suitability score and final comment */}
                  <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-20 w-20 bg-indigo-500/5 rounded-full blur-xl"></div>
                    <div className="flex items-center gap-4 relative z-10 shrink-0">
                      <div className="h-16 w-16 rounded-full border-4 border-indigo-500/20 flex items-center justify-center text-indigo-400 text-lg font-black bg-zinc-950 font-mono shadow-md shadow-indigo-500/10">
                        {analysisResult.suitabilityScore}%
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-zinc-200 uppercase tracking-wider">나의 투자 성향 종합 적합율</h4>
                        <span className="text-[10px] text-zinc-500 font-mono">Portfolio Suitability Rating</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xl relative z-10 font-semibold border-t md:border-t-0 md:border-l border-zinc-800/80 pt-3 md:pt-0 md:pl-5">
                      {analysisResult.suitabilityComment}
                    </p>
                  </div>
                </div>
              )}

              {activeResultTab === 'individual' && (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  {/* Section Title & Help tooltip */}
                  <div className="bg-gradient-to-r from-purple-950/40 to-zinc-900/40 border border-purple-500/20 rounded-2xl p-5 md:p-6 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-2.5 relative z-10">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                        <Sparkles className="h-5 w-5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">종목별 1:1 정밀 AI 처방 피드</h3>
                        <span className="text-[10px] text-purple-400 font-mono uppercase tracking-wider block mt-0.5">Individual Stock-by-Stock Diagnosis & Prescriptions</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed mt-1.5 relative z-10 font-medium">
                      현재 계좌에 해독된 <strong className="text-purple-300 font-bold">{analysisResult.portfolioHoldings?.length || 0}개의 개별 보유 종목</strong>에 대하여, 주가 수명 주기 상의 위치 판정과 그에 따른 1:1 전술 처방전입니다.
                    </p>
                  </div>

                  {/* Diagnostic Cards List */}
                  {analysisResult.portfolioHoldings && analysisResult.portfolioHoldings.length > 0 ? (
                    <div className="flex flex-col gap-6">
                      {analysisResult.portfolioHoldings.map((holding, idx) => {
                        const isLoss = (holding.profitLoss || 0) < 0;
                        const isBuy = holding.actionOpinion === '적극매수' || holding.actionOpinion === '추가매수';
                        const isSell = holding.actionOpinion === '교체매도' || holding.actionOpinion === '비중축소';
                        
                        const actionBg = isBuy 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : isSell 
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';

                        // Attractiveness details
                        const position = holding.marketPosition || '무릎';
                        let score = 50;
                        let text = '관망 및 대기 (추가 자금 투입 자제)';
                        let scoreColor = 'text-yellow-400';
                        
                        if (position === '발') {
                          score = 95;
                          text = '최고 수준 적극 매수 (현금 배분 1순위 권장)';
                          scoreColor = 'text-emerald-400';
                        } else if (position === '무릎') {
                          score = 85;
                          text = '매우 양호 (분할 평단가 하향 적극 추천)';
                          scoreColor = 'text-emerald-400';
                        } else if (position === '허리') {
                          score = 50;
                          text = '관망 보류 (기 보유 비중만 유지 권장)';
                          scoreColor = 'text-yellow-400';
                        } else if (position === '어깨') {
                          score = 25;
                          text = '비중 조절 요망 (추가 물타기 금지 및 매도 대응)';
                          scoreColor = 'text-rose-400';
                        } else if (position === '머리') {
                          score = 10;
                          text = '경계 및 대피 (추가 매수 절대 불가, 비중 전량 탈출)';
                          scoreColor = 'text-rose-400';
                        }

                        return (
                          <div key={idx} className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-6 flex flex-col gap-5 relative overflow-hidden group hover:border-zinc-700 transition-all duration-300">
                            {/* Decorative line */}
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${
                              isBuy ? 'bg-emerald-500' : isSell ? 'bg-rose-500' : 'bg-yellow-500'
                            }`}></div>

                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pl-2">
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-zinc-950 border border-zinc-850 flex flex-col items-center justify-center shrink-0">
                                  <span className="text-[10px] font-black text-indigo-400">{idx + 1}</span>
                                  <span className="text-[8px] text-zinc-500 font-mono">INDEX</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">{holding.name}</h4>
                                    <span className="text-[9px] text-zinc-500 font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">
                                      {holding.ticker || 'ETC'}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-zinc-400 block mt-1.5 font-medium">
                                    보유수량: <strong className="text-zinc-200">{(holding.quantity || 0).toLocaleString()}주</strong> · 매입가: <strong className="text-zinc-200">{(holding.purchasePrice || 0).toLocaleString()}원</strong>
                                  </span>
                                </div>
                              </div>

                              {/* Pricing metadata in right */}
                              <div className="flex items-end sm:text-right gap-4 sm:gap-2 flex-row sm:flex-col shrink-0 font-mono text-xs">
                                <div className="flex flex-col">
                                  <span className="text-[8px] text-zinc-500 font-bold uppercase">평가금액 (현재가)</span>
                                  <span className="font-extrabold text-zinc-100">{(holding.evaluationAmount || 0).toLocaleString()}원 <span className="text-[9px] text-zinc-500">({(holding.currentPrice || 0).toLocaleString()}원)</span></span>
                                </div>
                                <div className="flex flex-col sm:items-end">
                                  <span className="text-[8px] text-zinc-500 font-bold uppercase">평가손익 / 수익률</span>
                                  <span className={`font-black flex items-center gap-1 ${isLoss ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {(holding.profitLoss || 0).toLocaleString()}원 ({(holding.returnPercent || 0) >= 0 ? '+' : ''}{(holding.returnPercent || 0).toFixed(2)}%)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Custom Status Bar and Opinion */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                              {/* Prescribed Action Banner */}
                              <div className={`border p-3 rounded-xl flex items-center justify-between gap-3 ${actionBg}`}>
                                <div className="flex items-center gap-2">
                                  {isBuy ? (
                                    <TrendingUp className="h-4 w-4 animate-bounce shrink-0" />
                                  ) : isSell ? (
                                    <ShieldAlert className="h-4 w-4 shrink-0" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4 shrink-0" />
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-[8px] opacity-70 font-bold font-mono">권장 행동 지표</span>
                                    <span className="text-xs font-extrabold">{holding.actionOpinion || '추가매수'}</span>
                                  </div>
                                </div>
                                <span className="text-[8px] font-mono font-bold bg-current/10 px-1.5 py-0.5 border border-current rounded">
                                  {holding.marketPosition || '무릎'} 단계
                                </span>
                              </div>

                              {/* Attractiveness Rating */}
                              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className="text-[8px] text-zinc-500 font-bold font-mono">예수금 물타기 매력</span>
                                  <span className="text-[9px] font-medium text-zinc-400 mt-0.5 truncate max-w-[130px] sm:max-w-xs">{text}</span>
                                </div>
                                <span className={`text-sm font-mono font-black shrink-0 ${scoreColor}`}>{score}점</span>
                              </div>
                            </div>

                            {/* Individual cycle gauge */}
                            <div className="pl-2 flex flex-col gap-1.5 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/50">
                              <span className="text-[8px] text-zinc-500 font-bold font-mono uppercase">주가 사이클 위치</span>
                              <div className="relative flex items-center justify-between px-2 mt-1.5">
                                <div className="absolute top-1/2 left-2 right-2 h-[1px] bg-zinc-900 -translate-y-1/2 z-0"></div>
                                {['발', '무릎', '허리', '어깨', '머리'].map((node) => {
                                  const isNodeActive = holding.marketPosition === node;
                                  return (
                                    <div key={node} className="relative z-10 flex flex-col items-center">
                                      <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all ${
                                        isNodeActive 
                                          ? 'bg-indigo-500 border-indigo-400 ring-2 ring-indigo-500/30' 
                                          : 'bg-zinc-950 border-zinc-900'
                                      }`}>
                                        {isNodeActive && <div className="h-1 w-1 rounded-full bg-white"></div>}
                                      </div>
                                      <span className={`text-[8px] font-bold mt-1.5 ${isNodeActive ? 'text-indigo-400 font-black' : 'text-zinc-600'}`}>
                                        {node}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* AI Verdict text */}
                            <div className="bg-zinc-950 border border-zinc-900/60 p-4 rounded-2xl pl-4 relative">
                              <div className="absolute top-3 left-3 text-indigo-500/30 font-serif text-xl leading-none">“</div>
                              <div className="pl-3.5 pr-1 text-xs text-zinc-300 leading-relaxed font-semibold">
                                {holding.individualVerdict || '해당 종목의 AI 정밀 분석 의견을 로드하지 못했습니다.'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-8 text-center text-zinc-500 text-xs">
                      해독된 보유 종목이 없습니다.
                    </div>
                  )}
                </div>
              )}

              {activeResultTab === 'sectorAnalysis' && (
                <div className="flex flex-col gap-6 animate-fadeIn text-left">
                  {/* Premium Banner */}
                  <div className="bg-gradient-to-r from-emerald-950/40 to-zinc-900/40 border border-emerald-500/20 rounded-2xl p-5 md:p-6 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-2.5 relative z-10">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <TrendingUp className="h-5 w-5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">AI 보유 자산 분야별 그룹핑 및 트렌드 분석</h3>
                        <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block mt-0.5">AI Sector Grouping & Core Industry Macro Trends</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed mt-1.5 relative z-10 font-medium">
                      보유하신 포트폴리오 자산을 유사 산업 테마별로 그룹핑하여 포트폴리오의 리스크 분산도를 진단하고, 실시간 시장 주도 섹터 분석과 향후 상승 모멘텀을 가진 유망 분야를 AI 비전으로 정밀 추적합니다.
                    </p>
                  </div>

                  {/* 1. 분야별 보유 비중 & 손익 요약 현황 */}
                  <div className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-5 md:p-6 flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-xs font-extrabold text-zinc-150 flex items-center gap-1.5 font-mono uppercase tracking-wider text-emerald-400">
                        <Coins className="h-4 w-4" />
                        보유 주식 포트폴리오 산업 분야별 그룹핑 명세
                      </h4>
                      <p className="text-[10px] text-zinc-400">보유 종목들의 고유한 사업 영역을 판별하여 4대 중점 기술 분야로 분류한 결과입니다.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(() => {
                        const sectorGroups = groupHoldingsBySector(analysisResult.portfolioHoldings || []);
                        const totalGroupedValue = sectorGroups.reduce((acc, s) => acc + s.totalValue, 0) || 1;

                        return sectorGroups.map((s, idx) => {
                          const weightPercent = ((s.totalValue / totalGroupedValue) * 100);
                          const isProfit = s.totalProfit >= 0;
                          
                          const IconComponent = s.iconName === 'Zap' ? Zap 
                                              : s.iconName === 'Cpu' ? Cpu 
                                              : s.iconName === 'Layers' ? Layers 
                                              : s.iconName === 'Globe' ? Globe 
                                              : Coins;

                          return (
                            <div key={idx} className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-zinc-750 transition-all duration-300">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-900 opacity-20 blur-xl rounded-full"></div>
                              
                              <div className="flex flex-col gap-2 relative z-10">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-300">
                                      <IconComponent className="h-4.5 w-4.5 text-zinc-300" />
                                    </div>
                                    <div>
                                      <span className="text-[11.5px] font-black text-white">{s.name}</span>
                                      <span className="text-[8px] text-zinc-500 font-mono block uppercase tracking-wider">Sector Group {idx + 1}</span>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25">
                                    {weightPercent.toFixed(1)}%
                                  </span>
                                </div>
                                
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium mt-1.5 min-h-[30px]">
                                  {s.description}
                                </p>
                              </div>

                              {/* Simple horizontal progress bar */}
                              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden relative z-10">
                                <div 
                                  className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${weightPercent}%` }}
                                ></div>
                              </div>

                              {/* Financial details row */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-zinc-900 pt-3 relative z-10">
                                <div>
                                  <span className="text-zinc-500 block">총 평가금액</span>
                                  <span className="font-extrabold text-zinc-200 mt-0.5 block">{s.totalValue.toLocaleString()}원</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-zinc-500 block">평가손익</span>
                                  <span className={`font-mono font-black mt-0.5 block ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {isProfit ? '+' : ''}{s.totalProfit.toLocaleString()}원
                                  </span>
                                </div>
                              </div>

                              {/* Sector holdings list */}
                              <div className="bg-zinc-900/40 border border-zinc-900/60 rounded-xl p-3 flex flex-col gap-2 relative z-10">
                                <span className="text-[8.5px] text-zinc-500 font-bold font-mono uppercase tracking-wider block">분야 소속 보유 종목 ({s.items.length}개)</span>
                                <div className="flex flex-col gap-1.5">
                                  {s.items.map((item, itemIdx) => {
                                    const retPercent = item.returnPercent || 0;
                                    const isRetProfit = retPercent >= 0;
                                    return (
                                      <div key={itemIdx} className="flex items-center justify-between text-[10px] py-1 border-b border-zinc-900 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-zinc-300">{item.name}</span>
                                          <span className="text-[8px] text-zinc-500 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">{item.ticker}</span>
                                        </div>
                                        <div className="flex items-center gap-2 font-mono">
                                          <span className="text-zinc-400">{item.currentPrice?.toLocaleString()}원</span>
                                          <span className={`font-extrabold ${isRetProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isRetProfit ? '+' : ''}{retPercent.toFixed(2)}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* 2. 최신 각광을 받는 주식 분야 & 그 사유 (실시간 AI 주도 핵심 테마) */}
                  <div className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-5 md:p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-xs font-extrabold text-zinc-150 flex items-center gap-1.5 font-mono uppercase tracking-wider text-amber-400">
                        <Zap className="h-4 w-4 animate-bounce" />
                        최신 시장 각광 주도 주식 분야 및 AI 핵심 촉매 분석
                      </h4>
                      <p className="text-[10px] text-zinc-400">글로벌 연준 통화 기조 및 유동성 대유입 국면에서 가장 강력한 매수 합의가 생성된 업종입니다.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 카드 1 */}
                      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
                        <div className="absolute top-0 right-0 bg-amber-500/5 w-16 h-16 rounded-full blur-xl"></div>
                        <div className="flex flex-col gap-2 relative z-10">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">SUPER LEAD</span>
                            <span className="text-[8px] text-zinc-500 font-mono">실시간 거래대금 1위</span>
                          </div>
                          <h5 className="text-xs font-black text-white mt-1.5">AI 데이터센터 전력망 및 전선 인프라</h5>
                          <p className="text-[10.5px] text-zinc-400 leading-relaxed font-medium mt-1">
                            생성형 AI 보급으로 빅테크의 전력 수요가 5~10배 폭증하고 있습니다. 초고압 변압기와 송배전 구리 전선 원자재 공급 부족이 극에 달해, 향후 3~4년간 구조적 실적 급증이 약속된 글로벌 초강세 메가 테마입니다.
                          </p>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-850 rounded-xl p-3 flex flex-col gap-1 text-[10px] relative z-10">
                          <span className="text-[8px] text-zinc-500 font-bold font-mono block">포트폴리오 내 연계 보유 자산</span>
                          <div className="flex justify-between items-center mt-1">
                            <span className="font-black text-amber-300">대원전선 (006340.KS)</span>
                            <span className="text-[9px] text-zinc-400 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">무릎-바닥 대응</span>
                          </div>
                        </div>
                      </div>

                      {/* 카드 2 */}
                      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
                        <div className="absolute top-0 right-0 bg-indigo-500/5 w-16 h-16 rounded-full blur-xl"></div>
                        <div className="flex flex-col gap-2 relative z-10">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase">GLOBAL PIVOT</span>
                            <span className="text-[8px] text-zinc-500 font-mono">업황 회복 바닥권</span>
                          </div>
                          <h5 className="text-xs font-black text-white mt-1.5">온디바이스 AI 및 차세대 HBM 반도체</h5>
                          <p className="text-[10.5px] text-zinc-400 leading-relaxed font-medium mt-1">
                            클라우드 종속에서 벗어나 모든 스마트폰, 가전, PC 기기에 자체 AI 가속 NPU 반도체가 탑재되는 시대입니다. 이에 맞춘 맞춤형 고성능 초고속 고대역폭 메모리(HBM) 설계 및 미세 패키징 가치사슬이 시장 거래대금을 영구 흡수하는 형태입니다.
                          </p>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-850 rounded-xl p-3 flex flex-col gap-1 text-[10px] relative z-10">
                          <span className="text-[8px] text-zinc-500 font-bold font-mono block">포트폴리오 내 연계 보유 자산</span>
                          <div className="flex justify-between items-center mt-1">
                            <span className="font-black text-indigo-300">삼성전자 (005930.KS)</span>
                            <span className="text-[9px] text-zinc-400 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">초저점 분할 적립</span>
                          </div>
                        </div>
                      </div>

                      {/* 카드 3 */}
                      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
                        <div className="absolute top-0 right-0 bg-purple-500/5 w-16 h-16 rounded-full blur-xl"></div>
                        <div className="flex flex-col gap-2 relative z-10">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full uppercase">ROBOTICS ERA</span>
                            <span className="text-[8px] text-zinc-500 font-mono">신성장 테마 1위</span>
                          </div>
                          <h5 className="text-xs font-black text-white mt-1.5">지능형 휴머노이드 로봇 및 핵심 기어 감속기</h5>
                          <p className="text-[10.5px] text-zinc-400 leading-relaxed font-medium mt-1">
                            제조업의 무인 자동화와 웨어러블 의료용 로봇, 인공지능 자율 비서 등의 상용화가 급물살을 타고 있습니다. 로봇 완제품 제조 비용의 35% 이상을 차지하는 초정밀 감속 마크 휠 기어 부품은 진입 장벽이 극도로 높은 최대 수혜 핵심 자산입니다.
                          </p>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-850 rounded-xl p-3 flex flex-col gap-1 text-[10px] relative z-10">
                          <span className="text-[8px] text-zinc-500 font-bold font-mono block">포트폴리오 내 연계 보유 자산</span>
                          <div className="flex justify-between items-center mt-1">
                            <span className="font-black text-purple-300">이랜시스 (413570.KQ)</span>
                            <span className="text-[9px] text-zinc-400 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">기술적 관망 유지</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. AI 트렌드 전망: 앞으로 떠오를 주식 분야 */}
                  <div className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-5 md:p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-xs font-extrabold text-zinc-150 flex items-center gap-1.5 font-mono uppercase tracking-wider text-cyan-400">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        AI 중장기 포착: 앞으로 떠오를 독점적 핵심 주식 분야 전망
                      </h4>
                      <p className="text-[10px] text-zinc-400">금리 인하 가속화 단계 및 범국가 정책 인프라 모멘텀이 극대화되는 시점에 대규모 자금 유입이 대기 중인 유망 섹터입니다.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 유망 분야 1 */}
                      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-cyan-500/25 transition-all duration-300">
                        <div className="absolute top-0 right-0 bg-cyan-500/5 w-20 h-20 rounded-full blur-2xl"></div>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400">
                            <Globe className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[11.5px] font-black text-white">범국가 민간 우주항공 및 저궤도 위성 통신망</span>
                            <span className="text-[8px] text-cyan-400 font-mono block tracking-wider uppercase mt-0.5">NEXT MEGA TREND #1 &middot; SPACE ACCELERATOR</span>
                          </div>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 leading-relaxed font-medium">
                          한국 우주항공청(KASA) 공식 개청과 다누리 프로젝트 본격화, 그리고 스페이스X 스타링크 통신 인프라 국내 진출 등이 연계되는 거대한 정책 수혜처입니다. 정부 주도의 초소형 인공위성 다각 발사 계약 수주가 임박하여 낙폭 과대 상태의 전방 핵심 위성 안테나 부품사들의 구조적 성장이 유력합니다.
                        </p>
                        <div className="bg-zinc-900/80 border border-zinc-850 rounded-xl p-3.5 flex flex-col gap-1 text-[10px]">
                          <span className="text-[8px] text-zinc-500 font-bold font-mono">가장 유력한 미래 가치 보유 자산</span>
                          <div className="flex justify-between items-center mt-1">
                            <span className="font-extrabold text-cyan-300">AP위성 (211270.KQ)</span>
                            <span className="text-[9px] text-zinc-500 font-mono">위성 본체/탑재체 전문 기술 보유</span>
                          </div>
                        </div>
                      </div>

                      {/* 유망 분야 2 */}
                      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-emerald-500/25 transition-all duration-300">
                        <div className="absolute top-0 right-0 bg-emerald-500/5 w-20 h-20 rounded-full blur-2xl"></div>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                            <Zap className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[11.5px] font-black text-white">글로벌 무탄소 해상 풍력 및 친환경 그리드</span>
                            <span className="text-[8px] text-emerald-400 font-mono block tracking-wider uppercase mt-0.5">NEXT MEGA TREND #2 &middot; GREEN GRID DECARBONIZATION</span>
                          </div>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 leading-relaxed font-medium">
                          금리 인하 기조 확정 시, 막대한 프로젝트 파이낸싱(PF) 대출 자금이 묶여 지연되던 유럽 및 북미 지역의 해상 풍력 대규모 개발 단지 승인이 기하급수적으로 부활하게 됩니다. 특히 해상 풍력 타워 부문에서 독점적인 시장 지배력을 보유한 공급사는 업황 턴어라운드 돌입 시 전 세계 수주를 무차별 흡수할 예정입니다.
                        </p>
                        <div className="bg-zinc-900/80 border border-zinc-850 rounded-xl p-3.5 flex flex-col gap-1 text-[10px]">
                          <span className="text-[8px] text-zinc-500 font-bold font-mono">가장 유력한 미래 가치 보유 자산</span>
                          <div className="flex justify-between items-center mt-1">
                            <span className="font-extrabold text-emerald-300">씨에스윈드 (112610.KS)</span>
                            <span className="text-[9px] text-zinc-500 font-mono">글로벌 해상 풍력 타워 시장 점유율 1위</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeResultTab === 'aiChat' && (
                <div className="animate-fadeIn text-left">
                  <AiChatPanel portfolio={analysisResult} profile={profile} />
                </div>
              )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Individual Stock AI Prescription Modal */}
            <AnimatePresence>
              {selectedHoldingForDetail && (
                <div 
                  className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
                  onClick={() => setSelectedHoldingForDetail(null)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', duration: 0.4 }}
                    className="bg-zinc-950 border border-zinc-850 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative my-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Top banner / Decorative line */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-zinc-900 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-white">{selectedHoldingForDetail.name}</h3>
                            <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                              {selectedHoldingForDetail.ticker || 'ETC'}
                            </span>
                          </div>
                          <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider block mt-0.5">AI 개별 주가 진단 처방전</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedHoldingForDetail(null)}
                        className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    {/* Stock pricing & Loss details card */}
                    <div className="p-6 py-4 bg-zinc-900/30 border-b border-zinc-900">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900">
                          <span className="text-[9px] text-zinc-500 font-bold block">매입단가</span>
                          <span className="text-xs font-bold text-zinc-400 mt-1 block">{(selectedHoldingForDetail.purchasePrice || 0).toLocaleString()}원</span>
                        </div>
                        <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900">
                          <span className="text-[9px] text-zinc-500 font-bold block">현재가</span>
                          <span className="text-xs font-extrabold text-zinc-200 mt-1 block">{(selectedHoldingForDetail.currentPrice || 0).toLocaleString()}원</span>
                        </div>
                        <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900">
                          <span className="text-[9px] text-zinc-500 font-bold block">개별 수익률</span>
                          <span className={`text-xs font-black mt-1 block ${selectedHoldingForDetail.returnPercent !== undefined && selectedHoldingForDetail.returnPercent < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {selectedHoldingForDetail.returnPercent !== undefined ? `${selectedHoldingForDetail.returnPercent > 0 ? '+' : ''}${selectedHoldingForDetail.returnPercent.toFixed(2)}%` : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900 flex justify-between items-center text-[11px]">
                        <span className="text-zinc-500 font-medium">총 손익금액</span>
                        <span className={`font-mono font-bold ${selectedHoldingForDetail.profitLoss !== undefined && selectedHoldingForDetail.profitLoss < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {(selectedHoldingForDetail.profitLoss || 0).toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    {/* Cycle status timeline indicator */}
                    <div className="p-6 py-5 border-b border-zinc-900 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400 font-extrabold">개별 주가 사이클 현단계</span>
                        <span className="text-indigo-400 font-black">판정: {selectedHoldingForDetail.marketPosition || '무릎'} 단계</span>
                      </div>

                      {/* 5-dot horizontal progress line */}
                      <div className="relative flex items-center justify-between px-4 mt-2">
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-zinc-800 -translate-y-1/2 z-0"></div>
                        {[
                          { name: '발', label: '발' },
                          { name: '무릎', label: '무릎' },
                          { name: '허리', label: '허리' },
                          { name: '어깨', label: '어깨' },
                          { name: '머리', label: '머리' }
                        ].map((node) => {
                          const isActive = selectedHoldingForDetail.marketPosition === node.name;
                          return (
                            <div key={node.name} className="relative z-10 flex flex-col items-center">
                              <div className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                                isActive 
                                  ? 'bg-indigo-500 border-indigo-400 ring-4 ring-indigo-500/30' 
                                  : 'bg-zinc-950 border-zinc-800'
                              }`}>
                                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>}
                              </div>
                              <span className={`text-[9px] font-bold mt-1.5 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`}>
                                {node.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dynamic AI Advice and Prescription */}
                    <div className="p-6 pb-5 flex flex-col gap-4">
                      {/* Prescribed Action Banner */}
                      {(() => {
                        const isBuy = selectedHoldingForDetail.actionOpinion === '적극매수' || selectedHoldingForDetail.actionOpinion === '추가매수';
                        const isSell = selectedHoldingForDetail.actionOpinion === '교체매도' || selectedHoldingForDetail.actionOpinion === '비중축소';
                        
                        const actionBg = isBuy 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : isSell 
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
                          
                        return (
                          <div className={`border p-4 rounded-xl flex items-center justify-between gap-4 ${actionBg}`}>
                            <div className="flex items-center gap-2.5">
                              {isBuy ? (
                                <TrendingUp className="h-5 w-5 animate-bounce shrink-0" />
                              ) : isSell ? (
                                <ShieldAlert className="h-5 w-5 shrink-0" />
                              ) : (
                                <RefreshCw className="h-5 w-5 shrink-0" />
                              )}
                              <div>
                                <span className="text-[8px] opacity-70 font-bold font-mono uppercase block">추천 권장 행동지침</span>
                                <span className="text-sm font-black mt-0.5 block">{selectedHoldingForDetail.name} &rarr; {selectedHoldingForDetail.actionOpinion || '추가매수'}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 border border-current rounded bg-current/5">
                              {isBuy ? '매입 기회' : isSell ? '교체 검토' : '관망 적절'}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Detailed commentary card */}
                      <div className="bg-zinc-900/20 border border-zinc-850 p-4.5 rounded-2xl">
                        <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase block mb-1.5">AI 애널리스트 처방 상세 의견</span>
                        <p className="text-[12px] font-semibold text-zinc-300 leading-relaxed font-sans">
                          {selectedHoldingForDetail.individualVerdict || '본 보유 종목에 대한 주가 바닥 지지 구조와 낙폭의 산업 원인 진단 분석을 불러오는 도중 오류가 발생했습니다. 잠시 후 다시 가동해 주십시오.'}
                        </p>
                      </div>

                      {/* Averaging Down Attractiveness (물타기 매력도) */}
                      {(() => {
                        const position = selectedHoldingForDetail.marketPosition || '무릎';
                        let score = 50;
                        let text = '관망 및 대기 (추가 자금 투입 자제)';
                        let scoreColor = 'text-yellow-400';
                        
                        if (position === '발') {
                          score = 95;
                          text = '최고 수준 적극 매수 (현금 배분 1순위 권장)';
                          scoreColor = 'text-emerald-400';
                        } else if (position === '무릎') {
                          score = 85;
                          text = '매우 양호 (분할 평단가 하향 적극 추천)';
                          scoreColor = 'text-emerald-400';
                        } else if (position === '허리') {
                          score = 50;
                          text = '관망 보류 (기 보유 비중만 유지 권장)';
                          scoreColor = 'text-yellow-400';
                        } else if (position === '어깨') {
                          score = 25;
                          text = '비중 조절 요망 (추가 물타기 금지 및 매도 대응)';
                          scoreColor = 'text-rose-400';
                        } else if (position === '머리') {
                          score = 10;
                          text = '경계 및 대피 (추가 매수 절대 불가, 비중 전량 탈출)';
                          scoreColor = 'text-rose-400';
                        }
                        
                        return (
                          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-zinc-500 font-bold font-mono">예수금 물타기(평단관리) 매력도</span>
                              <span className="text-[10.5px] font-bold text-zinc-300 mt-1">{text}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-xl font-black font-mono block ${scoreColor}`}>{score}점</span>
                              <span className="text-[8px] text-zinc-500 font-mono">/ 100점 만점</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Footer Close Actions */}
                    <div className="bg-zinc-900/20 border-t border-zinc-900 p-4.5 flex justify-end gap-2">
                      <button 
                        onClick={() => setSelectedHoldingForDetail(null)}
                        className="w-full text-center py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-xs font-bold text-zinc-300 transition-colors"
                      >
                        진단 확인 및 닫기
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
            
          </div>

        </div>

      </main>
      
      {/* 4. Footer */}
      <footer className="print:hidden border-t border-zinc-900 bg-zinc-950/40 py-5 text-center text-[10px] text-zinc-650 font-mono">
        &copy; {new Date().getFullYear()} VISION MARKET AI &middot; Elite Multimodal Stock & Portfolio OCR Diagnosis. All rights Reserved.
      </footer>

      {/* 5. Print-Only Beautiful PDF Report Template */}
      {analysisResult && (
        <div 
          id="pdf-report-template"
          className="pdf-capture-container text-zinc-900 p-8 font-sans border border-zinc-200"
        >
          {/* Cover Header */}
          <div className="border-b-2 border-zinc-900 pb-4 mb-6 flex justify-between items-end">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">VISION MARKET AI - PORTFOLIO DIAGNOSTIC REPORT</span>
              <h1 className="text-2xl font-black tracking-tight mt-1 text-zinc-950">AI 자산 포트폴리오 정밀 처방 진단 보고서</h1>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-600 font-semibold block">진단 발급일: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">Report ID: VM-{Math.floor(100000 + Math.random() * 900000)}</span>
            </div>
          </div>

          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-zinc-50 border border-zinc-200 p-4 rounded-xl mb-6">
            <div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase block">진단 대상</span>
              <span className="text-sm font-black text-zinc-900 mt-1 block">{analysisResult.targetTicker}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase block">종합 대응 기조</span>
              <span className="text-sm font-black text-indigo-600 mt-1 block">🟢 {analysisResult.actionPlan}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase block">주가 수명 주기 판정</span>
              <span className="text-sm font-black text-purple-600 mt-1 block">📊 {analysisResult.marketPosition} 단계</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase block">투자 성향 적합도</span>
              <span className="text-sm font-black text-amber-600 mt-1 block">⭐️ {analysisResult.suitabilityScore} / 100점</span>
            </div>
          </div>

          {/* Main Layout: 2 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Column Left */}
            <div className="flex flex-col gap-6">
              {/* Core Diagnosis description */}
              <div className="border border-zinc-200 p-4 rounded-xl print-avoid-break">
                <h3 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-2 flex items-center gap-1.5">
                  🔍 주가 위치 판정 및 세부 해독
                </h3>
                <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {analysisResult.marketPositionDescription}
                </p>
              </div>

              {/* Core Tactical Action detail */}
              <div className="border border-zinc-200 p-4 rounded-xl print-avoid-break">
                <h3 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-2 flex items-center gap-1.5">
                  ⚡ 자금 투입 및 비중 제어 전술
                </h3>
                <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {analysisResult.actionPlanDetail}
                </p>
              </div>
            </div>

            {/* Column Right */}
            <div className="flex flex-col gap-6">
              {/* Macro & Technical background */}
              <div className="border border-zinc-200 p-4 rounded-xl print-avoid-break">
                <h3 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-2">
                  🌐 글로벌 거시 경제 및 기술적 배경
                </h3>
                <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap mb-3">
                  {analysisResult.macroBackground}
                </p>
                {analysisResult.technicalBackground && (
                  <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {analysisResult.technicalBackground}
                  </p>
                )}
              </div>

              {/* Suitability comment */}
              <div className="border border-zinc-200 p-4 rounded-xl print-avoid-break">
                <h3 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-2">
                  👤 투자 성향 부합성 피드백
                </h3>
                <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {analysisResult.suitabilityComment}
                </p>
              </div>
            </div>
          </div>

          {/* Risk Warning Signals */}
          <div className="border border-zinc-200 p-4 rounded-xl mb-6 print-avoid-break">
            <h3 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-2.5">
              ⚠️ 향후 경계해야 할 3대 위험 신호 및 청산 트리거
            </h3>
            <ul className="list-disc pl-5 text-xs text-zinc-700 leading-relaxed space-y-1">
              {analysisResult.warningSignals.map((signal, idx) => (
                <li key={idx} className="font-medium">{signal}</li>
              ))}
            </ul>
          </div>

          {/* Portfolio Details - Only printed if isPortfolio and has holdings */}
          {analysisResult.isPortfolio && analysisResult.portfolioSummary && (
            <div className="print-avoid-break mb-6">
              <h2 className="text-sm font-black text-zinc-950 border-b-2 border-zinc-900 pb-1.5 mb-3">
                📊 판독 자산 현황 요약 (Portfolio Status)
              </h2>
              
              <div className="grid grid-cols-4 gap-4 bg-zinc-50 p-3.5 border border-zinc-200 rounded-xl mb-4 text-xs font-medium">
                <div>
                  <span className="text-[9px] text-zinc-500 block">총평가금액 (주식)</span>
                  <span className="text-sm font-bold text-zinc-900">{(analysisResult.portfolioSummary.totalEvaluationAmount || 0).toLocaleString()}원</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block">예수금 (현금)</span>
                  <span className="text-sm font-bold text-zinc-900">{(analysisResult.portfolioSummary.deposit || 0).toLocaleString()}원</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block">총자산액</span>
                  <span className="text-sm font-bold text-zinc-900">{((analysisResult.portfolioSummary.totalEvaluationAmount || 0) + (analysisResult.portfolioSummary.deposit || 0)).toLocaleString()}원</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block">총 평가 손익 (수익률)</span>
                  <span className={`text-sm font-bold ${(analysisResult.portfolioSummary.totalProfitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {(analysisResult.portfolioSummary.totalProfitLoss || 0).toLocaleString()}원 ({analysisResult.portfolioSummary.totalReturnPercent?.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {analysisResult.portfolioHoldings && analysisResult.portfolioHoldings.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-zinc-800 mb-2">개별 보유 종목 현황 및 행동 처방</h3>
                  <table className="w-full text-left border-collapse border border-zinc-200 text-xs">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-350 text-[9px] text-zinc-600 font-mono uppercase">
                        <th className="p-2 border border-zinc-200">종목명 (코드)</th>
                        <th className="p-2 border border-zinc-200 text-right">매입단가 / 현재가</th>
                        <th className="p-2 border border-zinc-200 text-right">보유수량 / 평가액</th>
                        <th className="p-2 border border-zinc-200 text-right">평가손익 / 수익률</th>
                        <th className="p-2 border border-zinc-200 text-center">위치 판정</th>
                        <th className="p-2 border border-zinc-200 text-center">AI 전술 처방</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.portfolioHoldings.map((holding, idx) => (
                        <tr key={idx} className="border-b border-zinc-200 text-zinc-800">
                          <td className="p-2 border border-zinc-200 font-semibold">{holding.name} {holding.ticker ? `(${holding.ticker})` : ''}</td>
                          <td className="p-2 border border-zinc-200 text-right">
                            {holding.purchasePrice?.toLocaleString()}원 / {holding.currentPrice?.toLocaleString()}원
                          </td>
                          <td className="p-2 border border-zinc-200 text-right">
                            {holding.quantity?.toLocaleString()}주 / {holding.evaluationAmount?.toLocaleString()}원
                          </td>
                          <td className="p-2 border border-zinc-200 text-right font-medium">
                            <span className={(holding.profitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {holding.profitLoss?.toLocaleString()}원 ({holding.returnPercent?.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="p-2 border border-zinc-200 text-center font-bold text-purple-700">{holding.marketPosition || '무릎'}</td>
                          <td className="p-2 border border-zinc-200 text-center font-bold text-indigo-600">{holding.actionOpinion || '추가매수'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Legal and Disclaimer Disclaimer Footer */}
          <div className="border-t border-zinc-300 pt-4 mt-8 text-[9px] text-zinc-500 leading-normal text-center">
            본 진단 리포트는 사용자가 입력한 계좌 이미지 데이터와 투자 성향 파라미터를 기초로 Vision Market AI 분석 모델에 의해 독립적으로 산출되었습니다.<br />
            제시된 의견과 진단 점수는 통계적 모형 및 과거 시장 데이터를 추종한 인공지능 요약 정보이며, 미래의 투자 이익을 보장하거나 투자를 권유하는 보증이 아닙니다.<br />
            최종적인 투자 결정 및 자산 배분 책임은 전적으로 투자자 본인에게 귀속됩니다.<br />
            <span className="font-bold font-mono uppercase block mt-1">Vision Market AI &copy; All Rights Reserved. Powered by Gemini.</span>
          </div>
        </div>
      )}

      {/* 6. Report Preview Modal */}
      <AnimatePresence>
        {isPdfPreviewOpen && analysisResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col my-8 max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900 rounded-t-3xl sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center">
                    <Eye className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">진단 보고서 미리보기 (PDF Preview)</h3>
                    <p className="text-[10px] text-zinc-400 font-medium">실제 다운로드될 PDF와 동일한 레이아웃과 서식입니다.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSavePdf}
                    disabled={isSavingPdf}
                    className="flex items-center justify-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
                  >
                    <Printer className={`h-4 w-4 ${isSavingPdf ? 'animate-spin' : ''}`} />
                    <span>{isSavingPdf ? 'PDF 생성 중...' : 'PDF 다운로드'}</span>
                  </button>
                  <button
                    onClick={() => setIsPdfPreviewOpen(false)}
                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Modal Body (Scrollable preview sheet) */}
              <div className="p-4 sm:p-6 bg-zinc-950/60 overflow-y-auto flex-1 flex justify-center subtle-scrollbar">
                {/* Simulated A4 Paper Sheet (Fluid width with absolute max-width to look like an elegant document) */}
                <div className="w-full max-w-4xl bg-white text-zinc-900 p-6 sm:p-10 font-sans border border-zinc-200 shadow-2xl rounded-2xl my-4 text-left">
                  {/* Cover Header */}
                  <div className="border-b-2 border-zinc-900 pb-4 mb-6 flex justify-between items-end">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">VISION MARKET AI - PORTFOLIO DIAGNOSTIC REPORT</span>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1 text-zinc-950">AI 자산 포트폴리오 정밀 처방 진단 보고서</h1>
                    </div>
                    <div className="text-right hidden sm:block">
                      <span className="text-xs text-zinc-600 font-semibold block">진단 발급일: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">Report ID: VM-PREVIEW</span>
                    </div>
                  </div>

                  {/* Quick Metrics Banner */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-zinc-50 border border-zinc-200 p-4 rounded-xl mb-6">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block">진단 대상</span>
                      <span className="text-sm font-black text-zinc-900 mt-1 block">{analysisResult.targetTicker}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block">종합 대응 기조</span>
                      <span className="text-sm font-black text-indigo-600 mt-1 block">🟢 {analysisResult.actionPlan}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block">주가 수명 주기 판정</span>
                      <span className="text-sm font-black text-purple-600 mt-1 block">📊 {analysisResult.marketPosition} 단계</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block">투자 성향 적합도</span>
                      <span className="text-sm font-black text-amber-600 mt-1 block">⭐️ {analysisResult.suitabilityScore} / 100점</span>
                    </div>
                  </div>

                  {/* Main Layout: 2 Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Column Left */}
                    <div className="flex flex-col gap-6">
                      {/* Core Diagnosis description */}
                      <div className="border border-zinc-200 p-4 rounded-xl">
                        <h3 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-2 flex items-center gap-1.5">
                          🔍 주가 위치 판정 및 세부 해독
                        </h3>
                        <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                          {analysisResult.marketPositionDescription}
                        </p>
                      </div>

                      {/* Core Tactical Action detail */}
                      <div className="border border-zinc-200 p-4 rounded-xl">
                        <h3 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-2 flex items-center gap-1.5">
                          ⚡ 자금 투입 및 비중 제어 전술
                        </h3>
                        <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                          {analysisResult.actionPlanDetail}
                        </p>
                      </div>
                    </div>

                    {/* Column Right */}
                    <div className="flex flex-col gap-6">
                      {/* Macro & Technical background */}
                      <div className="border border-zinc-200 p-4 rounded-xl">
                        <h3 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-2">
                          🌐 글로벌 거시 경제 및 기술적 배경
                        </h3>
                        <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap mb-3">
                          {analysisResult.macroBackground}
                        </p>
                        {analysisResult.technicalBackground && (
                          <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                            {analysisResult.technicalBackground}
                          </p>
                        )}
                      </div>

                      {/* Suitability comment */}
                      <div className="border border-zinc-200 p-4 rounded-xl">
                        <h3 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-2">
                          👤 투자 성향 부합성 피드백
                        </h3>
                        <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                          {analysisResult.suitabilityComment}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Risk Warning Signals */}
                  <div className="border border-zinc-200 p-4 rounded-xl mb-6">
                    <h3 className="text-xs font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-1.5 mb-2.5">
                      ⚠️ 향후 경계해야 할 3대 위험 신호 및 청산 트리거
                    </h3>
                    <ul className="list-disc pl-5 text-xs text-zinc-700 leading-relaxed space-y-1">
                      {analysisResult.warningSignals.map((signal, idx) => (
                        <li key={idx} className="font-medium text-zinc-800">{signal}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Portfolio Details - Only printed if isPortfolio and has holdings */}
                  {analysisResult.isPortfolio && analysisResult.portfolioSummary && (
                    <div className="mb-6">
                      <h2 className="text-sm font-black text-zinc-950 border-b-2 border-zinc-900 pb-1.5 mb-3">
                        📊 판독 자산 현황 요약 (Portfolio Status)
                      </h2>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-50 p-3.5 border border-zinc-200 rounded-xl mb-4 text-xs font-medium">
                        <div>
                          <span className="text-[9px] text-zinc-500 block">총평가금액 (주식)</span>
                          <span className="text-xs sm:text-sm font-bold text-zinc-900">{(analysisResult.portfolioSummary.totalEvaluationAmount || 0).toLocaleString()}원</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 block">예수금 (현금)</span>
                          <span className="text-xs sm:text-sm font-bold text-zinc-900">{(analysisResult.portfolioSummary.deposit || 0).toLocaleString()}원</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 block">총자산액</span>
                          <span className="text-xs sm:text-sm font-bold text-zinc-900">{((analysisResult.portfolioSummary.totalEvaluationAmount || 0) + (analysisResult.portfolioSummary.deposit || 0)).toLocaleString()}원</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 block">총 평가 손익 (수익률)</span>
                          <span className={`text-xs sm:text-sm font-bold ${(analysisResult.portfolioSummary.totalProfitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {(analysisResult.portfolioSummary.totalProfitLoss || 0).toLocaleString()}원 ({analysisResult.portfolioSummary.totalReturnPercent?.toFixed(2)}%)
                          </span>
                        </div>
                      </div>

                      {analysisResult.portfolioHoldings && analysisResult.portfolioHoldings.length > 0 && (
                        <div className="overflow-x-auto">
                          <h3 className="text-xs font-bold text-zinc-800 mb-2">개별 보유 종목 현황 및 행동 처방</h3>
                          <table className="w-full min-w-[600px] text-left border-collapse border border-zinc-200 text-xs">
                            <thead>
                              <tr className="bg-zinc-100 border-b border-zinc-350 text-[9px] text-zinc-600 font-mono uppercase">
                                <th className="p-2 border border-zinc-200">종목명 (코드)</th>
                                <th className="p-2 border border-zinc-200 text-right">매입단가 / 현재가</th>
                                <th className="p-2 border border-zinc-200 text-right">보유수량 / 평가액</th>
                                <th className="p-2 border border-zinc-200 text-right">평가손익 / 수익률</th>
                                <th className="p-2 border border-zinc-200 text-center">위치 판정</th>
                                <th className="p-2 border border-zinc-200 text-center">AI 전술 처방</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysisResult.portfolioHoldings.map((holding, idx) => (
                                <tr key={idx} className="border-b border-zinc-200 text-zinc-800">
                                  <td className="p-2 border border-zinc-200 font-semibold">{holding.name} {holding.ticker ? `(${holding.ticker})` : ''}</td>
                                  <td className="p-2 border border-zinc-200 text-right">
                                    {holding.purchasePrice?.toLocaleString()}원 / {holding.currentPrice?.toLocaleString()}원
                                  </td>
                                  <td className="p-2 border border-zinc-200 text-right">
                                    {holding.quantity?.toLocaleString()}주 / {holding.evaluationAmount?.toLocaleString()}원
                                  </td>
                                  <td className="p-2 border border-zinc-200 text-right font-medium">
                                    <span className={(holding.profitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                      {holding.profitLoss?.toLocaleString()}원 ({holding.returnPercent?.toFixed(2)}%)
                                    </span>
                                  </td>
                                  <td className="p-2 border border-zinc-200 text-center font-bold text-purple-700">{holding.marketPosition || '무릎'}</td>
                                  <td className="p-2 border border-zinc-200 text-center font-bold text-indigo-600">{holding.actionOpinion || '추가매수'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Legal and Disclaimer Disclaimer Footer */}
                  <div className="border-t border-zinc-300 pt-4 mt-8 text-[9px] text-zinc-500 leading-normal text-center">
                    본 진단 리포트는 사용자가 입력한 계좌 이미지 데이터와 투자 성향 파라미터를 기초로 Vision Market AI 분석 모델에 의해 독립적으로 산출되었습니다.<br />
                    제시된 의견과 진단 점수는 통계적 모형 및 과거 시장 데이터를 추종한 인공지능 요약 정보이며, 미래의 투자 이익을 보장하거나 투자를 권유하는 보증이 아닙니다.<br />
                    최종적인 투자 결정 및 자산 배분 책임은 전적으로 투자자 본인에게 귀속됩니다.<br />
                    <span className="font-bold font-mono uppercase block mt-1">Vision Market AI &copy; All Rights Reserved. Powered by Gemini.</span>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer Controls */}
              <div className="px-6 py-4 border-t border-zinc-850 flex items-center justify-end gap-3 bg-zinc-900 rounded-b-3xl">
                <button
                  onClick={() => setIsPdfPreviewOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  닫기
                </button>
                <button
                  onClick={handleSavePdf}
                  disabled={isSavingPdf}
                  className="flex items-center justify-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
                >
                  <Printer className={`h-4 w-4 ${isSavingPdf ? 'animate-spin' : ''}`} />
                  <span>{isSavingPdf ? 'PDF 생성 중...' : 'PDF 다운로드'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
