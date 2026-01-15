
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BirthdayEntry } from '../types';
import { useSound } from '../hooks/useSound';
import { birthdayWishes } from '../data/birthday_wishes';

interface BirthdayScreenProps {
  birthday: (BirthdayEntry & { userAvatar?: string }) | null;
  onClose: () => void;
}

const BirthdayScreen: React.FC<BirthdayScreenProps> = ({ birthday, onClose }) => {
  const { playSound } = useSound();
  
  // State untuk index doa
  const [wishIndex, setWishIndex] = useState(0);

  const confettiItems = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ['#f43f5e', '#fbbf24', '#10b981', '#3b82f6', '#8b5cf6', '#ffffff', '#ec4899'][Math.floor(Math.random() * 7)],
        size: Math.random() * 5 + 2,
        delay: Math.random() * 5
    }));
  }, []);

  const nextWish = useCallback(() => {
    setWishIndex(prev => (prev + 1) % birthdayWishes.length);
  }, []);

  // Handle Keyboard Arrow Right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextWish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextWish]);

  useEffect(() => {
    if (birthday) {
      playSound('birthday');
      // Set random index awal saat layar terbuka
      setWishIndex(Math.floor(Math.random() * birthdayWishes.length));
    }
  }, [birthday, playSound]);

  if (!birthday) return null;

  const currentWish = birthdayWishes[wishIndex];

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[60] bg-gradient-to-br from-slate-950 via-purple-950 to-rose-950 flex flex-col items-center justify-center text-center overflow-hidden p-3"
    >
        {/* White Flash on Enter */}
        <motion.div 
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-white z-[70] pointer-events-none"
        />

        {/* Confetti Rain */}
        {confettiItems.map((c) => (
            <motion.div
                key={c.id}
                initial={{ y: -50, x: `${c.x}%`, rotate: 0, opacity: 1 }}
                animate={{ 
                    y: '110vh', 
                    rotate: 360 * (Math.random() > 0.5 ? 2 : -2),
                    x: `${c.x + (Math.random() * 20 - 10)}%` 
                }}
                transition={{ 
                    duration: Math.random() * 3 + 2, 
                    repeat: Infinity, 
                    ease: "linear",
                    delay: c.delay 
                }}
                className="absolute rounded-sm shadow-md"
                style={{ 
                    backgroundColor: c.color,
                    width: c.size,
                    height: c.size * 1.5,
                    zIndex: 5
                }}
            />
        ))}

        <div className="relative z-20 flex flex-col items-center max-w-sm w-full h-full justify-center">
            {/* TULISAN HARI SPESIAL - Margin sangat ketat */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.3 }}
                className="mb-2"
            >
                <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 px-6 py-1.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-white/50 transform -rotate-1 font-black uppercase tracking-[0.2em] text-[9px]">
                   🌟 HARI SPESIAL ANDA 🌟
                </div>
            </motion.div>

            {/* Central Avatar - Ukuran Dikecilkan untuk Desktop */}
            <div className="relative mb-3">
                <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="relative inline-block"
                >
                    <div className="absolute inset-0 bg-amber-400 rounded-full blur-xl opacity-20" />
                    
                    <div className="relative p-1 bg-gradient-to-tr from-amber-600 via-amber-200 to-amber-600 rounded-full shadow-xl">
                        <img 
                            src={birthday.userAvatar || `https://i.pravatar.cc/150?u=${birthday.userId}`} 
                            alt={birthday.nickname} 
                            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-white object-cover relative z-10"
                        />
                    </div>

                    <motion.div
                        initial={{ y: 30, opacity: 0, scale: 0 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, type: 'spring' }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 text-5xl filter drop-shadow-md z-20"
                    >
                        👑
                    </motion.div>
                </motion.div>
            </div>

            {/* Typography - Spasi dipersempit */}
            <div className="space-y-1 mb-3">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1, type: 'spring' }}
                >
                    <h2 className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg italic uppercase tracking-tighter leading-none">
                        Happy<br/><span className="text-amber-400">Birthday!</span>
                    </h2>
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3 }}
                >
                    <h3 className="text-lg font-black text-white uppercase tracking-[0.1em] px-4 py-1 border-y border-amber-400/30 inline-block bg-black/20 rounded-md">
                        {birthday.nickname}
                    </h3>
                </motion.div>
            </div>

            {/* The Prayer Message Box - Dibuat Fleksibel */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.6 }}
                className="relative group cursor-default w-full px-4"
            >
                <div className="relative bg-white/10 backdrop-blur-md p-4 rounded-[1.25rem] border border-white/20 shadow-xl overflow-hidden min-h-[120px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={wishIndex}
                            initial={{ x: 30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -30, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <p className="text-[8px] font-black text-amber-400 uppercase tracking-[0.3em] mb-1.5 opacity-80">
                                {birthday.message ? "Doa Khusus" : `Doa ${currentWish.persona}:`}
                            </p>
                            <p className="text-xs sm:text-sm font-bold italic text-white leading-relaxed font-serif">
                                “{birthday.message || currentWish.text}”
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
                {/* Petunjuk Ganti Doa */}
                <p className="text-[8px] text-white/40 mt-2 font-bold uppercase tracking-widest animate-pulse">
                    Tekan Panah Kanan (➡) Untuk Ganti Doa
                </p>
            </motion.div>

            {/* Close Button - Ukuran tombol lebih ringkas */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 2.2, type: 'spring' }}
                className="mt-4"
            >
                <button 
                    onClick={onClose}
                    className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em] text-[9px] border-b-4 border-orange-800"
                >
                    Lanjutkan Game
                </button>
            </motion.div>
        </div>

        {/* Background Animation */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] bg-[conic-gradient(from_0deg,transparent_0deg,white_15deg,transparent_30deg)] animate-[spin_60s_linear_infinite]" />
        </div>
    </motion.div>
  );
};

export default BirthdayScreen;
