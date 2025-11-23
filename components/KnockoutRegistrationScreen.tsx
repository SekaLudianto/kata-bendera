import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnockoutPlayer, KnockoutChampions } from '../types';

interface KnockoutRegistrationScreenProps {
  players: KnockoutPlayer[];
  onEndRegistration: () => void;
  onResetRegistration: () => void;
  champions: KnockoutChampions;
}

const KnockoutRegistrationScreen: React.FC<KnockoutRegistrationScreenProps> = ({ players, onEndRegistration, onResetRegistration, champions }) => {
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
        <p className="text-gray-500 dark:text-gray-400 mt-1">Pendaftaran dibuka!</p>
        <p className="text-sky-500 dark:text-sky-300 font-semibold animate-pulse text-lg my-2">
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
                <img src={player.profilePictureUrl} alt={player.nickname} className="w-6 h-6 rounded-full shrink-0" />
                <span className="truncate font-medium flex-1 min-w-0">{player.nickname}</span>
                {champions[player.nickname] && (
                    <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                        <span className="text-xs">🏆</span>
                        <span className="text-xs font-bold">{champions[player.nickname]}</span>
                    </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {players.length === 0 && (
             <p className="text-center text-gray-500 pt-10 text-sm">Belum ada pemain yang mendaftar...</p>
        )}
      </div>

      <div className="shrink-0 mt-auto pt-4 border-t border-sky-100 dark:border-gray-700">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onEndRegistration}
          disabled={players.length < 2}
          className="w-full px-4 py-3 bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
        >
          Mulai Drawing Bagan
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onResetRegistration}
          className="w-full mt-2 px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all"
        >
          Ulang Pendaftaran (Kosongkan Daftar)
        </motion.button>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">Minimal 2 pemain untuk memulai.</p>
      </div>
    </motion.div>
  );
};

export default KnockoutRegistrationScreen;