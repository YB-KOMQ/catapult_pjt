
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/gemini';
import { ChatMessage } from '../types';

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: '안녕하세요! 한국경영품질연구원 AI 가이드입니다. 투석기 시뮬레이션과 실험계획법(DOE)에 대해 궁금한 점이 있으신가면 무엇이든 물어보세요.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const gemini = useRef(new GeminiService());

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await gemini.current.getChatResponse(messages, input);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "죄송합니다. 오류가 발생했습니다." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${isOpen ? 'w-96' : 'w-16 h-16'}`}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform"
        >
          <span className="text-2xl">🤖</span>
        </button>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[500px] overflow-hidden">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <span>🤖</span> KMQI AI 가이드
            </h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-500 rounded p-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-sm animate-pulse">생각 중...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="질문을 입력하세요..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={handleSend}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
