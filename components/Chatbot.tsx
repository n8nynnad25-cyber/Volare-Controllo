
import React, { useState, useRef, useEffect } from 'react';
import { AppState, User } from '../types';
import { chatWithAI } from '../geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatbotProps {
  appState: AppState;
  user: User | null;
}

interface Message {
  role: 'bot' | 'user';
  text: string;
  time: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ appState, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const userName = user?.name ? user.name.split(' ')[0] : 'Gestor';

  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: `👋 Olá ${userName}! Sou o assistente da Volare. Como posso ajudar com os dados de hoje?`, time: '09:00' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: userMsg, time }]);

    setIsTyping(true);
    try {
      const botResponse = await chatWithAI(userMsg, appState, user?.name || 'Gestor');
      setMessages(prev => [...prev, {
        role: 'bot',
        text: botResponse || 'Desculpe, tive um problema ao processar sua consulta.',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', text: 'Erro ao conectar com a IA.', time }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          if (!isOpen) {
            setMessages([{
              role: 'bot',
              text: `👋 Olá ${userName}! Sou o assistente da Volare. Como posso ajudar com os dados de hoje?`,
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }]);
          }
          setIsOpen(!isOpen);
        }}
        className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/40 transition-all hover:scale-110 active:scale-95"
      >
        <span className="material-symbols-outlined text-[32px]">{isOpen ? 'close' : 'smart_toy'}</span>
        {!isOpen && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-20"></span>}
      </button>

      {isOpen && (
        <aside className="fixed inset-y-0 right-0 w-full md:w-[420px] bg-white shadow-2xl border-l border-slate-100 z-[60] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">smart_toy</span>
                </div>
                <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-none">Volare Assistant</h3>
                <p className="text-xs text-primary font-medium mt-1">Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-200 text-slate-400">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-4 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse ml-auto' : ''}`}>
                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${m.role === 'bot' ? 'bg-primary text-white' : 'bg-slate-300 text-slate-600'}`}>
                  <span className="material-symbols-outlined text-[16px]">{m.role === 'bot' ? 'smart_toy' : 'person'}</span>
                </div>
                <div className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : ''}`}>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{m.role === 'bot' ? 'Volare Bot' : 'Você'} • {m.time}</span>
                  <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ring-1 ring-black/5 ${m.role === 'bot' ? 'bg-white text-slate-700 rounded-tl-none' : 'bg-primary text-white rounded-tr-none'}`}>
                    <div className="prose prose-sm prose-slate max-w-none 
                      prose-strong:text-slate-900 prose-strong:font-black
                      prose-p:leading-relaxed prose-li:my-1
                      dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-4 max-w-[90%] animate-pulse">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <span className="material-symbols-outlined text-primary text-[16px]">smart_toy</span>
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1 h-10">
                  <span className="block size-1.5 bg-slate-300 rounded-full"></span>
                  <span className="block size-1.5 bg-slate-300 rounded-full"></span>
                  <span className="block size-1.5 bg-slate-300 rounded-full"></span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0">
            <div className="relative flex items-end gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
              <textarea
                className="w-full bg-transparent border-none focus:ring-0 p-2 text-sm text-slate-900 placeholder-slate-400 resize-none max-h-32 min-h-[40px]"
                placeholder="Pergunte sobre vendas, caixa..."
                value={input}
                rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={isTyping}
                className="p-2 bg-primary hover:bg-primary-hover text-white rounded-lg shadow-md transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">IA pode cometer erros. Verifique os dados.</p>
          </div>
        </aside>
      )}
    </>
  );
};

export default Chatbot;
