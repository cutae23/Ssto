import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ExternalLink, 
  FileText, 
  AlertCircle, 
  Cloud, 
  Laptop, 
  CheckCircle2, 
  Settings,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';

export default function AiConfigPanel() {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testMessage, setTestMessage] = useState('');
  const [serverKeyExists, setServerKeyExists] = useState(false);

  // Load key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('local_gemini_api_key') || '';
    setApiKey(savedKey);
    if (savedKey) {
      setIsSaved(true);
    }

    // Check if server-side key is already active
    checkServerKey();
  }, []);

  const checkServerKey = async () => {
    try {
      const res = await fetch('/api/ai-config-status');
      if (res.ok) {
        const data = await res.json();
        setServerKeyExists(data.serverKeyActive);
      }
    } catch (e) {
      console.error('Server API key check failed:', e);
    }
  };

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('local_gemini_api_key', apiKey.trim());
      setIsSaved(true);
      setTestStatus('IDLE');
      setTestMessage('');
      
      // Flash successful save toast
      const event = new CustomEvent('show-toast', {
        detail: {
          message: 'API 키가 영구 저장되었습니다.',
          sub: '이제 주식 분석 및 핫테마 연구소에서 커스텀 API 키가 적용됩니다.'
        }
      });
      window.dispatchEvent(event);
    } else {
      handleDelete();
    }
  };

  const handleDelete = () => {
    localStorage.removeItem('local_gemini_api_key');
    setApiKey('');
    setIsSaved(false);
    setTestStatus('IDLE');
    setTestMessage('');

    const event = new CustomEvent('show-toast', {
      detail: {
        message: 'API 키를 성공적으로 제거했습니다.',
        sub: '이후 요청은 서버 기본 API 키 또는 가상 폴백 데이터를 사용합니다.'
      }
    });
    window.dispatchEvent(event);
  };

  const handleTestConnection = async () => {
    setTestStatus('LOADING');
    setTestMessage('');
    try {
      const keyToUse = apiKey.trim() || '';
      const passcode = localStorage.getItem('sa_ai_access_code') || '';
      
      const res = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': keyToUse,
          'x-ai-access-code': passcode
        }
      });

      const textResponse = await res.text();
      let data: any;
      try {
        data = JSON.parse(textResponse);
      } catch (parseErr) {
        setTestStatus('ERROR');
        let errorMsg = `서버가 JSON 형식의 데이터가 아닌 잘못된 응답을 보냈습니다 (HTTP 상태코드: ${res.status}).`;
        if (textResponse.includes('<html') || textResponse.includes('<!DOCTYPE html') || textResponse.includes('vercel')) {
          errorMsg += ' Vercel 배포 시 서버리스 핸들러(Serverless Function)가 작동되지 않아 오류 페이지(HTML)가 반환되었습니다. Vercel dashboard의 Logs를 열어 빌드 오류나 런타임 오류가 있는지 관찰하십시오.';
        } else {
          errorMsg += ` 응답 전문: ${textResponse.slice(0, 150)}...`;
        }
        setTestMessage(errorMsg);
        return;
      }

      if (res.ok && data.success) {
        setTestStatus('SUCCESS');
        if (data.mode === 'USER_KEY') {
          setTestMessage('성공! 입력하신 Gemini API 키가 올바르게 작동합니다. (라이브 AI 분석 가능)');
        } else {
          setTestMessage('성공! 서버 환경 변수(Server Secret)로 등록된 API 키가 안정적으로 동기화되었습니다.');
        }
      } else {
        setTestStatus('ERROR');
        setTestMessage(data.error || '연결 테스트 실패: API 키가 잘못되었거나 할당량이 초과되었습니다.');
      }
    } catch (err: any) {
      setTestStatus('ERROR');
      setTestMessage(`연결 요청 도중 네트워크 예외가 일어났습니다: ${err?.message || '요청 차단됨'}. 서버가 올바르게 기동되었는지 확인해주세요.`);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left" id="ai-config-panel">
      {/* Banner Title */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-500 text-zinc-100 shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-sans text-base font-bold text-zinc-100">Gemini AI API 설정 센터</h3>
            <p className="text-[10px] text-zinc-500">실시간 종목 정밀 진단 및 핫테마 합성을 위한 API 연동 관리</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {serverKeyExists ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
              <Check className="h-3 w-3" />
              서버 API 키 활성화됨
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-400 animate-pulse">
              <Lock className="h-3 w-3" />
              클라이언트 전용 키 대기중
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: API KEY INPUT and test */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-200">개인 Gemini API 키 입력</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">localStorage 저장</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              본인의 구글 AI 스튜디오 계정에서 생성한 키를 이곳에 입력하면, 서비스 서버의 환경변수를 수정하지 않고도 클라이언트 브라우저에서 안전하게 본인의 API 사용 쿼터를 이용하여 실시간 고품격 AI 진단 결과를 받아볼 수 있습니다.
            </p>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setIsSaved(false);
                  }}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-3.5 pl-4 pr-12 font-mono text-xs text-zinc-200 placeholder-zinc-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1.5">
                <button
                  onClick={handleSave}
                  disabled={!apiKey.trim()}
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition-colors disabled:opacity-40"
                >
                  {isSaved ? '수정 후 키 저장' : 'API 키 적용 및 저장'}
                </button>
                {isSaved && (
                  <button
                    onClick={handleDelete}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Key Validator Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-400" />
              API 키 연동 상태 테스트
            </h4>
            
            <p className="text-[11.5px] text-zinc-400 leading-relaxed">
              입력한 API 키가 구글 오피셜 제미나이 백엔드와 정상 통신 가능한 상태인지 건전성 상태를 검증합니다.
            </p>

            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'LOADING'}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 px-4 py-2.5 text-xs font-bold text-zinc-300 transition-colors disabled:opacity-50"
            >
              {testStatus === 'LOADING' ? (
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
              ) : (
                <RefreshCw className="h-4 w-4 text-indigo-400" />
              )}
              {testStatus === 'LOADING' ? '생성 테스트 전송 중...' : 'Gemini API 연결성 테스트 실행'}
            </button>

            {testStatus !== 'IDLE' && (
              <div className={`rounded-lg p-3.5 border ${
                testStatus === 'SUCCESS' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              } text-[11.5px] flex items-start gap-2.5`}>
                {testStatus === 'SUCCESS' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{testStatus === 'SUCCESS' ? '연결 성공' : '연결 실패'}</p>
                  <p className="mt-1 font-mono leading-relaxed opacity-90">{testMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: INSTALLATION STEP-BY-STEP EXPLANATION */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <FileText className="h-4.5 w-4.5 text-emerald-400" />
              Gemini API Key 설치 및 배포 상세 설명서
            </h4>

            {/* Instruction Nodes */}
            <div className="space-y-5">
              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400 font-mono">
                    1
                  </span>
                  <h5 className="text-[12.5px] font-extrabold text-zinc-200">구글 AI Studio에서 API 키 발급받기</h5>
                </div>
                <div className="pl-7 space-y-1.5 text-[11px] text-zinc-400 leading-relaxed">
                  <p>
                    구글에서 누구나 쉽게 무료 분량의 제미나이 쿼터를 제공하는 <b>Google AI Studio</b>에 접속하여 키를 생성하세요.
                  </p>
                  <a 
                    href="https://aistudio.google.com/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors"
                  >
                    AI Studio 바로가기 (API Key 발급)
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400 font-mono">
                    2
                  </span>
                  <h5 className="text-[12.5px] font-extrabold text-zinc-200">로컬 환경설정 (`.env` 파일 구성)</h5>
                </div>
                <div className="pl-7 space-y-1.5 text-[11px] text-zinc-400 leading-relaxed">
                  <p>
                    개발 PC의 루트 디렉토리에 <b>`.env`</b> 파일을 생성하거나 기존 <b>`.env.example`</b>을 복사하여 아래처럼 키 항목을 지정해줍니다.
                  </p>
                  <div className="rounded bg-zinc-900 p-2 text-[10px] font-mono text-zinc-400 text-left overflow-x-auto select-all">
                    GEMINI_API_KEY="AIzaSyYourOwnSecretGeminiApiKeyHere"
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400 font-mono">
                    3
                  </span>
                  <h5 className="text-[12.5px] font-extrabold text-zinc-200">Vercel 호스팅 및 클라우드 배포 시 에러 대처법</h5>
                </div>
                <div className="pl-7 space-y-2.5 text-[11px] text-zinc-400 leading-relaxed">
                  <p>
                    Vercel 등의 클라우드 환경에 배포 시 설정이 잘 반영되지 않는 핵심 이유는 <b>Vercel의 배포 캐시 및 빌드 라이프사이클</b> 때문입니다. 아래 원칙을 반드시 확인하세요:
                  </p>
                  
                  <div className="bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-850 space-y-3.5 text-[11px]">
                    <div className="space-y-1">
                      <p className="font-bold text-red-400 flex items-center gap-1.5 leading-none">
                        ⚠️ [필수] 신규 등록 후 Redeploy(재배포) 실행
                      </p>
                      <p className="text-[10px] text-zinc-400 pl-4">
                        Vercel Settings에서 인라인으로 환경변수를 저장한 직후에는 이미 실행 중인 서버리스 가상 인스턴스에 즉각 로드되지 않습니다. <b>Deployments 탭으로 이동하여 최신 빌드를 누르고 [Redeploy(재배포)] 버튼을 눌러 프로젝트를 새로 빌드해야</b> 주입됩니다.
                      </p>
                    </div>

                    <div className="border-t border-zinc-850/60 pt-2.5 space-y-1">
                      <p className="font-bold text-emerald-400 flex items-center gap-1.5 leading-none">
                        💡 대괄호/따옴표 중복 삽입 대처 (서버 자동 해결 적용됨)
                      </p>
                      <p className="text-[10px] text-zinc-400 pl-4 animate-pulse">
                        간혹 메모장이나 .env.example에서 복사 중 앞뒤 따옴표(<code className="text-zinc-200 font-mono bg-zinc-850 px-1 py-0.2 rounded font-bold">"</code> or <code className="text-zinc-205 font-mono bg-zinc-850 px-1 py-0.2 rounded font-bold">'</code>)를 그대로 값에 집어넣어 구글 클라이언트 인증이 깨질 때가 있습니다. <b>임시 조치를 위해 저희 서버에 자동 따옴표 스트리핑(Quote Stripper) 정화 장치를 주입해놓았습니다.</b> 안심하고 입력하셔도 무방합니다.
                      </p>
                    </div>

                    <div className="border-t border-zinc-850/60 pt-2.5 space-y-1">
                      <p className="font-bold text-sky-400 flex items-center gap-1.5 leading-none">
                        ⚙️ 설정 환경 대상(Environments) 확인
                      </p>
                      <p className="text-[10px] text-zinc-400 pl-4">
                        등록할 때 <b>Production, Preview, Development</b> 3개의 체크박스가 모두 체크되어 있는지 확인하세요. 하나라도 누락되면 특정 접속 상태에서 API 키를 인식하지 못합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Reminder Box */}
              <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[11.5px] text-indigo-300">
                <p className="font-extrabold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  클라이언트 오버레이 기능 활성화 안내
                </p>
                <p className="mt-1 opacity-90 leading-relaxed text-[10.5px]">
                  환경 변수 등록 및 Vercel 재배포 과정을 매번 대기하기 번거로우신가요? 왼쪽의 <b>[개인 Gemini API 키 입력]</b> 상자에 본인의 API 키를 직접 붙여넣으십시오. 이 키는 브라우저 내부 <code className="bg-zinc-850 px-1 rounded text-zinc-200 font-mono">localStorage</code>에 기밀 저장되며, 서버 요청에 편승되어 Vercel 환경 변수가 감지되기 전이라도 즉시 100% 라이브 인포그래픽과 AI 분석 결과를 고속으로 즐기실 수 있습니다!
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
