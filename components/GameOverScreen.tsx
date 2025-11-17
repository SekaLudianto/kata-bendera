
import React from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../types';

interface GameOverScreenProps {
  leaderboard: LeaderboardEntry[];
}

const getMedal = (rank: number) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return `${rank + 1}.`;
};

const GameOverScreen: React.FC<GameOverScreenProps> = ({ leaderboard }) => {
  const topPlayers = leaderboard.slice(0, 10);

  return (
    <div className="flex flex-col h-full p-4 bg-gray-900 rounded-3xl">
      <div className="text-center shrink-0">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
          Permainan Selesai!
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Berikut adalah papan peringkat akhir.</p>
      </div>

      <div className="flex-grow my-2 space-y-1.5 overflow-y-auto pr-2">
        {topPlayers.map((entry, index) => (
          <motion.div
            key={entry.nickname}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.08 }}
            className="flex items-center p-2 bg-gray-800 rounded-lg"
          >
            <div className="w-8 font-bold text-md text-center text-amber-400">{getMedal(index)}</div>
            <img
              src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'}
              alt={entry.nickname}
              className="w-8 h-8 rounded-full mx-2"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white truncate">{entry.nickname}</p>
            </div>
            <div className="text-sky-400 font-bold text-sm">{entry.score.toLocaleString()}</div>
          </motion.div>
        ))}
         {topPlayers.length === 0 && (
            <p className="text-center text-gray-500 pt-10">Tidak ada skor yang tercatat di permainan ini.</p>
        )}
      </div>
       <div className="text-center pt-2 shrink-0 border-t border-gray-700">
        <p className="text-sky-300 font-semibold animate-pulse text-sm">
            Ketik <code className="bg-gray-700 text-white px-2 py-1 rounded">!next</code> di kolom komentar untuk memulai lagi!
        </p>
    </div>
    </div>
  );
};

export default GameOverScreen;
