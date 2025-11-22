
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnockoutBracket, KnockoutMatch } from '../types';

interface KnockoutBracketScreenProps {
  bracket: KnockoutBracket | null;
  currentMatchId: string | null;
  isReadyToPlay: boolean;
  onStartMatch: (payload: { roundIndex: number; matchIndex: number }) => void;
  onRedrawBracket: () => void;
  onRestartCompetition: () => void;
}

const MatchCard: React.FC<{ match: KnockoutMatch, isCurrent: boolean, bracket: KnockoutBracket, isReadyToPlay: boolean, onStartMatch: (payload: { roundIndex: number; matchIndex: number }) => void; isTournamentOver: boolean; }> = ({ match, isCurrent, bracket, isReadyToPlay, onStartMatch, isTournamentOver }) => {
    const getWinnerLayoutId = (player: any) => `winner-${player.nickname}-${match.roundIndex}-${match.matchIndex}`;

    const isMatchReady = match.player1 && match.player2 && !match.winner;

    return (
        <div className="flex flex-col items-center gap-1">
            <motion.div
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: match.roundIndex * 0.2 + match.matchIndex * 0.05 }}
                className={`bg-sky-50 dark:bg-gray-700 rounded-lg p-1.5 text-xs h-14 flex flex-col justify-center relative border-2 w-full ${isCurrent ? 'border-amber-500' : 'border-transparent'}`}
            >
                <div className={`flex items-center gap-1 relative ${match.winner && match.winner.nickname === match.player1?.nickname ? 'font-bold' : ''}`}>
                    {match.player1 && (
                        <>
                            <motion.img layoutId={getWinnerLayoutId(match.player1)} src={match.player1.profilePictureUrl} className="w-4 h-4 rounded-full" alt="" />
                            <span className="truncate">{match.player1.nickname}</span>
                        </>
                    )}
                    {!match.player1 && <span className="truncate">...</span>}
                </div>
                <div className="border-t border-dashed border-sky-200 dark:border-gray-600 my-1"></div>
                <div className={`flex items-center gap-1 relative ${match.winner && match.winner.nickname === match.player2?.nickname ? 'font-bold' : ''}`}>
                {match.player2 ? (
                    <>
                        <motion.img layoutId={getWinnerLayoutId(match.player2)} src={match.player2.profilePictureUrl} className="w-4 h-4 rounded-full" alt="" />
                        <span className="truncate">{match.player2.nickname}</span>
                    </>
                ) : match.player1 ? (
                    <span className="text-green-500 italic">BYE</span>
                ) : <span className="truncate">...</span>}
                </div>
                
                <AnimatePresence>
                {match.winner && match.roundIndex < bracket.length - 1 && (
                    <motion.div
                        layoutId={getWinnerLayoutId(match.winner)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, type: 'spring' }}
                        className="absolute top-0 left-0"
                    >
                        <img src={match.winner.profilePictureUrl} className="w-4 h-4 rounded-full" alt="" />
                    </motion.div>
                )}
                </AnimatePresence>
            </motion.div>
            
            {isReadyToPlay && isMatchReady && !isTournamentOver && (
                 <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onStartMatch({ roundIndex: match.roundIndex, matchIndex: match.matchIndex })}
                    className="mt-1 px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-md shadow-md shadow-green-500/20 hover:bg-green-600 transition-all"
                >
                    Mulai
                </motion.button>
            )}
        </div>
    )
}


const KnockoutBracketScreen: React.FC<KnockoutBracketScreenProps> = ({ bracket, currentMatchId, isReadyToPlay, onStartMatch, onRedrawBracket, onRestartCompetition }) => {
  if (!bracket || bracket.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-3xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mb-4"></div>
        <p>Membuat bagan turnamen...</p>
      </div>
    );
  }

  const isTournamentOver = bracket && bracket.length > 0 && !!bracket[bracket.length - 1][0].winner;

  const getTitle = () => {
    if (isTournamentOver) return "Turnamen Selesai!";
    if (isReadyToPlay) return "Pilih Match";
    return "Bagan Turnamen";
  }

  return (
    <div className="flex flex-col h-full p-2 bg-white dark:bg-gray-800 rounded-3xl overflow-hidden">
      <div className="text-center shrink-0 mb-2">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-500">
          {getTitle()}
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
            {isTournamentOver ? 'Selamat kepada pemenang!' : isReadyToPlay ? 'Pilih match yang akan dimulai' : 'Menganimasikan pemenang...'}
        </p>
      </div>
      <div className="flex-grow overflow-x-auto overflow-y-hidden p-2">
        <div className="flex h-full space-x-4">
          {bracket.map((round, roundIndex) => (
            <div key={roundIndex} className="flex flex-col justify-around min-w-[140px]">
              {round.map((match) => (
                <MatchCard 
                    key={match.id} 
                    match={match} 
                    isCurrent={match.id === currentMatchId} 
                    bracket={bracket} 
                    isReadyToPlay={isReadyToPlay}
                    onStartMatch={onStartMatch}
                    isTournamentOver={isTournamentOver}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {isTournamentOver && isReadyToPlay && (
        <motion.div 
            className="shrink-0 p-2 flex items-center justify-center gap-2 border-t border-sky-100 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
        >
            <button onClick={onRedrawBracket} className="flex-1 px-3 py-2 bg-sky-500 text-white text-xs font-bold rounded-md shadow-md shadow-sky-500/20 hover:bg-sky-600 transition-all">
                Drawing Kembali
            </button>
            <button onClick={onRestartCompetition} className="flex-1 px-3 py-2 bg-gray-500 text-white text-xs font-bold rounded-md shadow-md shadow-gray-500/20 hover:bg-gray-600 transition-all">
                Ulang Kompetisi
            </button>
        </motion.div>
      )}
    </div>
  );
};

export default KnockoutBracketScreen;