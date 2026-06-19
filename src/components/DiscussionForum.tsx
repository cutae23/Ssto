import React, { useState, useEffect } from 'react';
import { DiscussionPost, Stock } from '../types';
import { MessageSquare, Send, Award, Heart, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

interface DiscussionForumProps {
  stock: Stock;
  nickname: string;
}

export default function DiscussionForum({ stock, nickname }: DiscussionForumProps) {
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch discussions whenever stock updates
  const fetchDiscussions = async () => {
    try {
      const res = await fetch(`/api/stocks/${stock.symbol}/discussions`);
      if (res.ok) {
        const data = await res.ok ? await res.json() : [];
        setPosts(data);
        setError('');
      }
    } catch (e) {
      console.error('Error fetching discussions:', e);
      setError('토론글을 불러오는 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchDiscussions();
    // Poll for new user or AI messages every 3 seconds to keep it live
    const interval = setInterval(fetchDiscussions, 3500);
    return () => clearInterval(interval);
  }, [stock.symbol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const passcode = localStorage.getItem('sa_ai_access_code') || '';
      const res = await fetch(`/api/stocks/${stock.symbol}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-access-code': passcode
        },
        body: JSON.stringify({
          username: nickname,
          content: content.trim(),
        }),
      });

      if (res.ok) {
        setContent('');
        const newPost = await res.json();
        setPosts(prev => [newPost, ...prev]);
        setError('');
      } else {
        setError('게시글 등록에 실패했습니다.');
      }
    } catch (err) {
      console.error('Discussion submission target err:', err);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (id: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === id) {
          return { ...p, likes: p.likes + 1 };
        }
        return p;
      })
    );
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col h-[500px]" id="discussion-forum-panel">
      {/* Panel Header */}
      <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-400" />
          <h3 className="font-sans text-base font-bold text-zinc-100">
            {stock.name} 실시간 토론망
          </h3>
        </div>
      </div>

      {/* Discussion message creation form */}
      <form onSubmit={handleSubmit} className="mb-4" id="form-add-comment">
        <div className="relative">
          <input
            type="text"
            placeholder={`${nickname}님, 이 종목에 대해 어떤 생각이 드시나요?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-4 pr-12 font-sans text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
            id="comment-input"
          />
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <div className="mt-1 flex items-center gap-1 font-sans text-[11px] text-rose-400">
            <AlertCircle className="h-3 w-3" /> {error}
          </div>
        )}
      </form>

      {/* Message Boards Grid List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {posts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-zinc-500">
            <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">아직 토론이 없습니다.</p>
            <p className="text-[10px] opacity-80">첫 주주의 목소리를 던져보세요!</p>
          </div>
        ) : (
          posts.map((post) => {
            const isBot = post.isAi || post.username.includes('AI');
            const isSelf = post.username === nickname;

            return (
              <div
                key={post.id}
                className={`group rounded-xl p-3 border text-left transition-all ${
                  isBot
                    ? 'border-emerald-900/30 bg-emerald-500/5 hover:border-emerald-500/20'
                    : isSelf
                    ? 'border-zinc-700 bg-zinc-800/40'
                    : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-800'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {isBot && (
                      <span className="flex items-center gap-0.5 rounded bg-emerald-500/20 text-emerald-400 px-1 py-0.5 text-[9px] font-bold">
                        <Sparkles className="h-2 w-2" /> AI 수석답글
                      </span>
                    )}
                    <span className={`font-sans text-xs font-bold ${
                      isBot ? 'text-emerald-400' : isSelf ? 'text-amber-300' : 'text-zinc-300'
                    }`}>
                      {post.username}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-zinc-500">
                    {post.timestamp}
                  </span>
                </div>

                {/* Message Body */}
                <p className="font-sans text-xs text-zinc-200 leading-relaxed mb-2">
                  {post.content}
                </p>

                {/* Like Button */}
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-1 font-mono text-[10px] text-zinc-500 hover:text-rose-400 active:scale-95 transition-all"
                  >
                    <Heart className="h-3 w-3 hover:fill-rose-400/20" />
                    <span>좋아요 {post.likes}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
