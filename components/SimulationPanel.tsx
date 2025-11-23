import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChatMessage } from '../types';

interface SimulationPanelProps {
  onComment: (comment: ChatMessage) => void;
  currentAnswer: string;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ onComment, currentAnswer }) => {
  const [username, setUsername] = useState('Tester');
  const [comment, setComment] = useState('');
  const [userCounter, setUserCounter] = useState(1);

  const generateRandomUser = () => {
    setUsername(`Pemain${userCounter}`);
    setUserCounter(prev => prev + 1);
  };
  
  const handleSendComment = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (comment.trim() === '' || username.trim() === '') return;

    onComment({
      id: `${Date.now()}-${username}`,
      nickname: username,
      comment,
      profilePictureUrl: `https://i.pravatar.cc/40?u=${username}`,
      isWinner: false,
    });

    setComment('');
  };

  const handleSendCorrectAnswer = () => {
    if (currentAnswer.startsWith('(')) return; // Don't send for ABC 5 Dasar helper text

    onComment({
      id: `${Date.now()}-${username}`,
      nickname: username,
      comment: currentAnswer,
      profilePictureUrl: `https://i.pravatar.cc/40?u=${username}`,
      isWinner: false,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="hidden lg:flex flex-col flex-1 h-[95vh] min-h-[600px] max-h-[800px] bg-white dark:bg-gray-800 rounded-3xl shadow-lg shadow-sky-500/5 border border-sky-200 dark:border-gray-700 overflow-hidden"
    >
      <header className="p-3 text-center border-b border-sky-100 dark:border-gray-700 shrink-0">
        <h2 className="text-md font-bold text-slate-700 dark:text-gray-300">Panel Simulasi</h2>
      </header>
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        <div>
          <label htmlFor="sim-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Username
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="sim-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <button
                onClick={generateRandomUser}
                className="px-3 py-2 bg-sky-500 text-white text-xs font-bold rounded-md hover:bg-sky-600 transition-all"
                title="Generate User Baru"
            >
                Acak
            </button>
          </div>
        </div>

        <form onSubmit={handleSendComment}>
          <label htmlFor="sim-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Komentar
          </label>
          <textarea
            id="sim-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            type="submit"
            className="w-full mt-2 px-4 py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-all"
          >
            Kirim Komentar
          </button>
        </form>

        <div className="border-t border-dashed border-sky-200 dark:border-gray-600 my-2"></div>

        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Jawaban Benar Saat Ini
          </label>
           <div className="p-2 bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-500/50 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-mono text-sm break-words">
                    {currentAnswer || '...'}
                </p>
           </div>
           <button
            onClick={handleSendCorrectAnswer}
            disabled={!currentAnswer || currentAnswer.startsWith('(')}
            className="w-full mt-2 px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Kirim Jawaban Benar
          </button>
        </div>

      </div>
    </motion.div>
  );
};

export default SimulationPanel;