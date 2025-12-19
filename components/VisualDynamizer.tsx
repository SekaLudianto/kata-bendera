
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '../types';

interface FloatingAvatar {
  id: string;
  url: string;
  startX: number;
  driftX: number;
  size: number;
  duration: number;
}

interface VisualDynamizerProps {
  lastMessage: ChatMessage | null;
}

const VisualDynamizer: React.FC<VisualDynamizerProps> = ({ lastMessage }) => {
  const [floatingAvatars, setFloatingAvatars] = useState<FloatingAvatar[]>([]);

  // Partikel latar belakang yang stabil
  const [particles] = useState(() => Array.from({ length: 15 }).map(() => ({
      id: Math.random(),
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 20,
      size: Math.random() * 2 + 1
  })));

  useEffect(() => {
    if (lastMessage && lastMessage.profilePictureUrl) {
      const newAvatar: FloatingAvatar = {
        id: `${lastMessage.id}-${Math.random()}`,
        url: lastMessage.profilePictureUrl,
        startX: Math.random() * 80 + 10, // 10% - 90% lebar layar
        driftX: (Math.random() * 200 - 100), // Goyangan 100px ke kiri/kanan
        size: Math.random() * 15 + 35, // 35px - 50px
        duration: Math.random() * 4 + 8, // 8s - 12s
      };

      setFloatingAvatars(prev => [...prev, newAvatar].slice(-8)); // Maksimal 8 avatar sekaligus
    }
  }, [lastMessage]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background Particles - Animasi Floating Star */}
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

      {/* Floating User Avatars - Meluncur dari bawah ke atas seluruh layar */}
      <AnimatePresence>
        {floatingAvatars.map(avatar => (
          <motion.div
            key={avatar.id}
            initial={{ bottom: "-10%", left: `${avatar.startX}%`, opacity: 0, scale: 0.3 }}
            animate={{ 
              bottom: "110%", 
              opacity: [0, 0.8, 0.8, 0],
              x: avatar.driftX,
              scale: [0.3, 1, 1, 0.8],
              rotate: 360
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: avatar.duration, ease: "linear" }}
            onAnimationComplete={() => setFloatingAvatars(prev => prev.filter(a => a.id !== avatar.id))}
            className="absolute"
          >
            <div className="p-1 bg-white/10 dark:bg-black/20 rounded-full backdrop-blur-[2px] border border-white/20 shadow-2xl">
              <img 
                src={avatar.url} 
                alt="user" 
                className="rounded-full"
                style={{ width: avatar.size, height: avatar.size }}
                onError={(e) => (e.currentTarget.src = 'https://i.pravatar.cc/40')}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Efek Scanline halus */}
      <div className="scanline-effect opacity-[0.03] dark:opacity-[0.07]" />
    </div>
  );
};

export default VisualDynamizer;
