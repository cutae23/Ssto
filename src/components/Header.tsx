import React, { useState } from 'react';
import { User, ShieldAlert, Award, Clock, RefreshCw } from 'lucide-react';

interface HeaderProps {
  nickname: string;
  onChangeNickname: (name: string) => void;
  onResetData: () => void;
  isSimulating: boolean;
  isAiProtected: boolean;
  isAiUnlocked: boolean;
  onOpenPasscodeModal: () => void;
}

export default function Header({ 
  nickname, 
  onChangeNickname, 
  onResetData, 
  isSimulating,
  isAiProtected,
  isAiUnlocked,
  onOpenPasscodeModal
}: HeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(nickname);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onChangeNickname(tempName.trim());
      setIsEditing(false);
    }
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4" id="app-header">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        {/* Logo and Brand Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 font-mono text-xl font-bold text-zinc-950">
            S
          </div>
          <div>
            <h1 className="font-sans text-xl font-black tracking-tight text-zinc-100 flex items-center gap-1.5Gradient hover:opacity-90">
              Stock-er <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.2 rounded">PRO</span>
            </h1>
            <p className="text-xs text-zinc-400">실시간 차트 · 테마 인포그래픽 · 내 주식 그룹핑</p>
          </div>
        </div>

        {/* Info Indicators & Guest Controller */}
        <div className="flex items-center flex-wrap gap-4">
          {/* Active Simulation Pulse */}
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className={`h-2 w-2 rounded-full bg-emerald-400 ${isSimulating ? 'animate-pulse' : ''}`} />
            실시간 모의체험 진행중
          </div>

          {/* AI Access Lock Indicator */}
          {isAiProtected ? (
            isAiUnlocked ? (
              <button
                onClick={onOpenPasscodeModal}
                className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                title="액세스 코드가 인증되었습니다. AI 리포트 기능이 안전하게 제공되고 있습니다."
                id="indicator-ai-unlock"
              >
                <Award className="h-3.5 w-3.5 animate-bounce" />
                AI 인포 해제됨 (소유자 모드)
              </button>
            ) : (
              <button
                onClick={onOpenPasscodeModal}
                className="flex items-center gap-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20 transition-all cursor-pointer"
                title="소유자 제한 AI 기능 (액세스 코드 입력 필요)"
                id="indicator-ai-lock"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                AI 기능 잠김 (해제)
              </button>
            )
          ) : (
            <div
              className="flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-3 py-1 text-xs font-medium text-zinc-400 border border-zinc-800"
              title="현재 서버에 잠금이 구성되지 않아 누구나 무료로 AI를 사용할 수 있습니다."
              id="indicator-ai-open"
            >
              <Award className="h-3.5 w-3.5 text-zinc-500" />
              AI 전체 공개중
            </div>
          )}

          {/* Guest Profile and Edit Form */}
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1.5 px-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
              <User className="h-4 w-4" />
            </div>
            
            {isEditing ? (
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={10}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-24 rounded bg-zinc-800 px-1.5 py-0.5 font-sans text-xs text-zinc-100 outline-none ring-1 ring-emerald-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-zinc-950 hover:bg-emerald-400"
                >
                  적용
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-left">
                  <div className="flex items-center gap-1 font-sans text-xs font-semibold text-zinc-200">
                    {nickname} <span className="text-[10px] text-zinc-500 font-normal">(게스트 모드)</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTempName(nickname);
                    setIsEditing(true);
                  }}
                  className="text-[10px] text-zinc-400 underline hover:text-zinc-200"
                  id="btn-edit-nick"
                >
                  변경
                </button>
              </div>
            )}
          </div>

          {/* Reset / Reset mock data simulation */}
          <button
            onClick={() => {
              if (window.confirm('관심종목, 알림 및 모의 포트폴리오를 초기 자산(₩10,000,000)으로 환원하시겠습니까?')) {
                onResetData();
              }
            }}
            className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all"
            title="모든 오프라인 데이터 초기화"
            id="btn-reset-app"
          >
            <RefreshCw className="h-3 w-3" />
            자산 및 설정 리셋
          </button>
        </div>
      </div>
    </header>
  );
}
