
import React from 'react';
import { motion } from 'framer-motion';
import { KnockoutBracket } from '../types';

interface KnockoutBracketScreenProps {
  bracket: KnockoutBracket | null;
}

const KnockoutBracketScreen: React.FC<KnockoutBracketScreenProps> = ({ bracket }) => {
  if (!bracket || bracket.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-3xl">
        <p>Membuat bagan turnamen...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-2 bg-white dark:bg-gray-800 rounded-3xl overflow-hidden">
      <div className="text-center shrink-0 mb-2">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-500">
          Bagan Turnamen
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Pertandingan akan segera dimulai!</p>
      </div>
      <div className="flex-grow overflow-x-auto overflow-y-hidden p-2">
        <div className="flex h-full space-x-4">
          {bracket.map((round, roundIndex) => (
            <div key={roundIndex} className="flex flex-col justify-around min-w-[140px]">
              {round.map((match, matchIndex) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: roundIndex * 0.3 + matchIndex * 0.1 }}
                  className="bg-sky-50 dark:bg-gray-700 rounded-lg p-1.5 text-xs h-14 flex flex-col justify-center"
                >
                  <div className={`flex items-center gap-1 ${match.winner && match.winner.nickname === match.player1?.nickname ? 'font-bold' : ''}`}>
                    <img src={match.player1?.profilePictureUrl} className="w-4 h-4 rounded-full" alt="" />
                    <span className="truncate">{match.player1?.nickname ?? '...'}</span>
                  </div>
                  <div className="border-t border-dashed border-sky-200 dark:border-gray-600 my-1"></div>
                  <div className={`flex items-center gap-1 ${match.winner && match.winner.nickname === match.player2?.nickname ? 'font-bold' : ''}`}>
                    {match.player2 ? (
                        <>
                            <img src={match.player2.profilePictureUrl} className="w-4 h-4 rounded-full" alt="" />
                            <span className="truncate">{match.player2.nickname}</span>
                        </>
                    ) : (
                        <span className="text-green-500 italic">BYE</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KnockoutBracketScreen;
