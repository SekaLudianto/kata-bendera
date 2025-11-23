import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnockoutBracket, KnockoutMatch, KnockoutPlayer, KnockoutChampions } from '../types';

interface KnockoutBracketScreenProps {
  bracket: KnockoutBracket | null;
  currentMatchId: string | null;
  isReadyToPlay: boolean;
  onStartMatch: (payload: { roundIndex: number; matchIndex: number }) => void;
  onRedrawBracket: () => void;
  onRestartCompetition: () => void;
  onDeclareWalkoverWinner: (payload: { roundIndex: number; matchIndex: number; winner: KnockoutPlayer }) => void;
  champions: KnockoutChampions;
}

const MatchCard: React.FC<{ 
    match: KnockoutMatch, 
    isCurrent: boolean, 
    bracket: KnockoutBracket, 
    isReadyToPlay: boolean, 
    onStartMatch: (payload: { roundIndex: number; matchIndex: number }) => void; 
    isTournamentOver: boolean;
    onDeclareWalkoverWinner: (payload: { roundIndex: number; matchIndex: number; winner: KnockoutPlayer }) => void;
    champions: KnockoutChampions;
}> = ({ match, isCurrent, bracket, isReadyToPlay, onStartMatch, isTournamentOver, onDeclareWalkoverWinner, champions }) => {
    const [isSelectingWinner, setIsSelectingWinner] = useState(false);
    
    const getWinnerLayoutId = (player: any) => `winner-${player.nickname}-${match.roundIndex}-${match.matchIndex}`;

    const isMatchReady = match.player1 && match.player2 && !match.winner;

    const handleDeclareWinner = (winner: KnockoutPlayer) => {
        onDeclareWalkoverWinner({
            roundIndex: match.roundIndex,
            matchIndex: match.matchIndex,
            winner,
        });
        setIsSelectingWinner(false); // Reset UI state
    };
    
    const PlayerDisplay: React.FC<{ player: KnockoutPlayer | null }> = ({ player }) => {
        if (!player) return <span className="truncate">...</span>;
        
        return (
            <div className="flex items-center gap-1.5 w-full min-w-0">
                <motion.img layoutId={getWinnerLayoutId(player)} src={player.profilePictureUrl} className="w-4 h-4 rounded-full shrink-0" alt="" />
                <span className="truncate flex-1">{player.nickname}</span>
                {champions[player.nickname] && (
                    <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                        <span className="text-xs">🏆</span>
                        <span className="text-xs font-bold">{champions[player.nickname]}</span>
                    </div>
                )}
            </div>
        );
    }

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
                    <PlayerDisplay player={match.player1} />
                </div>
                <div className="border-t border-dashed border-sky-200 dark:border-gray-600 my-1"></div>
                <div className={`flex items-center gap-1 relative ${match.winner && match.winner.nickname === match.player2?.nickname ? 'font-bold' : ''}`}>
                {match.player2 ? (
                    <PlayerDisplay player={match.player2} />
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
                 <div className="mt-1 flex flex-col items-center w-full gap-1">
                    {isSelectingWinner ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col gap-1">
                            <p className="text-center text-[10px] text-gray-500 dark:text-gray-400">Pilih pemenang WO:</p>
                            <button onClick={() => handleDeclareWinner(match.player1!)} className="w-full text-center truncate px-2 py-1 bg-sky-500 text-white text-[10px] font-bold rounded-md hover:bg-sky-600">
                                {match.player1!.nickname}
                            </button>
                            <button onClick={() => handleDeclareWinner(match.player2!)} className="w-full text-center truncate px-2 py-1 bg-sky-500 text-white text-[10px] font-bold rounded-md hover:bg-sky-600">
                                {match.player2!.nickname}
                            </button>
                            <button onClick={() => setIsSelectingWinner(false)} className="w-full text-center px-2 py-1 bg-gray-400 text-white text-[10px] font-bold rounded-md hover:bg-gray-500">
                                Batal
                            </button>
                        </motion.div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onStartMatch({ roundIndex: match.roundIndex, matchIndex: match.matchIndex })}
                                className="px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-md shadow-md shadow-green-500/20 hover:bg-green-600 transition-all"
                            >
                                Mulai
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsSelectingWinner(true)}
                                className="px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-md shadow-md shadow-amber-500/20 hover:bg-amber-600 transition-all"
                            >
                                WO
                            </motion.button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}


const KnockoutBracketScreen: React.FC<KnockoutBracketScreenProps> = ({ bracket, currentMatchId, isReadyToPlay, onStartMatch, onRedrawBracket, onRestartCompetition, onDeclareWalkoverWinner, champions }) => {
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
  
  const sortedChampions = Object.entries(champions)
    .sort(([, a], [, b]) => b - a)
    .map(([nickname, wins]) => ({ nickname, wins }));

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
                    onDeclareWalkoverWinner={onDeclareWalkoverWinner}
                    champions={champions}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <AnimatePresence>
      {isTournamentOver && isReadyToPlay && (
        <motion.div 
            className="shrink-0 p-2 border-t border-sky-100 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-center gap-2">
              <button onClick={onRedrawBracket} className="flex-1 px-3 py-2 bg-sky-500 text-white text-xs font-bold rounded-md shadow-md shadow-sky-500/20 hover:bg-sky-600 transition-all">
                  Drawing Kembali
              </button>
              <button onClick={onRestartCompetition} className="flex-1 px-3 py-2 bg-gray-500 text-white text-xs font-bold rounded-md shadow-md shadow-gray-500/20 hover:bg-gray-600 transition-all">
                  Mulai Kompetisi Baru
              </button>
          </div>
          {sortedChampions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-dashed border-sky-200 dark:border-gray-600">
              <h3 className="text-center text-sm font-bold text-slate-600 dark:text-gray-300 mb-2">Histori Juara</h3>
              <div className="max-h-24 overflow-y-auto space-y-1 text-xs px-1">
                  {sortedChampions.map(({ nickname, wins }) => (
                      <div key={nickname} className="flex items-center justify-between bg-sky-50 dark:bg-gray-700/60 p-1.5 rounded-md">
                          <span className="font-semibold truncate">{nickname}</span>
                          <div className="flex items-center gap-1 text-amber-500 font-bold">
                              <span>🏆</span>
                              <span>{wins}x</span>
                          </div>
                      </div>
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default KnockoutBracketScreen;
