import { Stock, Candle, DiscussionPost, MarketTheme, AiAnalysisReport } from '../types';

// Helper to determine Knee-Shoulder Status based on current price relative to 52-week range
export function getKneeShoulderStatus(price: number, low: number, high: number): {
  index: number;
  status: 'FOOT' | 'KNEE' | 'WAIST' | 'SHOULDER' | 'HEAD';
} {
  const index = Math.round(((price - low) / (high - low)) * 100);
  let status: 'FOOT' | 'KNEE' | 'WAIST' | 'SHOULDER' | 'HEAD' = 'WAIST';
  if (index <= 20) status = 'FOOT';
  else if (index <= 40) status = 'KNEE';
  else if (index <= 70) status = 'WAIST';
  else if (index <= 90) status = 'SHOULDER';
  else status = 'HEAD';
  
  return { index, status };
}

// Initial Stocks Definition (Standard Realistic Values)
export const INITIAL_STOCKS: Stock[] = [
  {
    symbol: '009150',
    name: '삼성전기',
    nameEn: 'Samsung Electro-Mechanics',
    price: 154700,
    prevClose: 153300,
    change: 1400,
    changePercent: 0.91,
    high52Week: 178000,
    low52Week: 120000,
    volume: 180000,
    marketCap: '5조 9800억원',
    peRatio: 14.5,
    rsi: 41,
    ma20: 151000,
    description: '전자기기에 탑재되는 수동부품인 MLCC, 인쇄회로기판 및 카메라 모듈을 생산하는 삼성그룹의 전자부품 전문 기업입니다.',
    kneeShoulderIndex: 54,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '000660',
    name: 'SK하이닉스 (Nx대체)',
    nameEn: 'SK hynix',
    price: 216200,
    prevClose: 210100,
    change: 6100,
    changePercent: 2.90,
    high52Week: 245000,
    low52Week: 110000,
    volume: 2450000,
    marketCap: '157조원',
    peRatio: 18.2,
    rsi: 65,
    ma20: 211000,
    description: '글로벌 초고성능 메모리 반도체 전문 생산 기업입니다. AI 연산용 HBM 및 고사양 DDR5 수요 수혜를 입고 있습니다.',
    kneeShoulderIndex: 78,
    kneeShoulderStatus: 'SHOULDER'
  },
  {
    symbol: '015710',
    name: '코콤',
    nameEn: 'Kocom',
    price: 3015,
    prevClose: 2990,
    change: 25,
    changePercent: 0.84,
    high52Week: 4500,
    low52Week: 2500,
    volume: 120000,
    marketCap: '520억원',
    peRatio: 12.1,
    rsi: 48,
    ma20: 2950,
    description: '스마트홈 시스템, 비디오폰, 인터폰 및 CCTV 등을 공급하는 홈네트워크 솔루션 및 보안 전문 제조 회사입니다.',
    kneeShoulderIndex: 25,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '034220',
    name: 'LG디스플레이',
    nameEn: 'LG Display',
    price: 13900,
    prevClose: 12850,
    change: 1050,
    changePercent: 8.17,
    high52Week: 18000,
    low52Week: 9500,
    volume: 1320000,
    marketCap: '5조 2,300억원',
    peRatio: 15.0,
    rsi: 62,
    ma20: 13100,
    description: '글로벌 OLED 및 디스플레이 핵심 패널 제조 최상위 전문 기업입니다.',
    kneeShoulderIndex: 51,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '322000',
    name: 'HD현대에너지솔루션',
    nameEn: 'HD Hyundai Energy Solutions',
    price: 26200,
    prevClose: 25400,
    change: 800,
    changePercent: 3.15,
    high52Week: 38000,
    low52Week: 19000,
    volume: 58000,
    marketCap: '2,100억원',
    peRatio: 16.8,
    rsi: 44,
    ma20: 25900,
    description: '태양광 모듈, 셀 및 친환경 에너지 종합 제어 솔루션을 영위하는 현대중공업 계열 에너지 기업입니다.',
    kneeShoulderIndex: 36,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '112610',
    name: '씨에스윈드',
    nameEn: 'CS Wind',
    price: 42100,
    prevClose: 40550,
    change: 1550,
    changePercent: 3.82,
    high52Week: 65000,
    low52Week: 32000,
    volume: 124000,
    marketCap: '1조 7,800억원',
    peRatio: 22.4,
    rsi: 54,
    ma20: 39800,
    description: '풍력발전 타워 글로벌 1위 공급업체로서 미국 및 유럽 시장 내 재생에너지 정책 인센티브 수혜를 영위합니다.',
    kneeShoulderIndex: 30,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '382900',
    name: '범한퓨얼셀',
    nameEn: 'Bumhan Fuel Cell',
    price: 27850,
    prevClose: 26250,
    change: 1600,
    changePercent: 6.10,
    high52Week: 39000,
    low52Week: 19000,
    volume: 68000,
    marketCap: '2,600억원',
    peRatio: -12.4,
    rsi: 59,
    ma20: 25900,
    description: '잠수함 및 선박용 수소 연료 전지, 수소 충전소 시공 전문 첨단 탄소 제로 에너지 솔루션 선도 메이커입니다.',
    kneeShoulderIndex: 44,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '336260',
    name: '두산퓨얼셀',
    nameEn: 'Doosan Fuel Cell',
    price: 75800,
    prevClose: 70500,
    change: 5300,
    changePercent: 7.52,
    high52Week: 110000,
    low52Week: 48000,
    volume: 240000,
    marketCap: '4조 9,200억원',
    peRatio: 45.2,
    rsi: 61,
    ma20: 71200,
    description: '발전용 연료전지 시장 독점 기업으로서 저탄소 친환경 수소 발전 의무 제도 수혜 가치가 누적되고 있습니다.',
    kneeShoulderIndex: 44,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '018880',
    name: '한온시스템',
    nameEn: 'Hanon Systems',
    price: 4700,
    prevClose: 4230,
    change: 470,
    changePercent: 11.11,
    high52Week: 7500,
    low52Week: 3500,
    volume: 1850000,
    marketCap: '2조 5,100억원',
    peRatio: 14.2,
    rsi: 74,
    ma20: 4320,
    description: '자동차 열관리 시스템 부문 글로벌 2위 공급업체로서 전기차 열관리 비중 다변화 전환 결실을 확보 중입니다.',
    kneeShoulderIndex: 30,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '002230',
    name: '피에스텍',
    nameEn: 'PSTech',
    price: 7860,
    prevClose: 7810,
    change: 50,
    changePercent: 0.64,
    high52Week: 11000,
    low52Week: 5200,
    volume: 41000,
    marketCap: '780억원',
    peRatio: 9.8,
    rsi: 46,
    ma20: 7720,
    description: '정밀 전력 제어 미터 및 무선 원격 검침 스마트 가전 부품을 정밀 제조 납품하는 견실한 우량 중소기업입니다.',
    kneeShoulderIndex: 45,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '277810',
    name: '레인보우로보틱스',
    nameEn: 'Rainbow Robotics',
    price: 158000,
    prevClose: 151000,
    change: 7000,
    changePercent: 4.64,
    high52Week: 215000,
    low52Week: 120000,
    volume: 180000,
    marketCap: '3조 5,800억원',
    peRatio: 45.2,
    rsi: 58,
    ma20: 152100,
    description: '이족보행 로봇 및 협동 로봇 제조 부문 국내 최고 핵심 기구 설계 원천 기술을 개발·보유하고 있으며 삼성전자의 전략적 파트너쉽 투자 유치 수혜주입니다.',
    kneeShoulderIndex: 45,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '322180',
    name: 'LS티라유텍',
    nameEn: 'LS TiraUtech',
    price: 5450,
    prevClose: 5260,
    change: 190,
    changePercent: 3.61,
    high52Week: 8200,
    low52Week: 3100,
    volume: 120000,
    marketCap: '1,120억원',
    peRatio: 35.0,
    rsi: 52,
    ma20: 5120,
    description: '스마트 팩토리 시공 소프트웨어 및 자율 이동 물류 로봇 통합 제어 엔진 공급 사업을 전개하고 있습니다.',
    kneeShoulderIndex: 46,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '009830',
    name: '한화솔루션',
    nameEn: 'Hanwha Solutions',
    price: 37100,
    prevClose: 36950,
    change: 150,
    changePercent: 0.41,
    high52Week: 58000,
    low52Week: 25000,
    volume: 210000,
    marketCap: '6조 4,100억원',
    peRatio: 12.8,
    rsi: 48,
    ma20: 36800,
    description: '태양광 셀, 화학 소재, 고기능 콤팩트 태양광 모듈 메이저 공장 투자를 미국의 핵심 축으로 적극 전개하는 화학/에너지 지주사 격 기업입니다.',
    kneeShoulderIndex: 36,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '042660',
    name: '한화오션',
    nameEn: 'Hanwha Ocean',
    price: 113200,
    prevClose: 104500,
    change: 8700,
    changePercent: 8.33,
    high52Week: 155000,
    low52Week: 62000,
    volume: 850000,
    marketCap: '11조원',
    peRatio: 33.5,
    rsi: 61,
    ma20: 106000,
    description: '액화천연가스(LNG) 운반선 및 군함 특수 전함 납품에서 세계적 독보적 조선 경쟁 역량을 구축한 한화 계열 종합 조선소입니다.',
    kneeShoulderIndex: 55,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '108490',
    name: '로보티즈',
    nameEn: 'Robotis',
    price: 18900,
    prevClose: 18500,
    change: 400,
    changePercent: 2.16,
    high52Week: 35000,
    low52Week: 16000,
    volume: 135000,
    marketCap: '2,200억원',
    peRatio: 14.8,
    rsi: 52,
    ma20: 18280,
    description: '실외 자율주행 서비스 로봇 및 로봇 기구 제어용 감속기 솔루션을 전문 생산 공급하는 유망 미래 지능 로봇 전문 기업입니다.',
    kneeShoulderIndex: 38,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '117730',
    name: '티로보틱스',
    nameEn: 'T-Robotics',
    price: 16890,
    prevClose: 15710,
    change: 1180,
    changePercent: 7.51,
    high52Week: 26000,
    low52Week: 11000,
    volume: 450000,
    marketCap: '2,800억원',
    peRatio: -18.2,
    rsi: 63,
    ma20: 15800,
    description: '진공 OLED 이송용 초대형 로봇 시스템 글로벌 독점 및 자율 이동 물류 카트 제조 공장을 보유하고 있습니다.',
    kneeShoulderIndex: 39,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '272290',
    name: '이녹스첨단소재',
    nameEn: 'Innox Advanced Materials',
    price: 28950,
    prevClose: 27950,
    change: 1000,
    changePercent: 3.58,
    high52Week: 42000,
    low52Week: 19000,
    volume: 110000,
    marketCap: '5,800억원',
    peRatio: 11.2,
    rsi: 50,
    ma20: 28100,
    description: '글로벌 디스플레이용 OLED 봉지 필름 및 연성인쇄회로기판(FPCB) 원재료 시장 점유율 상위의 우량 IT 소재 기업입니다.',
    kneeShoulderIndex: 43,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '035720',
    name: '카카오',
    nameEn: 'Kakao Corp',
    price: 40900,
    prevClose: 39300,
    change: 1600,
    changePercent: 4.07,
    high52Week: 65000,
    low52Week: 31000,
    volume: 1240000,
    marketCap: '18조원',
    peRatio: 26.5,
    rsi: 48,
    ma20: 39500,
    description: '국민 모바일 메신저 카카오톡을 축으로 쇼핑, 금융, 모빌리티, 콘텐츠 생태계를 원스톱으로 제공하는 IT 플랫폼 홀더입니다.',
    kneeShoulderIndex: 29,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '058850',
    name: 'KTcs',
    nameEn: 'KTcs Corp',
    price: 2420,
    prevClose: 2355,
    change: 65,
    changePercent: 2.76,
    high52Week: 3800,
    low52Week: 1800,
    volume: 85000,
    marketCap: '1,020억원',
    peRatio: 8.5,
    rsi: 54,
    ma20: 2370,
    description: 'KT 그룹의 고객센터 콜시스템 조작 운용 및 맞춤형 종합 모바일 유통 채널 통합 인프라를 대리 영위합니다.',
    kneeShoulderIndex: 31,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '041440',
    name: '현대에버다임',
    nameEn: 'Hyundai Everdigm',
    price: 8120,
    prevClose: 7590,
    change: 530,
    changePercent: 6.98,
    high52Week: 12000,
    low52Week: 5100,
    volume: 175000,
    marketCap: '1,450억원',
    peRatio: 12.0,
    rsi: 61,
    ma20: 7650,
    description: '콘크리트 펌프트럭, 소방 구난 전차, 락 드릴 등 세계 80여국에 재난 구역 건설 중장비를 공급하는 현대백화점 그륩 인프라 핵심 기업입니다.',
    kneeShoulderIndex: 43,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '160980',
    name: '싸이맥스',
    nameEn: 'Cymax',
    price: 46500,
    prevClose: 43550,
    change: 2950,
    changePercent: 6.77,
    high52Week: 68000,
    low52Week: 28000,
    volume: 104000,
    marketCap: '4,850억원',
    peRatio: 14.2,
    rsi: 59,
    ma20: 44100,
    description: '반도체 공정 장비용 고기능성 진공 로봇 이송 시스템 및 모듈을 글로벌 고객에 수송 제작하는 스마트 조작 가공회사입니다.',
    kneeShoulderIndex: 46,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '092070',
    name: '디엔에프',
    nameEn: 'DNF Co Ltd',
    price: 18430,
    prevClose: 17350,
    change: 1080,
    changePercent: 6.22,
    high52Week: 29000,
    low52Week: 12000,
    volume: 68000,
    marketCap: '2,100억원',
    peRatio: 15.6,
    rsi: 55,
    ma20: 17500,
    description: '반도체 ALD/CVD 공정용 핵심 고부가가치 전구체(Precursor) 미세 박막 형성 화학 원재료 주력 국산 대표 기업입니다.',
    kneeShoulderIndex: 37,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '211270',
    name: 'AP위성',
    nameEn: 'AP Satellite',
    price: 12260,
    prevClose: 12590,
    change: -330,
    changePercent: -2.62,
    high52Week: 21000,
    low52Week: 9500,
    volume: 132000,
    marketCap: '1,850억원',
    peRatio: 36.5,
    rsi: 41,
    ma20: 12600,
    description: '위성 단말 원천 모뎀 칩, 차세대 위성 본체 및 탑재체 정밀 모바일 통신 장치를 제작 수송하는 하이테크 방산 우주 항공 테마주입니다.',
    kneeShoulderIndex: 24,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '022100',
    name: '포스코DX',
    nameEn: 'POSCO DX',
    price: 27800,
    prevClose: 27100,
    change: 700,
    changePercent: 2.58,
    high52Week: 45000,
    low52Week: 19000,
    volume: 580000,
    marketCap: '4조 2,300억원',
    peRatio: 28.5,
    rsi: 54,
    ma20: 27100,
    description: '포스코 그룹의 철강제련 고도 스마트 팩토리 제어 소프트웨어, AI 시공 솔루션 및 로봇 대량 자동화를 제공하는 엔지니어링 지주사입니다.',
    kneeShoulderIndex: 33,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '049070',
    name: '인탑스',
    nameEn: 'Intops Co Ltd',
    price: 19320,
    prevClose: 18200,
    change: 1120,
    changePercent: 6.15,
    high52Week: 32000,
    low52Week: 14000,
    volume: 145000,
    marketCap: '3,100억원',
    peRatio: 10.4,
    rsi: 57,
    ma20: 18400,
    description: '모바일기기 플라스틱 케이스 정밀 사출 및 최근 지능형 서빙 물류 로봇 하드웨어 위탁 조립 양산을 전방위화 하였습니다.',
    kneeShoulderIndex: 29,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '232140',
    name: '와이씨',
    nameEn: 'YC',
    price: 16320,
    prevClose: 14420,
    change: 1900,
    changePercent: 13.18,
    high52Week: 22000,
    low52Week: 8500,
    volume: 245000,
    marketCap: '2,950억원',
    peRatio: 37.8,
    rsi: 69,
    ma20: 14800,
    description: '반도체 EDS 테스트 프로브카드용 고기능성 세라믹 다층 기판 및 고속 칩 검사용 인터페이스 세라믹 부품을 특화 가공해 독과점 공급하는 선도 IT 세라믹 공장입니다.',
    kneeShoulderIndex: 57,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '443060',
    name: 'HD현대마린솔루션',
    nameEn: 'HD Hyundai Marine Solutions',
    price: 245500,
    prevClose: 245500,
    change: 0,
    changePercent: 0.00,
    high52Week: 380000,
    low52Week: 150000,
    volume: 58000,
    marketCap: '10조 8,900억원',
    peRatio: 24.2,
    rsi: 48,
    ma20: 245000,
    description: '친환경 가스 연료 전력선 개조 기술 및 글로벌 전방 선박 부품 애프터마켓 라이프사이클 솔루션을 통제하는 HD현대 그룹 산하 핵심사입니다.',
    kneeShoulderIndex: 41,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '439090',
    name: '마녀공장',
    nameEn: 'Manyo Co Ltd',
    price: 14390,
    prevClose: 14090,
    change: 300,
    changePercent: 2.13,
    high52Week: 24500,
    low52Week: 11000,
    volume: 120000,
    marketCap: '2,350억원',
    peRatio: 15.6,
    rsi: 49,
    ma20: 14100,
    description: '천연 비건 스킨케어 화장품 브랜드를 필두로 북미 및 일본 드럭스토어 체인망 대량 입점 가시화를 누적하는 화장품 수출 대표주입니다.',
    kneeShoulderIndex: 25,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '005930',
    name: '삼성전자 (Nx대체)',
    nameEn: 'Samsung Electronics',
    price: 78200,
    prevClose: 77500,
    change: 700,
    changePercent: 0.90,
    high52Week: 88000,
    low52Week: 65100,
    volume: 15200000,
    marketCap: '480조원',
    peRatio: 18.2,
    rsi: 61,
    ma20: 76800,
    description: '대한민국을 대표하는 글로벌 반도체 및 모바일 디바이스 제조 기업입니다. 무릎 이하 구간 저평가를 탈출해 가파르게 반상 중입니다.',
    kneeShoulderIndex: 51,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '035420',
    name: 'NAVER',
    nameEn: 'NAVER Corp',
    price: 242500,
    prevClose: 224000,
    change: 18500,
    changePercent: 8.26,
    high52Week: 310000,
    low52Week: 150000,
    volume: 980000,
    marketCap: '39조원',
    peRatio: 19.5,
    rsi: 58,
    ma20: 228000,
    description: '인공지능 하이퍼클로바X 생성 엔진 탑재 검색, 인터넷 포털 서비스 1위 및 이커머스 금융 지주사를 통제하는 국가 IT 플랫폼입니다.',
    kneeShoulderIndex: 57,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '460930',
    name: '현대힘스',
    nameEn: 'Hyundai Hyms',
    price: 14180,
    prevClose: 13310,
    change: 870,
    changePercent: 6.54,
    high52Week: 22000,
    low52Week: 9500,
    volume: 110000,
    marketCap: '4,850억원',
    peRatio: 14.0,
    rsi: 53,
    ma20: 13600,
    description: '조선 블록 수송, 친환경 이중연료 기성 선박 배관 설계 정밀 시공으로 조선 대호황기 모멘텀에 결실을 올리는 협력 제조사입니다.',
    kneeShoulderIndex: 37,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '071670',
    name: '에이테크솔루션',
    nameEn: 'A-Tech Solution',
    price: 6300,
    prevClose: 5920,
    change: 380,
    changePercent: 6.42,
    high52Week: 11000,
    low52Week: 4800,
    volume: 85000,
    marketCap: '630억원',
    peRatio: 11.5,
    rsi: 56,
    ma20: 6010,
    description: '삼성전자 핵심 금형 협력사이자 정밀 라이다 자율주행 광학용 하우징 전장부품 신기술을 제작 납품 중인 로봇 기술 보유주입니다.',
    kneeShoulderIndex: 24,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '065350',
    name: '신성델타테크',
    nameEn: 'Shinsung Delta Tech',
    price: 41450,
    prevClose: 40250,
    change: 1200,
    changePercent: 2.98,
    high52Week: 68000,
    low52Week: 18500,
    volume: 450000,
    marketCap: '1조 1,200억원',
    peRatio: 37.5,
    rsi: 51,
    ma20: 40500,
    description: '전기 차량 배터리 방열 전력 플레이트 기구 사출 가공 및 가전 모듈 공급 기업입니다. 에너지 전도도 특이 소재 테마 자리를 확보 중입니다.',
    kneeShoulderIndex: 46,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '001250',
    name: 'GS글로벌',
    nameEn: 'GS Global',
    price: 2980,
    prevClose: 2835,
    change: 145,
    changePercent: 5.11,
    high52Week: 4500,
    low52Week: 2100,
    volume: 580000,
    marketCap: '2,500억원',
    peRatio: 7.2,
    rsi: 62,
    ma20: 2840,
    description: '석탄 에너지 자원 및 바이오매스 원자재, 차량 수입 위탁 통관 및 조립 대행을 전개하는 GS 자원 무역 법인입니다.',
    kneeShoulderIndex: 36,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '037560',
    name: 'LG헬로비전',
    nameEn: 'LG HelloVision',
    price: 2190,
    prevClose: 2210,
    change: -20,
    changePercent: -0.90,
    high52Week: 3500,
    low52Week: 1700,
    volume: 124000,
    marketCap: '1,680억원',
    peRatio: -15.4,
    rsi: 38,
    ma20: 2240,
    description: '종합 케이블 TV 방송망 연동, 초고속 이더넷 모바일 통신 및 지역 맞춤 렌탈 인수를 운영하는 통신 대표사입니다.',
    kneeShoulderIndex: 27,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '101170',
    name: '우림피티에스',
    nameEn: 'Woorim PTS',
    price: 9830,
    prevClose: 9360,
    change: 470,
    changePercent: 5.02,
    high52Week: 16500,
    low52Week: 6200,
    volume: 85000,
    marketCap: '1,320억원',
    peRatio: 13.8,
    rsi: 58,
    ma20: 9410,
    description: '대형 굴착기, 산업용 감속기, 에너지 발전 수력 터빈 기어 모듈 및 특수 지상 자율 방산 로봇용 감속기를 납품 공급하는 알짜 기계제조업체입니다.',
    kneeShoulderIndex: 35,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '189300',
    name: '인텔리안테크',
    nameEn: 'Intellian Technologies',
    price: 106400,
    prevClose: 104000,
    change: 2400,
    changePercent: 2.31,
    high52Week: 165000,
    low52Week: 72000,
    volume: 132000,
    marketCap: '1조원',
    peRatio: 42.5,
    rsi: 51,
    ma20: 104500,
    description: '글로벌 초저궤도 위성 통신용 전동 안테나 시장 1위 리더로서 해상 및 육상 단말 시장에 하이테크 통신망을 지배 공급합니다.',
    kneeShoulderIndex: 36,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '383800',
    name: 'LX홀딩스',
    nameEn: 'LX Holdings',
    price: 8120,
    prevClose: 7890,
    change: 230,
    changePercent: 2.92,
    high52Week: 13000,
    low52Week: 6200,
    volume: 85000,
    marketCap: '6,200억원',
    peRatio: 6.8,
    rsi: 48,
    ma20: 7950,
    description: 'LX인터내셔널, 하우시스, 세미콘 등 탄탄한 가치 소재 부품 및 트레이딩 자회사를 총괄 제어 통제하는 순수 지주회사입니다.',
    kneeShoulderIndex: 28,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '089470',
    name: 'HDC현대EP',
    nameEn: 'HDC Hyundai EP',
    price: 4060,
    prevClose: 4015,
    change: 45,
    changePercent: 1.12,
    high52Week: 6800,
    low52Week: 3100,
    volume: 41000,
    marketCap: '1,630억원',
    peRatio: 8.4,
    rsi: 45,
    ma20: 4030,
    description: '자동차 가벼운 플라스틱 내장 소재 부품 및 가전 기구 엔지니어링 플라스틱 폴리머 원재료 가공 국산 화학 선도메이커입니다.',
    kneeShoulderIndex: 25,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '012630',
    name: 'HDC',
    nameEn: 'HDC Holdings',
    price: 21050,
    prevClose: 19860,
    change: 1190,
    changePercent: 5.99,
    high52Week: 32000,
    low52Week: 11000,
    volume: 135000,
    marketCap: '1조 2,300억원',
    peRatio: 9.2,
    rsi: 54,
    ma20: 19900,
    description: '현대산업개발 건설 대형 계열, 면세 유통 복합 인프라 및 신재생 화학 에너지를 총괄하는 대한민국 대표적 중견 지주 사입니다.',
    kneeShoulderIndex: 47,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '011210',
    name: '현대위아',
    nameEn: 'Hyundai Wia',
    price: 77600,
    prevClose: 71600,
    change: 6000,
    changePercent: 8.38,
    high52Week: 115000,
    low52Week: 48000,
    volume: 175000,
    marketCap: '2조 1,200억원',
    peRatio: 12.4,
    rsi: 61,
    ma20: 72400,
    description: '자동차 구동축 엔진 변속 공작 기계 제조사이자 공장 자동화 제조 로봇 및 하이브리드 추진체를 설계 공급합니다.',
    kneeShoulderIndex: 44,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '010470',
    name: '오리콤',
    nameEn: 'Oricom Inc',
    price: 4910,
    prevClose: 4730,
    change: 180,
    changePercent: 3.81,
    high52Week: 8200,
    low52Week: 3100,
    volume: 45000,
    marketCap: '580억원',
    peRatio: 10.5,
    rsi: 52,
    ma20: 4780,
    description: '브랜드 컨설팅, 온라인/오프라인 통합 프로모션 광고 전략을 가공 기획 제작 배급 대행하는 두산 계열 종합 광고사입니다.',
    kneeShoulderIndex: 35,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '023800',
    name: '인지컨트롤스',
    nameEn: 'Inzi Controls',
    price: 5840,
    prevClose: 5660,
    change: 180,
    changePercent: 3.18,
    high52Week: 9200,
    low52Week: 4100,
    volume: 68000,
    marketCap: '890억원',
    peRatio: 8.9,
    rsi: 50,
    ma20: 5690,
    description: '엔진 냉각 조절 시스템, 센서 조작 가공 부품 및 전기 수소차 복합 온도 제어 미세 밸브 핵심 원천 메이커사입니다.',
    kneeShoulderIndex: 34,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '012450',
    name: '한화에어로스페이스',
    nameEn: 'Hanwha Aerospace',
    price: 258000,
    prevClose: 252000,
    change: 6000,
    changePercent: 2.38,
    high52Week: 310000,
    low52Week: 110000,
    volume: 380000,
    marketCap: '12조 5,800억원',
    peRatio: 24.5,
    rsi: 56,
    ma20: 251000,
    description: '항공 엔진 설계 및 발사체 로켓 추력 시스템을 제작 공급하며, K9 자주포 및 자주 국방 무기 체계 체제 종합 리딩 방산 대기업입니다.',
    kneeShoulderIndex: 72,
    kneeShoulderStatus: 'SHOULDER'
  },
  {
    symbol: '028080',
    name: '휴맥스홀딩스',
    nameEn: 'Humax Holdings',
    price: 6170,
    prevClose: 5950,
    change: 220,
    changePercent: 3.70,
    high52Week: 9800,
    low52Week: 4200,
    volume: 58000,
    marketCap: '620억원',
    peRatio: 12.1,
    rsi: 53,
    ma20: 5980,
    description: '스마트 전기차 충전 인프라 운영 자회사를 필두로 게이트웨이 및 전자기기 부품 지주 사업을 전개하고 있습니다.',
    kneeShoulderIndex: 35,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '058860',
    name: 'KTis',
    nameEn: 'KTis Corp',
    price: 2620,
    prevClose: 2585,
    change: 35,
    changePercent: 1.35,
    high52Week: 4200,
    low52Week: 1900,
    volume: 45000,
    marketCap: '920억원',
    peRatio: 7.8,
    rsi: 46,
    ma20: 2590,
    description: 'KT 브랜드 미디어 홍보 및 전국 114번호 안내 마케팅 수수료, 모바일 기 판매를 통합 조작 가공 공급합니다.',
    kneeShoulderIndex: 31,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '036030',
    name: '케이티알파',
    nameEn: 'KT Alpha',
    price: 4605,
    prevClose: 4610,
    change: -5,
    changePercent: -0.11,
    high52Week: 7400,
    low52Week: 3200,
    volume: 68000,
    marketCap: '1,890억원',
    peRatio: 12.8,
    rsi: 43,
    ma20: 4620,
    description: 'K쇼핑을 선도하는 데이터홈쇼핑 플랫폼 운영, 디지털 콘텐츠 배급 및 모바일 쿠폰 유통 대리 특화 전문 기업입니다.',
    kneeShoulderIndex: 33,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '001740',
    name: 'SK네트워크스',
    nameEn: 'SK Networks',
    price: 13000,
    prevClose: 11670,
    change: 1330,
    changePercent: 11.40,
    high52Week: 18500,
    low52Week: 7200,
    volume: 1320000,
    marketCap: '3조 1,200억원',
    peRatio: 16.5,
    rsi: 71,
    ma20: 11900,
    description: '스마트 렌탈인 SK매직, 전기 자율 충전소 SK일렉링크 인수를 필두로 최근 소유 구조를 투자 전담형으로 혁신 변경한 지주 상사 회사입니다.',
    kneeShoulderIndex: 51,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '010140',
    name: '삼성중공업',
    nameEn: 'Samsung Heavy Industries',
    price: 27200,
    prevClose: 25300,
    change: 1900,
    changePercent: 7.51,
    high52Week: 38000,
    low52Week: 16000,
    volume: 3800000,
    marketCap: '24조원',
    peRatio: 45.2,
    rsi: 64,
    ma20: 25800,
    description: '고부가가치 친환경 액화천연가스 및 탄소 제로 암모니아선, 해상 유전 시추 플랫폼 대형 조선 리더 제조 조선소입니다.',
    kneeShoulderIndex: 50,
    kneeShoulderStatus: 'WAIST'
  },
  {
    symbol: '126560',
    name: '현대퓨처넷',
    nameEn: 'Hyundai Futurenet',
    price: 3125,
    prevClose: 3035,
    change: 90,
    changePercent: 2.97,
    high52Week: 4800,
    low52Week: 2200,
    volume: 110000,
    marketCap: '3,200억원',
    peRatio: 14.5,
    rsi: 52,
    ma20: 3050,
    description: '안전성 기반 디지털 미디어 전면 광고판 실내 시공 구축 및 뷰티 케어 유기원 화학 에센셜 천연 제조사입니다.',
    kneeShoulderIndex: 35,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '191410',
    name: '육일씨엔에쓰',
    nameEn: 'YUGIL CNS Co Ltd',
    price: 1320,
    prevClose: 1257,
    change: 63,
    changePercent: 5.01,
    high52Week: 2200,
    low52Week: 950,
    volume: 320000,
    marketCap: '1,245억원',
    peRatio: 13.8,
    rsi: 54,
    ma20: 1260,
    description: '정밀 모바일 및 디스플레이용 전면/후면 커버글라스 제조 전문 기술을 보유한 하이테크 기업입니다.',
    kneeShoulderIndex: 29,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: '066570',
    name: 'LG전자',
    nameEn: 'LG Electronics',
    price: 104500,
    prevClose: 102100,
    change: 2400,
    changePercent: 2.35,
    high52Week: 128000,
    low52Week: 89000,
    volume: 450000,
    marketCap: '17조 1,200억원',
    peRatio: 12.4,
    rsi: 49,
    ma20: 103200,
    description: '글로벌 종합 가전 리더 브랜드이자 모빌리티 전장부품 수주 공급 확대를 이끌고 있는 가전 및 전장 선도 기업입니다.',
    kneeShoulderIndex: 39,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: 'NVDA',
    name: '엔비디아',
    nameEn: 'NVIDIA Corp',
    price: 128.5,
    prevClose: 132.8,
    change: -4.3,
    changePercent: -3.24,
    high52Week: 145.0,
    low52Week: 75.0,
    volume: 48900000,
    marketCap: '3.16조 달러',
    peRatio: 64.2,
    rsi: 42,
    ma20: 134.2,
    description: 'AI 가속기 및 GPU 그래픽 처리 장치의 전 세계 독점적 리더입니다.',
    kneeShoulderIndex: 76,
    kneeShoulderStatus: 'SHOULDER'
  },
  {
    symbol: 'TSLA',
    name: '테슬라',
    nameEn: 'Tesla Inc',
    price: 185.2,
    prevClose: 172.0,
    change: 13.2,
    changePercent: 7.67,
    high52Week: 265.0,
    low52Week: 138.0,
    volume: 12800000,
    marketCap: '5,890억 달러',
    peRatio: 52.8,
    rsi: 61,
    ma20: 174.5,
    description: '글로벌 1위 전기차 제조사이자 자율주행(FSD) 및 휴머노이드 로봇 플랫폼 개발 기업입니다.',
    kneeShoulderIndex: 37,
    kneeShoulderStatus: 'KNEE'
  },
  {
    symbol: 'AAPL',
    name: '애플',
    nameEn: 'Apple Inc',
    price: 215.4,
    prevClose: 216.5,
    change: -1.1,
    changePercent: -0.51,
    high52Week: 235.0,
    low52Week: 165.0,
    volume: 24500000,
    marketCap: '3.29조 달러',
    peRatio: 31.8,
    rsi: 51,
    ma20: 218.0,
    description: '프리미엄 스마트폰 시장의 최강자이자 거대한 생태계를 지닌 플랫폼 홀더입니다.',
    kneeShoulderIndex: 72,
    kneeShoulderStatus: 'SHOULDER'
  }
];

// Initialize Knee-Shoulder statistics accurately
INITIAL_STOCKS.forEach(stock => {
  const calc = getKneeShoulderStatus(stock.price, stock.low52Week, stock.high52Week);
  stock.kneeShoulderIndex = calc.index;
  stock.kneeShoulderStatus = calc.status;
});

// Seed Static Predefined Analysed Catalysts (Up / Down Reasons)
export const DEFAULT_AI_REPORTS: Record<string, AiAnalysisReport> = {
  '005930': {
    symbol: '005930',
    kneeShoulderCommentary: '현재 주가는 52주 고점 대비 조정을 다진 후 "허리 부근(63%)"에 위치하고 있으며, 역사적 저가 청산 국면을 지나 점진적인 전방 산업 수율 돌파 우상향 트랙에 탑승해 있습니다. 무릎 이하 구간에서 분할 확보한 매수 보유진이라면 적극 홀딩 후 허리 상단을 관측해 볼 수 있습니다.',
    positiveFactors: [
      '엔비디아향 차세대 HBM3E 납품 퀄리티 테스트 최종 승인 임박 루머 양산 본격화',
      '전 세계적인 초거대 인공지능(AI) 인프라 가속 공급 및 범용 반도체 고부가가치 단가 현실화 기여',
      '모바일 및 가전 부문 프리미엄 디바이스 라인업 강화로 판매 단가(ASP) 수성 장벽 유지'
    ],
    negativeFactors: [
      '미국의 통화 통제 장기화로 인한 전 세계 중간 소비재 채널의 다소 지연되는 수요 기지개율',
      '파운드리 미세 공정 부문의 단기 수율 제어 관련 우려 및 서구 빅테크 커스텀 수주 경쟁 심화'
    ],
    investmentVerdict: '중립 이상의 허리 안착 구간입니다. 무릎 부근에서 적절히 비중을 확대한 투자자라면 현 단계에서는 성급히 매도하기보다 추세 안정화를 관찰하는 분할 보유 유지가 어울립니다.',
    analyzedAt: '2026-06-12'
  },
  '191410': {
    symbol: '191410',
    kneeShoulderCommentary: '현재 주가는 52주 고점 대비 약 31% 이상 숨고르기가 진행된 후 "달콤한 무릎 부근(37%)"에 안착해 있습니다. 역사적 원가 압박을 성공적으로 이겨내며 대형 전방 디스플레이 다변화의 돌파 기회가 본격 실현되기 시작하는 타이밍입니다.',
    positiveFactors: [
      '차량용 중대형 프리미엄 디스플레이 및 폴더블 3D 강화유리 신형 독자 성형 규격 납품 공급 개시',
      '제조 자동화 라인 완성을 통한 마진 절감 결실로 연간 영업 실적 흑자 턴어라운드 본격화'
    ],
    negativeFactors: [
      '디스플레이 및 모바일 서플라이 체인의 글로벌 수급 지연에 따른 일시적 물량 배송 분기 지연 가능성',
      '중소형 부품 테마 전반의 다소 변동적이거나 부족한 일일 시장 평균 거래 회전도'
    ],
    investmentVerdict: '매력적인 골든크로스를 준비하는 무릎 가격대입니다. 3,000원 대 최하단이 튼튼하게 지지되었으며, 점진적 반등 탄력을 보이는 만큼 길게 무릎 분할 수집 전략이 뛰어난 실익을 안길 것으로 보입니다.',
    analyzedAt: '2026-06-12'
  },
  'NVDA': {
    symbol: 'NVDA',
    kneeShoulderCommentary: '현재 주가는 52주 고점 근처인 "어깨 부근(76%)"에 해당합니다. 무릎에서 구매한 주주라면 수익의 일부를 점차 실현해야 할 시기일 수 있습니다. 밸류에이션 매력도가 저점 대비 떨어졌기 때문에 신규 진입자는 과매수 하락 리스크를 항시 경계해야 하는 긴장감 있는 어깨 구간입니다.',
    positiveFactors: [
      '차세대 Blackwell GPU 아키텍처 출시 지연 이슈 해소 및 출하 물량 사전 예약 완판',
      '소프트웨어 생태계인 CUDA의 강력한 독점 락인(Lock-in) 효과로 타사 하드웨어 전환 비용 부담 유발'
    ],
    negativeFactors: [
      '대형 고객사(MS, Google, AWS 등)들의 하드웨어 독점 해소를 위한 자체 거대 칩 제조(TPU/커스텀 실리콘) 비중 점차 확대',
      '빅테크들의 AI 인프라 지출(CAPEX) 대비 과잉 투자 우려 제기(ROI 달성 속도 지연 가능성)'
    ],
    investmentVerdict: '매우 훌륭한 펀더멘탈을 지녔으나 단기적인 "어깨/머리 진입" 밸류에이션 부담이 있습니다. 신규 진입보다는 눌림목 지점을 차분히 기다려 무릎 부근에서 줍는 철저한 분할 접근을 추천합니다.',
    analyzedAt: '2026-06-12'
  },
  'TSLA': {
    symbol: 'TSLA',
    kneeShoulderCommentary: '테슬라의 주가는 "무릎 부근(37%)"에 위치해 있어 역사적 가치 대안 구간으로 해석할 수 있습니다. 악재가 대부분 주가에 반영 완료되었고, 차세대 모멘텀이 시동을 걸기 시작하여 무릎에서 허리로 도약하려는 골든크로스 조짐이 존재합니다.',
    positiveFactors: [
      '연내 2만 5천 달러 이하 보급형 신제품 플랫폼 및 콤팩트 SUV 출시 타임라인 확정',
      '북미 및 중국 내 전체 자율주행(FSD) 소프트웨어의 이용률 급증 및 구독 매출 비즈니스 모델로의 연착륙화'
    ],
    negativeFactors: [
      '유럽 마켓 내 탄소 배출권 크레딧 판매 수익성 저하 가능성과 중국 저가 브랜드 세단의 공급 공세 지속',
      '고금리로 인한 일반 소비자들의 자동차 금융 활부 장벽과 원자재 충격'
    ],
    investmentVerdict: '형성 가격이 무릎 및 허리 하단에 있으므로 가치 및 중장기 투자자 관점에서는 포트폴리오를 구성해 나가기 최적의 영역으로 평가됩니다.',
    analyzedAt: '2026-06-12'
  }
};

// Seed Market Themes with Lifecycle Infographic Data
export const MARKET_THEMES: MarketTheme[] = [
  {
    id: 'semicon',
    name: '반도체/AI 칩 테마',
    description: 'HBM(고대역폭 메모리) 및 AI 추론용 신경망엔진(NPU) 중심으로 전 세계 데이터센터 수요가 폭발하며 생성된 역사상 가장 큰 기술 성장 사이클 테마입니다.',
    growthDriver: '글로벌 빅테크 기업들의 초거대 자율형 AI 서비스 도입 경쟁과 가속기 증설 트렌드',
    status: 'GROWTH',
    statusInfo: {
      title: '주요 성장(Growth) 국면',
      description: '거품 붕괴 우려를 극복하며 실질 출하량이 실적(Earnings)으로 완연하게 확인되는 강력한 우상향 흐름 단계입니다. 밸류가 다소 무거운 편이나 펀더멘탈 축적이 함께 가고 있습니다.',
      color: 'emerald'
    },
    relativeStocks: [
      { symbol: '005930', name: '삼성전자', relationReason: '생산 캐파 확보 및 범용 인프라 공급 1순위 대표주' },
      { symbol: '000660', name: 'SK하이닉스', relationReason: '글로벌 탑라인 엔비디아향 기성 HBM 독점 공급업체' },
      { symbol: 'NVDA', name: '엔비디아', relationReason: 'AI 반도체 시장 총 설계 및 원조 플랫폼 최고 주도자' }
    ],
    timeline: [
      { phase: '1단계: 도입기', label: '기술 촉발', description: 'ChatGPT 등장으로 생성형 AI 기반 하드웨어 인프라 최초 수혜주 주목.', trend: 'rise' },
      { phase: '2단계: 급등기', label: 'HBM 공급 쇼티지', description: '생산 차질 우려 속 전방 주문서 집중으로 이익률 폭등, 사상 최고가 랠리.', trend: 'rise' },
      { phase: '3단계: 숨고르기/조정', label: '과열 해소', description: '주요 빅테크의 설비 투자 속도 완급 조절 소식에 따른 밸류 정당성 검증 조정을 거침.', trend: 'fall' },
      { phase: '4단계: 실적 확인 성장기 (현재)', label: 'Earning 우상향', description: '서버 연간 운용을 위한 실제 메모리 계약 단가 인상과 양산 신뢰성 확보가 증명되며 완만한 주가 재상승 도모.', trend: 'rise' }
    ]
  },
  {
    id: 'battery',
    name: '이차전지/배터리 테마',
    description: '글로벌 전동차(EV) 보급 가속화 정책을 축으로 수년에 걸쳐 고성장했으나, 2024~2025년 급격한 수요 둔화(캐슴, Chasm) 고비를 지나 저평가 영역을 탐색 중인 순환주 테마입니다.',
    growthDriver: '유럽/미국의 탄소 규제 완화 조정 속도와 리튬/양극재 원자재 현물 시세의 하향 안정화',
    status: 'CORRECTION',
    statusInfo: {
      title: '조정/바닥 다지기(Correction) 국면',
      description: '주요 전기차 시장의 연성 성장 구간인 "캐슴" 통과로 단기 공장 가동률 저하 및 실적 악화가 대부분 반영되었습니다. 밸류에이션상 최하단인 발목 혹은 무릎 지점의 매력을 갖춰가는 장기 회복 대기 국면입니다.',
      color: 'cyan'
    },
    relativeStocks: [
      { symbol: '373220', name: 'LG에너지솔루션', relationReason: '미국 대형 투자 세액공제(AMPC) 최대 수혜 및 셀 제조 시장 1위' },
      { symbol: '003670', name: '포스코퓨처엠 (관련주)', relationReason: '양극재 및 음극재 국산화 원료 가치 가중으로 테마 동반 연소' }
    ],
    timeline: [
      { phase: '1단계: 대호황기', label: '친환경 법안 가속', description: '미 규제 최대화 및 광물 공급 병목으로 리튬 선도 가격 최고점 도달, 테마 전반 수십배 폭등.', trend: 'rise' },
      { phase: '2단계: Peak Out', label: '공급 과잉 개시', description: '중국산 LFP 배터리 침투 및 완성차 업계의 연간 라인업 출시 지연으로 마진율 저하 폭탄.', trend: 'fall' },
      { phase: '3단계: 가치 하락/바닥(현재)', label: 'Chasm 정점 통과', description: '한계 한계기업 파산과 공급 조절로 과도한 거품 버블 전액 축출. 저가 보급 모델 수주로 바닥 다지는 중.', trend: 'flat' },
      { phase: '4단계: 차세대 도약예정', label: '전고체 & 대량화', description: '4680 규격 원통형 배터리 고성능 전기차 출하와 가격 탄력성이 양방향으로 연동되는 가치 반등 추진.', trend: 'rise' }
    ]
  },
  {
    id: 'ai-software',
    name: '지능형 AI/소프트웨어 테마',
    description: '기업용 생산성 도구, 의료 진단 특화 모듈, 대화형 자동화 플랫폼 등 인공지능 인프라 위에 얹어지는 비즈니스 탑클래스 솔루션 테마입니다.',
    growthDriver: '성능 고도화(온디바이스 구동) 비용 절감 실현 및 가입자 구독 비즈니스 모델 정밀 탑재',
    status: 'INTRO',
    statusInfo: {
      title: '초입/태동(Intro) 국면',
      description: '반도체 가속기 투자가 선행된 후, 이를 활용한 실제 소프트웨어 유료 매출원들이 대세를 형성하려 하는 신규 초기 팽창 시장 단계입니다.',
      color: 'amber'
    },
    relativeStocks: [
      { symbol: 'TSLA', name: '테슬라', relationReason: '완벽한 인공지능 하드웨어인 차량 탑재 AI 및 휴머노이드 최강자' },
      { symbol: 'AAPL', name: '애플', relationReason: '수십억 대의 소비재 스마트폰에서 즉각 작동되는 온디바이스 생태계 지배' }
    ],
    timeline: [
      { phase: '1단계: 기대감', label: '아이디어 구상', description: 'AI 모델 고용을 통한 업무 대체 성과 발표들로 기대감 주입.', trend: 'rise' },
      { phase: '2단계: 킬러앱 부재 조정', label: '단순 거품 제거', description: 'API 구독 비용 대비 명확한 실생활 편익 실적 부족으로 1차 실망 및 자금 유출.', trend: 'fall' },
      { phase: '3단계: 실매출 출범 (현재)', label: '도입 촉진', description: 'B2B 정밀 업무 및 헬스케어 디바이스를 중심으로 본격 활용 가착 수수료 확보 활발.', trend: 'rise' }
    ]
  }
];

// Helper to generate dynamic mock candle data for charts (30 candles)
export function generateHistoricalCandles(stock: Stock, count: number = 30): Candle[] {
  const candles: Candle[] = [];
  const basePrice = stock.price;
  const isHighValued = basePrice > 10000;
  
  // Create a pseudo-random generator with seed based on symbol
  let seed = stock.symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const volatility = stock.symbol === 'NVDA' || stock.symbol === 'TSLA' ? 0.03 : 0.015;
  const now = new Date();
  
  let currentPrice = basePrice - (count * (random() - 0.48) * volatility * basePrice);
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - (count - i));
    
    const timeStr = date.toISOString().split('T')[0];
    
    const changeFactor = (random() - 0.49) * volatility;
    const open = currentPrice;
    const close = currentPrice * (1 + changeFactor);
    
    const fluctuationMax = Math.max(open, close);
    const fluctuationMin = Math.min(open, close);
    
    const high = fluctuationMax * (1 + random() * volatility * 0.4);
    const low = fluctuationMin * (1 - random() * volatility * 0.4);
    
    const volume = Math.floor((stock.volume / 30) * (0.6 + random() * 0.8));
    
    candles.push({
      time: timeStr,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume
    });
    
    currentPrice = close;
  }
  
  // Make the last candle end exactly near stock price
  const last = candles[candles.length - 1];
  if (last) {
    last.close = stock.price;
    last.high = Math.max(last.open, last.close, last.high);
    last.low = Math.min(last.open, last.close, last.low);
  }
  
  return candles;
}

// Preloaded realistic discussions for stocks
export const SEED_DISCUSSIONS: DiscussionPost[] = [
  {
    id: '1',
    symbol: '005930',
    username: '반도체구조자',
    content: '하이닉스가 HBM 선점했지만 삼전도 5세대 퀄테스트 통과하고 양산 본격화되면 이 가격대가 역대 최저 바닥 knee일 겁니다. 주주들 힘냅시다!',
    timestamp: '15분 전',
    likes: 24
  },
  {
    id: '2',
    symbol: '005930',
    username: '인공지능애널',
    content: '삼성전자가 최근 파운드리 포트폴리오를 대량 수주로 변경하며 외형 포석을 다지고 있습니다. 무릎 가격대 수준이므로 적극 분할매수 유효 지점!',
    timestamp: '40분 전',
    isAi: true,
    likes: 42
  },
  {
    id: '3',
    symbol: '005930',
    username: '단타마왕',
    content: '어제 호재 뉴스 뜨자마자 오늘 갭상승하네요. 73,000원에 저항선 있으니 단기 매도는 고려해보세요.',
    timestamp: '1시간 전',
    likes: 9
  },
  {
    id: 'NVDA',
    symbol: 'NVDA',
    username: 'AI혁명주주',
    content: '솔직히 엔비디아 Blackwell 공급 속도가 지연되나 싶었지만, 이번 대량 출하 보고서 보니까 실적은 역대 최대 갱신 확정이네요. 어깨 부근이어도 계속 우상향 달린다!',
    timestamp: '5분 전',
    likes: 31
  },
  {
    id: 'NVDA_2',
    symbol: 'NVDA',
    username: '치타는배고파',
    content: 'rsi 지표가 70 넘었었는데 지금 단기 조정을 겪고 어깨 부근(76%)이라 약간 매도하고 현금 비중 늘리는 게 나을 듯 싶어요. 무릎에 다시 줍는 전략으로!',
    timestamp: '25분 전',
    likes: 18
  },
  {
    id: 'TSLA_1',
    symbol: 'TSLA',
    username: '화성갈끄니까',
    content: '주가 180불대는 진심 기회 아님까?? FSD v12 써본 사람들 다 극찬하고 있고 저가 차량 곧 나옴. 무릎(KNEE) 상태 주식의 교과서!',
    timestamp: '8분 전',
    likes: 45
  },
  {
    id: 'TSLA_2',
    symbol: 'TSLA',
    username: '로보택시플래너',
    content: '인공지능 대형 가속기들이 완성되고 무인 주행 인증이 미국 각 주에서 허가나기 시작하면 하드웨어 판매보다 구독 이익률이 테슬라를 완전히 무릎 수준에서 천장으로 보낼 겁니다.',
    timestamp: '2시간 전',
    isAi: true,
    likes: 56
  }
];
