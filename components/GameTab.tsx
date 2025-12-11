import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOTAL_ROUNDS, ROUND_TIMER_SECONDS, KNOCKOUT_ROUND_TIMER_SECONDS, KNOCKOUT_TARGET_SCORE } from '../constants';
// FIX: Import LetterObject from types.ts instead of defining it locally.
import { GameMode, GameStyle, LetterObject } from '../types';
import { InternalGameState } from '../hooks/useGameLogic';
import { ServerIcon } from './IconComponents';

// FIX: Removed local definition of LetterObject as it's now imported from types.ts.

interface GameTabProps {
  gameState: InternalGameState;
  serverTime: Date | null;
}

const formatServerTime = (date: Date | null): string => {
    if (!date) return '00:00:00';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const getLetterBoxSizeClasses = (totalLetters: number): string => {
  if (totalLetters > 22) return 'w-5 h-7 text-sm gap-0.5';
  if (totalLetters > 16) return 'w-6 h-8 text-lg gap-1';
  if (totalLetters > 12) return 'w-7 h-9 text-xl gap-1';
  return 'w-9 h-11 text-2xl gap-1.5';
};

const ScrambledWordDisplay: React.FC<{ scrambledWord: LetterObject[][], isRoundActive: boolean, isHardMode: boolean, revealLevel: number }> = ({ scrambledWord, isRoundActive, isHardMode, revealLevel }) => {
    const totalLetters = scrambledWord.flat().length;
    const sizeClasses = getLetterBoxSizeClasses(totalLetters);
    
    // In Hard Mode, reveal 2 letters per level (starting from 0)
    const revealedCount = isHardMode ? revealLevel * 2 : totalLetters;

    let globalIndex = 0;

    return (
        <div className="flex flex-col items-center gap-1 px-2 relative">
            {scrambledWord.map((word, wordIndex) => (
                <div key={wordIndex} className={`flex flex-wrap justify-center ${sizeClasses.split(' ')[2]}`}>
                    {word.map((item: LetterObject) => {
                        const isHidden = isRoundActive && isHardMode && globalIndex >= revealedCount;
                        globalIndex++;
                        
                        return (
                        <motion.div
                            key={item.id}
                            layout
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className={`bg-sky-100 dark:bg-gray-700 border-2 rounded-md flex items-center justify-center font-bold transition-colors duration-500 ${sizeClasses.split(' ').slice(0, 2).join(' ')} ${
                                isRoundActive
                                    ? 'border-sky-200 dark:border-gray-600 text-amber-500 dark:text-amber-400'
                                    : 'border-green-500 text-green-600 dark:text-green-300'
                                }`}
                        >
                            {isHidden ? (
                                <span className="text-gray-400 dark:text-gray-500">🔒</span>
                            ) : (
                                item.letter
                            )}
                        </motion.div>
                    )})}
                </div>
            ))}
            {isRoundActive && isHardMode && revealedCount < totalLetters && (
                <div className="mt-2 text-xs font-bold text-red-500 animate-pulse bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded">
                    Butuh Koin untuk Buka Clue! (5x Gift = Skip Soal)
                </div>
            )}
        </div>
    );
};

const FlagOverlay: React.FC<{ isRoundActive: boolean, isHardMode: boolean, revealLevel: number }> = ({ isRoundActive, isHardMode, revealLevel }) => {
    if (!isRoundActive || !isHardMode) return null;

    // 4x4 Grid = 16 blocks.
    // Reveal 2 blocks per level.
    const totalBlocks = 16;
    const blocksToReveal = revealLevel * 2; 
    
    // Create an array of 16 blocks
    const blocks = Array.from({ length: totalBlocks }, (_, i) => i);

    return (
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 w-full h-full">
            {blocks.map((index) => {
                // Determine if this block should be hidden (revealed)
                const isRevealed = index < blocksToReveal;
                
                return (
                    <AnimatePresence key={index}>
                        {!isRevealed && (
                            <motion.div
                                initial={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ duration: 0.5 }}
                                className="bg-slate-300 dark:bg-slate-600 border border-slate-400/50 flex items-center justify-center"
                            >
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">?</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                );
            })}
             {blocksToReveal < totalBlocks && (
                <div className="absolute inset-x-0 bottom-0 flex justify-center pb-1 pointer-events-none">
                     <span className="text-[10px] font-bold text-white bg-black/50 px-2 rounded backdrop-blur-sm">Butuh Koin</span>
                </div>
            )}
        </div>
    );
};

const GuessTheFlagContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCountry, scrambledWord, isRoundActive, isHardMode, revealLevel } = gameState;
    if (!currentCountry) return null;

    return (
        <>
            <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-2">
                Tebak nama dari bendera ini:
            </h2>
            <div className="my-2 relative inline-block rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-600">
                <img 
                    src={`https://flagcdn.com/w160/${currentCountry.code}.png`} 
                    alt="Bendera" 
                    className="h-24 w-auto object-cover" 
                />
                <FlagOverlay isRoundActive={isRoundActive} isHardMode={isHardMode} revealLevel={revealLevel} />
            </div>
            <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} isHardMode={isHardMode} revealLevel={revealLevel} />
        </>
    );
};

const GuessTheCountryKnockoutContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCountry, scrambledWord, isRoundActive } = gameState;
    if (!currentCountry) return null;

    return (
        <>
            <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-3">
                Tebak Nama Negara:
            </h2>
            {/* Knockout usually doesn't have hard mode flag obscuring logic requested, but could apply the text masking if desired. For now, standard behavior. */}
            <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} isHardMode={false} revealLevel={0} />
            
            <AnimatePresence>
            {!isRoundActive && (
                 <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center"
                 >
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">
                        {currentCountry.name}
                    </p>
                 </motion.div>
            )}
            </AnimatePresence>
        </>
    );
}

const ABC5DasarContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentLetter, currentCategory } = gameState;
    return (
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 mb-4">
            Kategori: <span className="text-amber-500">{currentCategory}</span>
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-300">Sebutkan nama-nama yang berawalan dengan huruf:</p>
        <div className="my-4 text-8xl font-bold text-amber-500 dark:text-amber-400 animate-pulse">
            {currentLetter}
        </div>
      </div>
    );
};


const GuessTheWordContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentWord, currentWordCategory, scrambledWord, isRoundActive, isHardMode, revealLevel } = gameState;
  
    return (
      <>
        <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-3">
            Kategori: {currentWordCategory}
        </h2>
        <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} isHardMode={isHardMode} revealLevel={revealLevel} />
        <AnimatePresence>
            {!isRoundActive && currentWord && (
                 <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center"
                 >
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">
                        {currentWord}
                    </p>
                 </motion.div>
            )}
            </AnimatePresence>
      </>
    );
};

const TriviaContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentTriviaQuestion, isRoundActive, scrambledWord, isHardMode, revealLevel } = gameState;
    if (!currentTriviaQuestion) return null;
  
    return (
      <div className="text-center px-2 flex flex-col items-center justify-center gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-300 leading-tight">
            {currentTriviaQuestion.question}
        </h2>
        
        <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} isHardMode={isHardMode} revealLevel={revealLevel} />

        <AnimatePresence>
        {!isRoundActive && (
             <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3"
             >
                <p className="text-sm text-gray-500 dark:text-gray-400">Jawabannya adalah:</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-300">
                    {currentTriviaQuestion.answer}
                </p>
             </motion.div>
        )}
        </AnimatePresence>
      </div>
    );
};

const GuessTheCityContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCity, scrambledWord, isRoundActive, isHardMode, revealLevel } = gameState;
    if (!currentCity) return null;

    return (
        <>
            <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-3">
                Tebak Nama Kota:
            </h2>
            <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} isHardMode={isHardMode} revealLevel={revealLevel} />
            
            <AnimatePresence>
            {!isRoundActive && (
                 <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center"
                 >
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">
                        {currentCity.name}
                    </p>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        ({currentCity.region})
                    </p>
                 </motion.div>
            )}
            </AnimatePresence>
        </>
    );
};

const ZonaBolaContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentWord, currentWordCategory, currentStadium, scrambledWord, isRoundActive, isHardMode, revealLevel } = gameState;
    const answer = currentWord || currentStadium?.name;
    const location = currentStadium?.location;

    return (
        <>
            <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-3">
                Tebak: <span className="text-amber-500">{currentWordCategory}</span>
            </h2>
            <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} isHardMode={isHardMode} revealLevel={revealLevel} />
            
            <AnimatePresence>
            {!isRoundActive && answer && (
                 <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center"
                 >
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">
                        {answer}
                    </p>
                    {location && (
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            ({location})
                        </p>
                    )}
                 </motion.div>
            )}
            </AnimatePresence>
        </>
    );
};

const GameTab: React.FC<GameTabProps> = ({ gameState, serverTime }) => {
  const { round, totalRounds, roundWinners, roundTimer, gameMode, currentCategory, availableAnswersCount, maxWinners, gameStyle, knockoutBracket, currentBracketRoundIndex, currentMatchIndex, knockoutMatchPoints, knockoutCategory } = gameState;
  const progressPercentage = (round / totalRounds) * 100;

  const timerDuration = gameStyle === GameStyle.Knockout ? KNOCKOUT_ROUND_TIMER_SECONDS : ROUND_TIMER_SECONDS;
  const timerProgress = (roundTimer / timerDuration) * 100;

  const maxWinnersForThisRound = gameMode === GameMode.ABC5Dasar && availableAnswersCount != null
    ? Math.min(maxWinners, availableAnswersCount)
    : maxWinners;
    
  const getRoundTitle = () => {
    if (gameStyle === GameStyle.Knockout) {
        if (knockoutCategory === 'Trivia') return "Trivia Pengetahuan Umum";
        if (knockoutCategory === 'GuessTheCountry') return "Tebak Negara";
        if (knockoutCategory === 'ZonaBola') return "Zona Bola";
        if (knockoutCategory === 'GuessTheFruit') return "Tebak Kata: Buah";
        if (knockoutCategory === 'GuessTheAnimal') return "Tebak Kata: Hewan";
        if (knockoutCategory === 'KpopTrivia') return "Trivia: Zona KPOP";

        if (currentBracketRoundIndex === null || !knockoutBracket || !knockoutBracket[currentBracketRoundIndex]) {
            return "Mode Knockout";
        }
        
        const currentRoundMatchCount = knockoutBracket[currentBracketRoundIndex].length;

        if (currentRoundMatchCount === 1) return "Babak Final";
        if (currentRoundMatchCount === 2) return "Babak Semi-Final";
        if (currentRoundMatchCount === 4) return "Babak Perempat Final";
        if (currentRoundMatchCount === 8) return "Babak 16 Besar";
        
        return `Babak Penyisihan`; // Fallback
    }
    // Classic Mode Titles
    if (gameMode === GameMode.GuessTheFlag) return 'Tebak Bendera';
    if (gameMode === GameMode.GuessTheCity) return 'Tebak Kota';
    if (gameMode === GameMode.ABC5Dasar) return `ABC 5 Dasar`;
    if (gameMode === GameMode.GuessTheWord) return `Tebak Kata Acak`;
    if (gameMode === GameMode.Trivia) return 'Trivia Umum';
    if (gameMode === GameMode.ZonaBola) return 'Zona Bola';
    if (gameMode === GameMode.GuessTheFruit) return 'Tebak Buah';
    if (gameMode === GameMode.GuessTheAnimal) return 'Tebak Hewan';
    if (gameMode === GameMode.KpopTrivia) return 'Trivia: Zona KPOP';
    return '';
  }

  const currentMatch = gameStyle === GameStyle.Knockout && knockoutBracket && currentBracketRoundIndex !== null && currentMatchIndex !== null
    ? knockoutBracket[currentBracketRoundIndex][currentMatchIndex]
    : null;

  return (
    <motion.div 
      key={`${round}-${gameMode}-${currentCategory}-${currentMatch?.id}-${gameState.currentWord}-${gameState.currentCountry?.name}-${gameState.currentTriviaQuestion?.question}-${gameState.currentCity?.name}-${gameState.currentStadium?.name}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="p-3 flex flex-col h-full relative"
    >
      <div className="grid grid-cols-3 items-center text-xs text-gray-500 dark:text-gray-400 shrink-0">
        <span className="text-left">{gameStyle === GameStyle.Classic ? `Ronde ${round} / ${totalRounds}` : `🎯 Rally Point (Target ${KNOCKOUT_TARGET_SCORE})`}</span>
        
        <span className='font-semibold text-center'>{getRoundTitle()}</span>

        <div className="group relative flex items-center gap-1 justify-self-end">
            <ServerIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-mono font-semibold text-gray-600 dark:text-gray-300">
                {formatServerTime(serverTime)}
            </span>
            <div className="absolute top-full right-0 mt-2 w-64 p-2 text-xs text-white bg-gray-900 dark:bg-black rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                Waktu Resmi Server. Semua jawaban dinilai berdasarkan waktu ini, bukan waktu di HP Anda, untuk memastikan keadilan bagi semua pemain karena adanya perbedaan latensi jaringan.
            </div>
        </div>
      </div>

      <div className="w-full bg-sky-100 dark:bg-gray-700 rounded-full h-2 my-2 shrink-0">
        {gameStyle === GameStyle.Classic ? (
          <motion.div
            className="bg-gradient-to-r from-sky-500 to-teal-400 h-2 rounded-full"
            initial={{ width: `${((round - 1) / totalRounds) * 100}%` }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        ) : (
            <div className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full w-full" />
        )}
      </div>

      <div className="flex-grow flex flex-col items-center justify-center">
        {currentMatch && currentMatch.player1 && currentMatch.player2 && (
             <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex justify-between items-center mb-4 px-2 gap-2"
             >
                <div className="flex flex-col items-center text-center flex-1 min-w-0">
                    <img src={currentMatch.player1.profilePictureUrl} alt={currentMatch.player1.nickname} className="w-16 h-16 rounded-full border-4 border-sky-400"/>
                    <p className="font-bold text-sm mt-1 truncate w-full">{currentMatch.player1.nickname}</p>
                </div>
                <div className="text-center flex-shrink-0 px-2">
                    <p className="text-3xl font-bold text-red-500">
                        {knockoutMatchPoints.player1} - {knockoutMatchPoints.player2}
                    </p>
                    <p className="text-xs text-gray-500">Skor</p>
                </div>
                <div className="flex flex-col items-center text-center flex-1 min-w-0">
                    <img src={currentMatch.player2.profilePictureUrl} alt={currentMatch.player2.nickname} className="w-16 h-16 rounded-full border-4 border-gray-400"/>
                    <p className="font-bold text-sm mt-1 truncate w-full">{currentMatch.player2.nickname}</p>
                </div>
             </motion.div>
        )}
        
        {/* Main game content */}
        {(gameState.gameMode === GameMode.GuessTheWord || gameState.gameMode === GameMode.GuessTheFruit || gameState.gameMode === GameMode.GuessTheAnimal) && <GuessTheWordContent gameState={gameState} />}
        {gameState.gameMode === GameMode.GuessTheFlag && (
          gameState.gameStyle === GameStyle.Classic 
            ? <GuessTheFlagContent gameState={gameState} /> 
            : <GuessTheCountryKnockoutContent gameState={gameState} />
        )}
        {gameState.gameMode === GameMode.ABC5Dasar && <ABC5DasarContent gameState={gameState} />}
        {(gameState.gameMode === GameMode.Trivia || gameState.gameMode === GameMode.KpopTrivia) && <TriviaContent gameState={gameState} />}
        {gameState.gameMode === GameMode.GuessTheCity && <GuessTheCityContent gameState={gameState} />}
        {gameState.gameMode === GameMode.ZonaBola && <ZonaBolaContent gameState={gameState} />}


        {gameStyle === GameStyle.Knockout && gameState.isRoundActive && (
             <div className="mt-3 p-2 w-full max-w-xs bg-yellow-100 border border-yellow-300 dark:bg-yellow-500/10 dark:border-yellow-500/30 rounded-lg text-center">
                <p className="text-xs font-bold text-yellow-800 dark:text-yellow-300">PERINGATAN!</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Hanya pemain yang bertanding yang boleh menjawab. Penonton lain yang menjawab berisiko di-mute!
                </p>
            </div>
        )}

        <div className="mt-3 w-full text-center min-h-[50px] shrink-0">
          <AnimatePresence mode="wait">
            {roundWinners.length > 0 && gameStyle === GameStyle.Classic ? (
              <motion.div
                key="winner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="flex flex-col items-center gap-1">
                    <p className="text-green-600 dark:text-green-300 font-semibold text-sm">Jawaban Benar Ditemukan!</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        Pemenang: <span className="font-bold text-slate-700 dark:text-white">{roundWinners.length}</span> / <span className="font-bold text-slate-700 dark:text-white">{maxWinnersForThisRound}</span>
                    </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="no-winner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                 <p className="text-gray-500 dark:text-gray-400 text-xs">Siapa yang akan menjawab tercepat?</p>
                 {gameStyle === GameStyle.Classic && (
                    <p className="text-amber-500 dark:text-amber-400 text-xs mt-1 font-semibold">Hanya {maxWinnersForThisRound} penebak tercepat yang mendapat poin!</p>
                 )}
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="w-full max-w-[150px] bg-sky-100 dark:bg-gray-700 rounded-full h-1.5 mx-auto mt-2">
            <motion.div
              className="bg-gradient-to-r from-sky-500 to-teal-400 h-1.5 rounded-full"
              animate={{ width: `${timerProgress}%` }}
              transition={{ duration: 0.5, ease: "linear" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GameTab;