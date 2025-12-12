
import React, { useState } from 'react';
import { LeaderboardEntry } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, TrophyIcon, CrownIcon, GiftIcon } from './IconComponents';

interface LeaderboardTabProps {
  leaderboard: LeaderboardEntry[];
  gifterLeaderboard: LeaderboardEntry[];
}

const getMedal = (rank: number) => {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return `${rank + 1}.`;
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
      className="flex flex-col h-full"
    >
      <div className="p-3 pb-2 shrink-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl mb-3">
            <button
                onClick={() => setActiveView('score')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeView === 'score' 
                    ? 'bg-white text-sky-600 shadow-sm dark:bg-gray-700 dark:text-sky-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
            >
                <TrophyIcon className="w-3.5 h-3.5" />
                Top Skor
            </button>
            <button
                onClick={() => setActiveView('gifter')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeView === 'gifter' 
                    ? 'bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
            >
                <CrownIcon className="w-3.5 h-3.5" />
                Top Sultan
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="w-4 h-4 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder="Cari nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 dark:focus:border-sky-500"
            />
          </div>
      </div>

      <div className="flex-grow overflow-y-auto px-3 pb-3">
        <div className="space-y-2">
            <AnimatePresence mode="popLayout">
            {filteredLeaderboard.map((entry, index) => {
                const isTop1 = index === 0;
                const isTop3 = index < 3;
                
                // Styling specifically for the Gifter Leaderboard
                const isGifterView = activeView === 'gifter';
                
                let rankColorClass = "text-slate-500 dark:text-gray-400";
                let bgClass = "bg-sky-50 dark:bg-gray-700/50";
                let borderClass = "";

                if (isTop3 && isGifterView) {
                     if (index === 0) { // Gold
                         bgClass = "bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30";
                         borderClass = "border-l-4 border-yellow-400";
                         rankColorClass = "text-yellow-600 dark:text-yellow-400";
                     } else if (index === 1) { // Silver
                         bgClass = "bg-gradient-to-r from-slate-100 to-gray-200 dark:from-slate-800/50 dark:to-gray-800/50";
                         borderClass = "border-l-4 border-slate-400";
                         rankColorClass = "text-slate-600 dark:text-slate-400";
                     } else { // Bronze
                         bgClass = "bg-gradient-to-r from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30";
                         borderClass = "border-l-4 border-orange-400";
                         rankColorClass = "text-orange-600 dark:text-orange-400";
                     }
                } else if (isTop3 && !isGifterView) {
                    rankColorClass = "text-amber-500 dark:text-amber-400";
                }

                return (
                <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                    className={`flex items-center p-2 rounded-xl transition-colors ${bgClass} ${borderClass}`}
                >
                    <div className={`w-8 font-bold text-md text-center shrink-0 ${rankColorClass}`}>
                        {getMedal(index)}
                    </div>
                    
                    <div className="relative shrink-0 mx-2">
                        <img
                        src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'}
                        alt={entry.nickname}
                        className={`w-9 h-9 rounded-full object-cover ${isTop1 && isGifterView ? 'border-2 border-yellow-400' : ''}`}
                        />
                         {isTop1 && isGifterView && (
                             <div className="absolute -top-3 left-1/2 -translate-x-1/2 drop-shadow-sm">
                                <CrownIcon className="w-5 h-5 text-yellow-500 fill-yellow-200" />
                             </div>
                         )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${isTop3 && isGifterView ? 'text-slate-800 dark:text-white' : 'text-slate-700 dark:text-gray-200'}`}>
                            {entry.nickname}
                        </p>
                        {isGifterView && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                Sultan
                            </p>
                        )}
                    </div>

                    <div className="text-right shrink-0 pl-2">
                        <div className={`font-bold text-sm ${isGifterView ? 'text-pink-500 dark:text-pink-400' : 'text-sky-500 dark:text-sky-400'}`}>
                            {entry.score.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium uppercase">
                            {isGifterView ? 'Gifts' : 'Poin'}
                        </div>
                    </div>
                </motion.div>
                );
            })}
            </AnimatePresence>
            
            {activeList.length === 0 && (
                <div className="text-center py-10">
                    <p className="text-slate-500 dark:text-gray-500 text-sm">
                        {activeView === 'score' ? 'Belum ada skor masuk.' : 'Belum ada gift yang diterima.'}
                    </p>
                </div>
            )}
            
            {filteredLeaderboard.length === 0 && activeList.length > 0 && (
                 <p className="text-center text-slate-500 dark:text-gray-500 pt-10 text-sm">Pencarian tidak ditemukan.</p>
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default LeaderboardTab;
