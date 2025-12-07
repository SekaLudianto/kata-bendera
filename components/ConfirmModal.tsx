
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangleIcon } from './IconComponents';

interface ConfirmModalProps {
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onConfirm, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-[100]"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-4">
          <AlertTriangleIcon className="w-8 h-8 text-amber-500 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-2 mb-6">{message}</p>
        
        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
          >
            Ya, Lanjutkan
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConfirmModal;
