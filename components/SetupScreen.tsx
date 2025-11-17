import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlobeIcon } from './IconComponents';

interface SetupScreenProps {
  onStart: (username: string) => void;
  error: string | null;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, error }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onStart(username.trim().replace(/^@/, '')); // Remove leading @ if present
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-900 rounded-3xl">
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        <motion.div
          animate={{ rotate: [0, 5, -5, 5, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <GlobeIcon className="w-20 h-20 text-sky-400" />
        </motion.div>
        <h1 className="text-3xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-teal-400">
          Kuis Kata & Bendera Live
        </h1>
        <p className="text-gray-400 mt-1">Edisi TikTok Live</p>

        <form onSubmit={handleSubmit} className="w-full max-w-xs mt-8">
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              aria-label="TikTok Username"
              aria-describedby="error-message"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!username.trim()}
            className="w-full mt-3 px-4 py-2.5 bg-sky-500 text-white font-bold rounded-lg shadow-lg shadow-sky-500/30 hover:bg-sky-600 transition-all disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
          >
            Mulai Live
          </motion.button>
        </form>
        
        {error && (
            <motion.div
              id="error-message"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-2 w-full max-w-xs bg-red-900/50 text-red-300 border border-red-500/50 rounded-lg text-xs"
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