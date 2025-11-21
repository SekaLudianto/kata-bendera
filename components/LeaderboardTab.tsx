import React from 'react';
import { LeaderboardEntry } from '../types';
import { motion } from 'framer-motion';

interface LeaderboardTabProps {
  leaderboard: LeaderboardEntry[];
}

const getMedal = (rank: number) => {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return `${rank + 1}.`;
};

const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ leaderboard }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-3 flex flex-col h-full"
    >
      <h2 className="text-md font-semibold mb-2 text-center shrink-0">Papan Peringkat Global</h2>
      <div className="flex-grow overflow-y-auto pr-1">
        <div className="space-y-1.5">
            {leaderboard.map((entry, index) => (
            <motion.div
                key={entry.nickname}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center p-2 bg-sky-50 dark:bg-gray-700/60 rounded-lg"
            >
                <div className="w-7 font-bold text-md text-center text-amber-500 dark:text-amber-400">{getMedal(index)}</div>
                <img
                src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'}
                alt={entry.nickname}
                className="w-8 h-8 rounded-full mx-2"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{entry.nickname}</p>
                </div>
                <div className="text-sky-500 dark:text-sky-400 font-bold text-sm">{entry.score.toLocaleString()}</div>
            </motion.div>
            ))}
            {leaderboard.length === 0 && (
                <p className="text-center text-slate-500 dark:text-gray-500 pt-10 text-sm">Papan peringkat masih kosong. Mainkan ronde untuk mendapatkan skor!</p>
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default LeaderboardTab;