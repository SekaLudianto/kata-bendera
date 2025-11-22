
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../types';
import { commentatorLines } from '../data/commentator_lines';
import { useSound } from '../hooks/useSound';

interface GameOverScreenProps {
  leaderboard: LeaderboardEntry[];
  onRestart: () => void;
}

const getMedal = (rank: number) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return `${rank + 1}.`;
};

const GameOverScreen: React.FC<GameOverScreenProps> = ({ leaderboard, onRestart }) => {
  const topPlayers = leaderboard.slice(0, 10);
  const [comment, setComment] = useState('');
  const { playSound } = useSound();

  useEffect(() => {
    const randomComment = commentatorLines[Math.floor(Math.random() * commentatorLines.length)];
    setComment(randomComment);
    playSound('gameOver');
  }, [playSound]);

  return (
    <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl transition-colors duration-300">
      <div className="text-center shrink-0">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
          Permainan Selesai!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Berikut adalah papan peringkat akhir.</p>
      </div>

      <div className="flex-grow my-2 space-y-1.5 overflow-y-auto pr-2">
        {topPlayers.map((entry, index) => (
          <motion.div
            key={entry.nickname}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.08 }}
            className="flex items-center p-2 bg-sky-50 dark:bg-gray-700/60 rounded-lg"
          >
            <div className="w-8 font-bold text-md text-center text-amber-500 dark:text-amber-400">{getMedal(index)}</div>
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
        ))}
         {topPlayers.length === 0 && (
            <p className="text-center text-gray-500 pt-10">Tidak ada skor yang tercatat di permainan ini.</p>
        )}
      </div>

       {comment && (
          <motion.div 
            className="my-2 py-2 border-t border-dashed border-sky-200 dark:border-gray-600 shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + (Math.min(topPlayers.length, 5) * 0.1) }}
          >
            <p className="text-xs text-slate-500 dark:text-gray-400 font-semibold mb-1">Komentator Kocak Berkata:</p>
            <p className="text-sm italic text-sky-600 dark:text-sky-300">
                "{comment}"
            </p>
          </motion.div>
        )}

       <div className="text-center pt-2 shrink-0 border-t border-sky-100 dark:border-gray-700">
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRestart}
            className="w-full mt-2 px-4 py-2.5 bg-sky-500 text-white font-bold rounded-lg shadow-lg shadow-sky-500/30 hover:bg-sky-600 transition-all"
        >
          Kembali ke Awal
        </motion.button>
    </div>
    </div>
  );
};

export default GameOverScreen;
