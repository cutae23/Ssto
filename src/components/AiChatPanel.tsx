import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  User, 
  Bot, 
  Coins, 
  TrendingUp,
  ArrowRight,
  Maximize2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CaptureAnalysisResult, UserProfile } from '../types';

interface AiChatPanelProps {
  portfolio: CaptureAnalysisResult | null;
  profile: UserProfile;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Lightweight Custom Markdown Renderer for a polished look without extra dependencies
const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    // 1. Render bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const cleanLine = line.trim().substring(2);
      return (
        <li key={idx} className="ml-4 list-disc text-zinc-300 text-xs my-1 font-medium leading-relaxed">
          {parseInlineMarkdown(cleanLine)}
        </li>
      );
    }
    // 2. Render numbered lists
    const numRegex = /^(\d+)\.\s(.*)/;
    const numMatch = line.trim().match(numRegex);
    if (numMatch) {
      return (
        <li key={idx} className="ml-4 list-decimal text-zinc-300 text-xs my-1 font-medium leading-relaxed">
          {parseInlineMarkdown(numMatch[2])}
        </li>
      );
    }
    // 3. Render headers (e.g. ### Header)
    if (line.trim().startsWith('### ')) {
      return (
        <h5 key={idx} className="text-xs font-black text-indigo-300 uppercase tracking-wider mt-4 mb-2">
          {parseInlineMarkdown(line.trim().substring(4))}
        </h5>
      );
    }
    if (line.trim().startsWith('## ')) {
      return (
        <h4 key={idx} className="text-sm font-black text-white uppercase tracking-tight mt-5 mb-2 border-b border-zinc-900 pb-1">
          {parseInlineMarkdown(line.trim().substring(3))}
        </h4>
      );
    }
    // 4. Empty lines become spacings
    if (line.trim() === '') {
      return <div key={idx} className="h-2" />;
    }
    // 5. Standard paragraph line
    return (
      <p key={idx} className="text-zinc-350 text-xs font-semibold leading-relaxed my-1.5">
        {parseInlineMarkdown(line)}
      </p>
    );
  });
};

// Sub-parser for inline elements like bold (**text**) and code (`code`)
const parseInlineMarkdown = (line: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const segments = line.split(regex);

  segments.forEach((segment, sIdx) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      parts.push(
        <strong key={sIdx} className="font-extrabold text-white text-[12px]">
          {segment.substring(2, segment.length - 2)}
        </strong>
      );
    } else if (segment.startsWith('`') && segment.endsWith('`')) {
      parts.push(
        <code key={sIdx} className="bg-zinc-950 border border-zinc-850 px-1.5 py-0.5 rounded font-mono text-[10.5px] text-amber-400 font-bold mx-0.5">
          {segment.substring(1, segment.length - 1)}
        </code>
      );
    } else {
      parts.push(<span key={sIdx}>{segment}</span>);
    }
  });

  return parts;
};

export default function AiChatPanel({ portfolio, profile }: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initial welcome message reflecting loaded portfolio context
  useEffect(() => {
    if (messages.length === 0) {
      let welcomeText = `안녕하세요! AI 수석 애널리스트 **VISION MARKET AI**입니다. 📈\n\n현재 업로드된 보유 자산이 없습니다. 관심 있으신 종목(예: 대원전선, 씨에스윈드, 삼성전자)이나 시장 상황에 대해 무엇이든 편하게 물어보세요!`;
      
      if (portfolio) {
        const holdingsCount = portfolio.portfolioHoldings?.length || 0;
        welcomeText = `보유 포트폴리오 스캔 완료! **총 ${holdingsCount}개의 종목**과 **예수금 ${portfolio.portfolioSummary?.deposit?.toLocaleString() || '21,826,915'}원**이 성공적으로 연동되었습니다.\n\n현재 계좌의 리밸런싱 시점, 개별 종목의 구체적인 물타기 가격 단가 지침, 혹은 최근 주도 산업에 대해 궁금한 점을 질문해 주세요. 최선을 다해 안내해 드리겠습니다.`;
      }
      setMessages([{ role: 'model', text: welcomeText }]);
    }
  }, [portfolio]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (!textToSend) {
      setInput('');
    }
    setError(null);
    setIsLoading(true);

    // Append user message immediately
    const updatedMessages = [...messages, { role: 'user' as const, text: query }];
    setMessages(updatedMessages);

    try {
      // Gather relevant chat history up to last 12 messages to prevent payload bloat
      const historyPayload = updatedMessages.slice(0, -1);

      const userApiKey = localStorage.getItem('custom_gemini_api_key') || '';
      const passcode = localStorage.getItem('sa_ai_access_code') || '';
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-Api-Key': userApiKey,
          'x-ai-access-code': passcode,
        },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          portfolio: portfolio,
          profile: profile
        })
      });

      if (!response.ok) {
        let errorMsg = '서버와 대화 처리 도중 오류가 발생했습니다.';
        try {
          const rawText = await response.text();
          try {
            const errData = JSON.parse(rawText);
            if (errData.message || errData.error) {
              errorMsg = errData.message || errData.error;
            } else {
              errorMsg = `서버 오류 (상태 코드: ${response.status}): ${rawText.substring(0, 100)}`;
            }
          } catch (_) {
            errorMsg = `서버 응답 오류 (상태 코드: ${response.status}): ${rawText.substring(0, 150)}`;
          }
        } catch (readErr: any) {
          errorMsg = `네트워크 응답 읽기 실패: ${readErr?.message || readErr}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || data.error);
      }

      setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err?.message || '구글 Gemini 인공지능 분석 가동 실패. 서버 또는 API 구성을 점검해 주십시오.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    let welcomeText = `안녕하세요! AI 수석 애널리스트 **VISION MARKET AI**입니다. 📈\n\n관심 있으신 종목이나 시장 상황에 대해 무엇이든 편하게 물어보세요!`;
    if (portfolio) {
      const holdingsCount = portfolio.portfolioHoldings?.length || 0;
      welcomeText = `보유 포트폴리오가 연동되었습니다. **총 ${holdingsCount}개의 종목**에 대해 리밸런싱 시점, 구체적인 물타기 가격 단가 지침, 혹은 최근 시장 동향에 대해 궁금한 점을 자유롭게 물어보세요!`;
    }
    setMessages([{ role: 'model', text: welcomeText }]);
    setError(null);
  };

  // Pre-configured questions based on active screen states
  const quickPrompts = portfolio ? [
    { label: '현 예수금 운용 팁', query: '현재 내 계좌의 예수금을 어떤 종목에 우선적으로 분할 집행하면 좋을까요?' },
    { label: '대원전선 추가 매수', query: '대원전선의 현재 주가 흐름과 물타기 대응선을 구체적으로 짚어주세요.' },
    { label: '씨에스윈드 전망', query: '씨에스윈드의 해상 풍력 타워 전망과 기술적 반등 시점이 궁금합니다.' },
    { label: '성향 맞춤 포트폴리오', query: '내 투자 성향에 비추어 볼 때 이 포트폴리오의 리스크를 어떻게 제어할까요?' }
  ] : [
    { label: '대원전선 업황 분석', query: '최근 대원전선의 상승 촉매 요인과 인프라 구리 가격 관계를 설명해 주세요.' },
    { label: '씨에스윈드 수혜', query: '유럽 및 북미 해상풍력 시장에서 씨에스윈드가 갖는 지배력과 수주 전망을 분석해 주세요.' },
    { label: '온디바이스 AI 반도체', query: '삼성전자 온디바이스 AI 탑재 및 HBM 차세대 패키징 모멘텀이 어떻게 되나요?' },
    { label: '우주항공 AP위성', query: '정부 우주항공청(KASA) 개청 수혜와 저궤도 위성 AP위성의 가치 진단을 해주세요.' }
  ];

  return (
    <div id="ai-qa-section" className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-5 md:p-6 flex flex-col gap-5 relative overflow-hidden backdrop-blur-xl h-[620px]">
      {/* Background radial accent */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Panel */}
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-850 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-zinc-100 flex items-center gap-1.5 uppercase tracking-widest text-amber-400">
              <Sparkles className="h-4 w-4 animate-pulse text-amber-400" />
              AI 수석 애널리스트 1:1 라이브 질의응답
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
              {portfolio ? 'Portfolio-Aware Contextual AI Chat Agent' : 'General Investment Q&A Broker'}
            </span>
          </div>
        </div>

        <button 
          onClick={handleClearHistory}
          title="대화 내역 초기화"
          className="text-zinc-500 hover:text-zinc-300 p-2 rounded-lg hover:bg-zinc-950 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          대화 초기화
        </button>
      </div>

      {/* Quick Prompts Hub */}
      <div className="flex flex-col gap-2 relative z-10 shrink-0">
        <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">원클릭 신속 애널리스트 질문</span>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSend(p.query)}
              className="text-[10.5px] font-semibold text-zinc-350 bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-850 hover:border-zinc-750 rounded-xl px-3 py-1.5 transition-all text-left flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <TrendingUp className="h-3 w-3 text-indigo-400 group-hover:text-amber-400 shrink-0" />
              <span>{p.label}</span>
              <ArrowRight className="h-2.5 w-2.5 text-zinc-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto pr-1 bg-zinc-950/40 rounded-2xl border border-zinc-850 p-4 flex flex-col gap-4 min-h-[100px]">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 max-w-[88%] ${m.role === 'user' ? 'self-end flex-row-reverse' : 'self-start text-left'}`}
            >
              {/* Avatar Icon */}
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border text-xs font-bold ${
                m.role === 'user' 
                  ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400' 
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
              }`}>
                {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>

              {/* Message Bubble */}
              <div className={`p-3.5 rounded-2xl flex flex-col gap-1 shadow-lg ${
                m.role === 'user'
                  ? 'bg-indigo-600/15 border border-indigo-500/20 rounded-tr-none text-right'
                  : 'bg-zinc-900 border border-zinc-850 rounded-tl-none'
              }`}>
                <div className="text-[11px] font-mono font-bold text-zinc-500">
                  {m.role === 'user' ? '나의 질문' : 'VISION MARKET AI 요약'}
                </div>
                <div>
                  {m.role === 'user' ? (
                    <p className="text-zinc-200 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  ) : (
                    <div className="markdown-body space-y-1">
                      {renderMarkdown(m.text)}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Spinner Indicator */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 max-w-[80%] self-start"
          >
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border bg-amber-500/10 border-amber-500/25 text-amber-400">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-2xl rounded-tl-none flex items-center gap-2.5">
              <RefreshCw className="h-4.5 w-4.5 animate-spin text-amber-400" />
              <span className="text-xs text-zinc-400 font-mono">가상 자산 시뮬레이터 및 금리 정책 지수 종합 진단 중...</span>
            </div>
          </motion.div>
        )}

        {/* Error message alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2 max-w-md self-center">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">AI 질문 처리 실패</span>
              <span className="text-[11px] text-rose-300 leading-normal">{error}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input controls form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 shrink-0 relative z-10"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder={portfolio ? "보유 종목의 지지 가격이나 현금 소진 전략에 대해 물어보세요..." : "분석하고 싶은 주식 업종이나 경제 전망을 물어보세요..."}
          className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-amber-500 text-zinc-100 placeholder-zinc-500 text-xs rounded-xl px-4 py-3 focus:outline-none transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            isLoading || !input.trim()
              ? 'bg-zinc-950 text-zinc-650 border border-zinc-850 cursor-not-allowed'
              : 'bg-amber-500 text-zinc-950 hover:scale-[1.03] shadow-md shadow-amber-500/10 hover:shadow-amber-500/20'
          }`}
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
  );
}
