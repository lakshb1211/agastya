import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChatMessage } from '../types';
import { apiChat } from '../services/api';
import { recordChatMessage } from '../services/storage';

export const Chatbot: React.FC = () => {
  const { isChatOpen, setIsChatOpen, lang, t, backendMaterialId, user } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! Ask me any question or doubt, from any subject, and I’ll explain it step by step.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isChatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChatOpen) {
        setIsChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen, setIsChatOpen]);

  const generateLocalHelp = (q: string): string => {
    const qLower = q.toLowerCase();
    if (qLower.includes('how to learn') || qLower.includes('study plan') || qLower.includes('habit')) {
      return `✦ Study Tip: Break your learning into 25-minute focused blocks. After uploading your study material in the "Learn" tab, take a diagnostic quiz to pinpoint exactly what to revise first!`;
    }
    if (qLower.includes('quiz') || qLower.includes('score')) {
      return `✦ You can generate practice quizzes directly from your notes or PDF in the "Learn" tab under "Quiz". Your progress will be saved and tracked in the Progress dashboard!`;
    }
    if (qLower.includes('account') || qLower.includes('save') || qLower.includes('sync')) {
      return `✦ Agastya automatically syncs your quiz scores, streaks, and materials when you log in. If running locally, everything is safely saved in your browser storage!`;
    }
    return `✦ Great question about "${q}"! To get the most accurate explanation based on your specific curriculum, paste your chapter notes or upload your textbook PDF in the Study Studio (Learn tab) and click "Explain" for a grounded step-by-step breakdown.`;
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;

    setInput('');
    const newMsg: ChatMessage = { role: 'user', content: q };
    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      let replyText = '';
      try {
        const res = await apiChat(q, messages, backendMaterialId, lang);
        if (res && res.reply) {
          replyText = res.reply;
        }
      } catch (err) {
        console.warn('Backend chat API offline, attempting client fallback:', err);
      }

      if (!replyText) {
        replyText = generateLocalHelp(q);
      }

      const botReply: ChatMessage = { role: 'assistant', content: replyText };
      setMessages((prev) => [...prev, botReply]);
      recordChatMessage(q, replyText, lang, user);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an issue. Please try again!' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        id="cbf"
        aria-label="Open chat assistant: resolve your doubts"
        onClick={() => setIsChatOpen((prev) => !prev)}
      >
        <svg className="cbs" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff1c4" />
              <stop offset="1" stopColor="#f5cd78" />
            </linearGradient>
          </defs>
          <path
            d="M50 4 L61 37 L96 38 L68 59 L78 94 L50 73 L22 94 L32 59 L4 38 L39 37 Z"
            fill="url(#sg)"
            stroke="#fff6dc"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <ellipse cx="42" cy="50" rx="2.6" ry="3.4" fill="#3a2a10" />
          <ellipse cx="58" cy="50" rx="2.6" ry="3.4" fill="#3a2a10" />
          <circle cx="37.5" cy="58" r="3" fill="#ffb3a0" opacity=".7" />
          <circle cx="62.5" cy="58" r="3" fill="#ffb3a0" opacity=".7" />
          <path
            d="M42 56 Q50 65 58 56"
            fill="none"
            stroke="#3a2a10"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        <span className="cbl">{t('Resolve your doubts')}</span>
      </button>

      {isChatOpen && (
        <div id="cb" role="dialog" aria-label="Chat assistant">
          <div className="ch">
            <span>{t('✦ Agastya Assistant')}</span>
            <button
              id="cbx"
              aria-label="Close chat"
              onClick={() => setIsChatOpen(false)}
            >
              ✕
            </button>
          </div>

          <div id="cm" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`m ${m.role === 'user' ? 'u' : 'b'}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="m b">Thinking…</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="cf">
            <input
              ref={inputRef}
              id="ci"
              placeholder={t('Type your question…')}
              aria-label="Your question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button className="b2" id="cs" onClick={handleSend} disabled={loading || !input.trim()}>
              {t('Send')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
