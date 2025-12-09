import React from 'react';
import { motion } from 'framer-motion';
import { ServerIcon } from './IconComponents';

interface ServerTimeNotificationProps {
  time: Date | null;
}

const formatServerTime = (date: Date | null): string => {
    if (!date) return '00:00:00';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const ServerTimeNotification: React.FC<ServerTimeNotificationProps> = ({ time }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      layout
      className="group relative p-2 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 border-2 border-gray-600 shadow-lg shadow-black/30 flex items-center justify-center gap-2"
    >
      <div className="shrink-0 bg-white/10 rounded-full p-1">
          <ServerIcon className="w-4 h-4 text-white"/>
      </div>
      <div className="flex-1 min-w-0 text-white text-xs font-semibold flex items-center gap-2">
        <span>Waktu Resmi Server:</span>
        <span className="font-mono text-base">{formatServerTime(time)}</span>
      </div>
       <div className="absolute top-full mt-2 w-64 p-2 text-xs text-white bg-gray-900 dark:bg-black rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Waktu Resmi Server. Semua jawaban dinilai berdasarkan waktu ini, bukan waktu di HP Anda, untuk memastikan keadilan bagi semua pemain karena adanya perbedaan latensi jaringan.
        </div>
    </motion.div>
  );
};

export default ServerTimeNotification;
