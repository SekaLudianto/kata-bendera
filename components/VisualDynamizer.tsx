
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '../types';

interface VisualDynamizerProps {
  lastMessage: ChatMessage | null;
}

const VisualDynamizer: React.FC<VisualDynamizerProps> = ({ lastMessage }) => {
  // Partikel latar belakang yang stabil (bintang-bintang halus)
  const [particles] = useState(() => Array.from({ length: 15 }).map(() => ({
      id: Math.random(),
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 20,
      size: Math.random() * 2 + 1
  })));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background Particles - Animasi Floating Star Tetap Dipertahankan untuk Kedalaman Visual */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: `${p.y}vh`, opacity: 0.1 }}
          animate={{ 
            y: [`${p.y}vh`, `${p.y - 10}vh`, `${p.y}vh`],
            opacity: [0.1, 0.4, 0.1]
          }}
          transition={{ 
            duration: p.duration, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute rounded-full bg-sky-400/30 blur-[1px]"
          style={{ width: p.size, height: p.size }}
        />
      ))}
      
      {/* Efek Scanline halus */}
      <div className="scanline-effect opacity-[0.03] dark:opacity-[0.07]" />
    </div>
  );
};

export default VisualDynamizer;
