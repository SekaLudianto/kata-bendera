
import React, { useState, useEffect } from 'react';
// FIX: Added AnimatePresence to framer-motion import
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeIcon } from './IconComponents';
import { DEFAULT_MAX_WINNERS_PER_ROUND, ABSOLUTE_MAX_WINNERS } from '../constants';
import { GameStyle } from '../types';

interface SetupScreenProps {
  onStart: (username: string, maxWinners: number, gameStyle: GameStyle) => void;
  error: string | null;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, error }) => {
  const [username, setUsername] = useState(() => localStorage.getItem('tiktok-quiz-username') || '');
  const [maxWinners, setMaxWinners] = useState(() => {
    const saved = localStorage.getItem('tiktok-quiz-maxwinners');
    return saved ? parseInt(saved, 10) : DEFAULT_MAX_WINNERS_PER_ROUND;
  });
  const [gameStyle, setGameStyle] = useState<GameStyle>(GameStyle.Classic);


  useEffect(() => {
    localStorage.setItem('tiktok-quiz-username', username);
  }, [username]);

  useEffect(() => {
    localStorage.setItem('tiktok-quiz-maxwinners', String(maxWinners));
  }, [maxWinners]);

  const handleMaxWinnersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= ABSOLUTE_MAX_WINNERS) {
      setMaxWinners(value);
    } else if (e.target.value === '') {
      setMaxWinners(1);
    }
  };

  const handleStartGame = () => {
    if (username.trim()) {
      onStart(username.trim().replace(/^@/, ''), maxWinners, gameStyle);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleStartGame();
  };

  return (
    <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl transition-colors duration-300">
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        <motion.div
          animate={{ rotate: [0, 5, -5, 5, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <GlobeIcon className="w-20 h-20 text-sky-400" />
        </motion.div>
        <h1 className="text-3xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-500">
          Kuis Kata & Bendera Live
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Edisi TikTok Live</p>

        <form onSubmit={handleSubmit} className="w-full max-w-xs mt-6">
          <div className="relative mb-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-2 bg-sky-100 border-2 border-sky-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 dark:focus:border-sky-500"
              aria-label="TikTok Username"
              aria-describedby="error-message"
            />
          </div>
          
          <AnimatePresence mode="wait">
          {gameStyle === GameStyle.Classic && (
            <motion.div
              key="max-winners"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto', transition: { duration: 0.3 } }}
              exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
              className="overflow-hidden"
            >
              <div className="relative mb-3">
                 <label htmlFor="max-winners" className="block text-xs text-left text-gray-500 dark:text-gray-400 mb-1">Jumlah Pemenang per Ronde</label>
                <input
                  type="number"
                  id="max-winners"
                  value={maxWinners}
                  onChange={handleMaxWinnersChange}
                  min="1"
                  max={ABSOLUTE_MAX_WINNERS}
                  className="w-full px-4 py-2 bg-sky-100 border-2 border-sky-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 dark:focus:border-sky-500"
                  aria-label="Jumlah Pemenang Maksimum"
                />
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-2 mt-4">
              <button type="button" onClick={() => setGameStyle(GameStyle.Classic)} className={`px-4 py-2.5 font-bold rounded-lg transition-all text-sm ${gameStyle === GameStyle.Classic ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-sky-100 text-sky-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Klasik
              </button>
               <button type="button" onClick={() => setGameStyle(GameStyle.Knockout)} className={`px-4 py-2.5 font-bold rounded-lg transition-all text-sm ${gameStyle === GameStyle.Knockout ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-sky-100 text-sky-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Knockout
              </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!username.trim()}
            className="w-full mt-4 px-4 py-2.5 bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
          >
            Mulai Live
          </motion.button>
        </form>
        
        {error && (
            <motion.div
              id="error-message"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-2 w-full max-w-xs bg-red-100 text-red-700 border border-red-300 rounded-lg text-xs dark:bg-red-900/50 dark:text-red-300 dark:border-red-500/50"
              role="alert"
            >
              {error}
            </motion.div>
        )}
      </div>
    </div>
  );
};

export default SetupScreen;
