
import React from 'react';
import { motion } from 'framer-motion';
import { QuoteNotification } from '../types';

const QuoteDisplay: React.FC<QuoteNotification> = ({ nickname, profilePictureUrl, content }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="w-full mb-2 relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-100/90 to-fuchsia-100/90 dark:from-violet-900/60 dark:to-fuchsia-900/60 border border-white/50 dark:border-white/10 shadow-lg backdrop-blur-md"
    >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-purple-400/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-pink-400/30 rounded-full blur-xl"></div>

        <div className="relative z-10 p-3 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] tracking-[0.2em] font-bold text-violet-600 dark:text-violet-300 uppercase">
                    ✨ Kata-Kata Hari Ini ✨
                </span>
            </div>
            
            <div className="flex items-center gap-2 w-full justify-center mb-1">
                <img 
                    src={profilePictureUrl || 'https://i.pravatar.cc/40'} 
                    alt={nickname} 
                    className="w-5 h-5 rounded-full border border-white dark:border-gray-600 shadow-sm"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                    {nickname}
                </span>
            </div>

            <div className="relative px-4 py-1">
                <span className="absolute top-0 left-0 text-2xl text-violet-400/50 font-serif leading-none">"</span>
                <p className="text-sm font-medium italic text-slate-800 dark:text-white font-serif leading-tight">
                    {content}
                </p>
                <span className="absolute bottom-0 right-0 text-2xl text-violet-400/50 font-serif leading-none">"</span>
            </div>
        </div>
    </motion.div>
  );
};

export default QuoteDisplay;
