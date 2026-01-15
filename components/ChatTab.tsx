
import React, { useRef, useLayoutEffect } from 'react';
import { ChatMessage } from '../types';
import { motion } from 'framer-motion';

interface ChatTabProps {
  messages: ChatMessage[];
}

const formatTimestamp = (ms: number | undefined): string => {
    if (!ms) return '';
    const date = new Date(ms);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const ChatTab: React.FC<ChatTabProps> = ({ messages }) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
  }, [messages]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-4 flex flex-col h-full overflow-hidden"
    >
      <div className="flex items-center mb-3 shrink-0">
        <h2 className="text-md font-extrabold uppercase tracking-widest text-slate-100">Live Chat</h2>
        <div className="ml-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
          </span>
          <span className="text-red-500 text-[10px] font-black tracking-widest uppercase">LIVE</span>
        </div>
      </div>
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto pr-1 no-scrollbar">
        <div className="space-y-2">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              layout
              className={`p-2.5 rounded-2xl flex items-start gap-3 transition-colors ${
                msg.isWinner 
                ? 'bg-amber-500/10 border border-amber-500/30' 
                : 'bg-slate-900/40 border border-white/5'
              }`}
            >
              <img
                src={msg.profilePictureUrl || 'https://i.pravatar.cc/40'}
                alt={msg.nickname}
                className="w-8 h-8 rounded-full shrink-0 border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`font-bold text-xs truncate ${msg.isWinner ? 'text-amber-400' : 'text-sky-400'}`}>
                    {msg.nickname}
                  </p>
                  <span className="text-[9px] text-slate-500 font-mono font-bold shrink-0">{formatTimestamp(msg.timestamp)}</span>
                </div>
                <p className="text-slate-100 text-sm leading-snug break-words font-medium">{msg.comment}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatTab;
