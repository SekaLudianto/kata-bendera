
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../hooks/useSound';
import { Volume2Icon, VolumeXIcon, MusicIcon, MusicOffIcon } from './IconComponents';

const SoundToggle: React.FC = () => {
  const { isSfxMuted, isBgmMuted, toggleSfx, toggleBgm } = useSound();

  return (
    <div className="flex items-center gap-2">
      {/* BGM Toggle */}
      <button
        onClick={toggleBgm}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-sky-500"
        aria-label="Toggle BGM"
        title="Musik Latar (BGM)"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={isBgmMuted ? 'bgm-muted' : 'bgm-unmuted'}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute"
          >
            {isBgmMuted ? (
              <MusicOffIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <MusicIcon className="w-5 h-5 text-purple-500" />
            )}
          </motion.div>
        </AnimatePresence>
      </button>

      {/* SFX Toggle */}
      <button
        onClick={toggleSfx}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-sky-500"
        aria-label="Toggle SFX"
        title="Efek Suara (SFX)"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={isSfxMuted ? 'sfx-muted' : 'sfx-unmuted'}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute"
          >
            {isSfxMuted ? (
              <VolumeXIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <Volume2Icon className="w-5 h-5 text-sky-500" />
            )}
          </motion.div>
        </AnimatePresence>
      </button>
    </div>
  );
};

export default SoundToggle;
