
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnockoutPlayer } from '../types';

interface KnockoutRegistrationScreenProps {
  players: KnockoutPlayer[];
  timeRemaining: number;
}

const KnockoutRegistrationScreen: React.FC<KnockoutRegistrationScreenProps> = ({ players, timeRemaining }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl"
    >
      <div className="text-center shrink-0">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
          Mode Knockout!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Pendaftaran akan ditutup dalam...</p>
        <div className="text-6xl font-bold text-red-500 my-2">
            {timeRemaining}
        </div>
        <p className="text-sky-500 dark:text-sky-300 font-semibold animate-pulse text-lg">
            Ketik <code className="bg-sky-100 text-sky-800 dark:bg-gray-700 dark:text-white px-2 py-1 rounded">!ikut</code> untuk bergabung!
        </p>
      </div>

      <div className="flex-grow my-4 overflow-y-auto pr-2">
        <h2 className="text-md font-semibold mb-2 text-center text-slate-600 dark:text-gray-300">
          Pemain Terdaftar ({players.length})
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <AnimatePresence>
            {players.map((player) => (
              <motion.div
                key={player.nickname}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
                className="flex items-center gap-2 p-1.5 bg-sky-50 dark:bg-gray-700/60 rounded-md"
              >
                <img src={player.profilePictureUrl} alt={player.nickname} className="w-6 h-6 rounded-full" />
                <span className="truncate font-medium">{player.nickname}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {players.length === 0 && (
             <p className="text-center text-gray-500 pt-10 text-sm">Belum ada pemain yang mendaftar...</p>
        )}
      </div>
    </motion.div>
  );
};

export default KnockoutRegistrationScreen;
