
import React, { useState } from 'react';
import { LeaderboardEntry } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, TrophyIcon, CrownIcon } from './IconComponents';

interface LeaderboardTabProps {
  leaderboard: LeaderboardEntry[];
  gifterLeaderboard: LeaderboardEntry[];
}

const getMedal = (rank: number) => {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return `#${rank + 1}`;
};

const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ leaderboard, gifterLeaderboard }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'score' | 'gifter'>('score');

  const activeList = activeView === 'score' ? leaderboard : gifterLeaderboard;

  const filteredLeaderboard = activeList.filter(entry =>
    entry.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-slate-950/20"
    >
      <div className="p-4 pb-3 shrink-0 z-10">
          <div className="flex p-1 bg-slate-900 rounded-2xl mb-4 border border-white/5">
            <button
                onClick={() => setActiveView('score')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeView === 'score' 
                    ? 'bg-slate-800 text-sky-400 shadow-lg border border-white/10' 
                    : 'text-slate-500'
                }`}
            >
                <TrophyIcon className="w-4 h-4" />
                TOP SKOR
            </button>
            <button
                onClick={() => setActiveView('gifter')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeView === 'gifter' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg border border-amber-400/30' 
                    : 'text-slate-500'
                }`}
            >
                <CrownIcon className="w-4 h-4" />
                TOP GIFTER
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <SearchIcon className="w-4 h-4 text-slate-500" />
            </div>
            <input
                type="text"
                placeholder="Cari pemain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900 border border-white/5 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium"
            />
          </div>
      </div>

      <div className="flex-grow overflow-y-auto px-4 pb-4 no-scrollbar">
        <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
            {filteredLeaderboard.map((entry, index) => {
                const isTop1 = index === 0;
                const isTop3 = index < 3;
                const isGifterView = activeView === 'gifter';
                
                let rankColorClass = "text-slate-500 font-bold";
                let bgClass = "bg-slate-900/40 border-white/5";
                let borderClass = "";

                if (isTop3) {
                    rankColorClass = "text-amber-400 font-black text-lg";
                    if (index === 0) bgClass = "bg-slate-800 border-sky-500/20";
                }

                return (
                <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    layout
                    className={`flex items-center p-3 rounded-2xl border transition-all ${bgClass} ${borderClass}`}
                >
                    <div className={`w-10 text-center shrink-0 ${rankColorClass}`}>
                        {getMedal(index)}
                    </div>
                    
                    <div className="relative shrink-0 mx-3">
                        <img
                        src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'}
                        alt={entry.nickname}
                        className={`w-10 h-10 rounded-full object-cover border-2 ${isTop1 ? 'border-amber-400' : 'border-white/10'}`}
                        />
                         {isTop1 && isGifterView && (
                             <div className="absolute -top-3 left-1/2 -translate-x-1/2 drop-shadow-md">
                                <CrownIcon className="w-5 h-5 text-amber-500 fill-amber-300" />
                             </div>
                         )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-100 truncate tracking-wide">
                            {entry.nickname}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                            {isGifterView ? 'Contributor' : 'Pemain'}
                        </p>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                        <div className={`font-black text-sm ${isGifterView ? 'text-pink-400' : 'text-sky-400'}`}>
                            {entry.score.toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                            {isGifterView ? 'COINS' : 'POIN'}
                        </div>
                    </div>
                </motion.div>
                );
            })}
            </AnimatePresence>
            
            {activeList.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-600 font-bold text-sm tracking-widest uppercase">
                        Belum ada data...
                    </p>
                </div>
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default LeaderboardTab;
