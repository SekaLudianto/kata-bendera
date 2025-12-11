import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeaderboardEntry } from '../types';
import { PlayIcon } from './IconComponents';

interface GlobalLeaderboardModalProps {
  leaderboard: LeaderboardEntry[];
  onClose: () => void;
}

const getMedal = (rank: number) => {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return `${rank + 1}.`;
};

const formatDateTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    };
    const dateString = date.toLocaleDateString('id-ID', options);
    const timeString = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${dateString} - ${timeString}`;
};

const GlobalLeaderboardModal: React.FC<GlobalLeaderboardModalProps> = ({ leaderboard, onClose }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScrolling, setIsScrolling] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  useLayoutEffect(() => {
    const element = listRef.current;
    if (element) {
        setCanScroll(element.scrollHeight > element.clientHeight);
    }
  }, [leaderboard]);
  
  useEffect(() => {
    if (!isScrolling) return;

    const element = listRef.current;
    if (!element) return;

    let animationFrameId: number;
    const scrollSpeed = 30; // pixels per second
    let lastTime = performance.now();

    const scroll = (now: number) => {
      const elapsed = now - lastTime;
      lastTime = now;
      const distance = (scrollSpeed / 1000) * elapsed;

      if (element.scrollTop < element.scrollHeight - element.clientHeight) {
        element.scrollTop += distance;
        animationFrameId = requestAnimationFrame(scroll);
      } else {
        setTimeout(() => setIsScrolling(false), 1000); // Wait a bit at the end
      }
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isScrolling]);

  const handleAutoScroll = () => {
    const element = listRef.current;
    if (element && !isScrolling) {
      element.scrollTop = 0;
      setIsScrolling(true);
    }
  };


  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-full max-w-sm h-[80vh] max-h-[600px] bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl shimmer-title shrink-0">
            Peringkat Global
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 shrink-0 font-mono">
            {formatDateTime(currentTime)}
          </p>
          <div className="w-full overflow-hidden whitespace-nowrap my-2 shrink-0">
              <motion.div 
                className="text-xs text-gray-500 dark:text-gray-400 inline-block min-w-full"
                initial={{ x: "100%" }}
                animate={{ x: "-100%" }}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
              >
                Selamat untuk para juara! ✨ Terus tingkatkan skormu! ✨ Jangan menyerah, kesempatan masih terbuka lebar! ✨
              </motion.div>
          </div>
          
          <div ref={listRef} className="flex-grow overflow-y-auto pr-2 space-y-1.5 no-scrollbar">
            {leaderboard.map((entry, index) => {
              const isTop3 = index < 3;
              return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center p-2 rounded-lg transition-colors duration-300 ${
                    isTop3
                    ? 'bg-amber-100 dark:bg-amber-500/20 border-l-4 border-amber-400'
                    : 'bg-sky-50 dark:bg-gray-700/60'
                }`}
              >
                <div className={`w-8 font-bold text-md text-center ${
                    isTop3
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-amber-500 dark:text-amber-400'
                }`}>{getMedal(index)}</div>
                <img
                  src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'}
                  alt={entry.nickname}
                  className="w-8 h-8 rounded-full mx-2"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{entry.nickname}</p>
                </div>
                <div className="text-sky-500 dark:text-sky-400 font-bold text-sm">{entry.score.toLocaleString()}</div>
              </motion.div>
            )})}
            {leaderboard.length === 0 && (
              <p className="text-center text-slate-500 dark:text-gray-500 pt-10 text-sm">Papan peringkat masih kosong.</p>
            )}
          </div>

          <div className="mt-4 flex gap-2 shrink-0">
            <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-all text-sm"
            >
                Tutup
            </button>
            <button
                onClick={handleAutoScroll}
                disabled={!canScroll || isScrolling}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
                <PlayIcon className="w-4 h-4" />
                {isScrolling ? 'Menggulir...' : 'Auto Scroll'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalLeaderboardModal;