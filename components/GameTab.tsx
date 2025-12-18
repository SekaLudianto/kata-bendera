
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOTAL_ROUNDS, ROUND_TIMER_SECONDS, KNOCKOUT_ROUND_TIMER_SECONDS, KNOCKOUT_TARGET_SCORE } from '../constants';
import { GameMode, GameStyle, LetterObject, LeaderboardEntry, ChatMessage, QuoteNotification } from '../types';
import { InternalGameState } from '../hooks/useGameLogic';
import { ServerIcon, HeartIcon, GiftIcon, InfoIcon, MessageCircleIcon } from './IconComponents';
import QuoteDisplay from './QuoteDisplay';
import { useSound } from '../hooks/useSound';

interface GameTabProps {
  gameState: InternalGameState;
  serverTime: Date | null;
  gifterLeaderboard: LeaderboardEntry[];
  likerLeaderboard: LeaderboardEntry[];
  currentQuote: QuoteNotification | null;
}

const formatServerTime = (date: Date | null): string => {
    if (!date) return '00:00:00';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const getLetterBoxSizeClasses = (totalLetters: number): string => {
  if (totalLetters > 22) return 'w-5 h-7 text-xs sm:text-sm gap-0.5';
  if (totalLetters > 16) return 'w-6 h-8 text-sm sm:text-lg gap-1';
  if (totalLetters > 12) return 'w-7 h-9 text-lg sm:text-xl gap-1';
  return 'w-9 h-11 text-xl sm:text-2xl gap-1.5';
};

const DanmakuBar: React.FC<{ messages: ChatMessage[] }> = ({ messages }) => {
    const displayMessages = messages.slice(0, 8); 
    return (
        <div className="w-full h-9 mb-2 relative flex items-center overflow-hidden bg-sky-50/50 dark:bg-gray-800/50 rounded-xl border border-sky-100 dark:border-gray-700 shrink-0">
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white dark:from-gray-800 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-800 to-transparent z-10 pointer-events-none"></div>
            <div className="flex items-center gap-2 px-2 overflow-hidden w-full">
                <div className="bg-sky-100 dark:bg-sky-900/30 p-1 rounded-full shrink-0 z-0">
                    <MessageCircleIcon className="w-3 h-3 text-sky-500" />
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {displayMessages.map((msg) => (
                            <motion.div 
                                key={msg.id}
                                layout
                                initial={{ opacity: 0, x: 50, scale: 0.8 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0, width: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-700 rounded-full shadow-sm border border-sky-100 dark:border-gray-600 shrink-0 whitespace-nowrap"
                            >
                                <img 
                                    src={msg.profilePictureUrl || 'https://i.pravatar.cc/40'} 
                                    alt="avatar" 
                                    className="w-4 h-4 rounded-full" 
                                />
                                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 max-w-[60px] truncate">
                                    {msg.nickname}
                                </span>
                                <span className="text-[10px] text-slate-600 dark:text-slate-300 max-w-[120px] truncate">
                                    {msg.comment}
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

const HangmanWordDisplay: React.FC<{ scrambledWord: LetterObject[][], isRoundActive: boolean, revealedIndices: number[] }> = ({ scrambledWord, isRoundActive, revealedIndices }) => {
    const totalLetters = scrambledWord.flat().length;
    const sizeClasses = getLetterBoxSizeClasses(totalLetters);
    
    let globalIndex = 0;

    return (
        <div className="flex flex-col items-center gap-1 px-2 relative">
            {scrambledWord.map((word, wordIndex) => (
                <div key={wordIndex} className={`flex flex-wrap justify-center ${sizeClasses.split(' ')[2]} mb-1`}>
                    {word.map((item: LetterObject) => {
                        const currentIndex = globalIndex;
                        const isRevealed = !isRoundActive || revealedIndices.includes(currentIndex);
                        globalIndex++;
                        
                        return (
                        <motion.div
                            key={item.id}
                            layout
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className={`flex items-center justify-center font-bold rounded-md border-b-4 transition-all duration-500 ${sizeClasses.split(' ').slice(0, 2).join(' ')} ${
                                isRevealed
                                    ? 'bg-sky-100 dark:bg-sky-900/30 border-sky-500 text-sky-600 dark:text-sky-400 shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-transparent'
                                }`}
                        >
                            {isRevealed ? item.letter : '.'}
                        </motion.div>
                    )})}
                </div>
            ))}
            
            {isRoundActive && revealedIndices.length < totalLetters && (
                <div className="mt-3 flex items-center justify-center gap-4 bg-white/10 dark:bg-black/20 px-3 py-1 rounded-full border border-sky-100/20 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Clue:</span>
                        <img 
                            src="https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp" 
                            alt="Mawar" 
                            className="w-4 h-4" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const FlagOverlay: React.FC<{ isRoundActive: boolean, isHardMode: boolean, revealedCount: number }> = ({ isRoundActive, isHardMode, revealedCount }) => {
    if (!isRoundActive || !isHardMode) return null;
    const totalBlocks = 16;
    const blocksToReveal = Math.min(revealedCount, totalBlocks);
    const blocks = Array.from({ length: totalBlocks }, (_, i) => i);
    return (
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 w-full h-full">
            {blocks.map((index) => {
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
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">?</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                );
            })}
        </div>
    );
};

const GuessTheFlagContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCountry, scrambledWord, isRoundActive, isHardMode, revealedIndices } = gameState;
    if (!currentCountry) return null;
    return (
        <>
            <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-2">
                Tebak Bendera:
            </h2>
            <div className="my-2 relative inline-block rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-600">
                <img 
                    src={`https://flagcdn.com/w160/${currentCountry.code}.png`} 
                    alt="Bendera" 
                    className="h-24 w-auto object-cover" 
                />
                <FlagOverlay isRoundActive={isRoundActive} isHardMode={isHardMode} revealedCount={revealedIndices.length} />
            </div>
            <HangmanWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} />
        </>
    );
};

const GuessTheEmojiContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentEmojiPuzzle, scrambledWord, isRoundActive, revealedIndices } = gameState;
    if (!currentEmojiPuzzle) return null;
    return (
        <div className="flex flex-col items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-4">
                Tebak Apa Ini?
            </h2>
            <motion.div 
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                className="bg-white dark:bg-gray-700 p-6 rounded-3xl shadow-xl border-4 border-amber-400 mb-6 flex items-center justify-center text-6xl sm:text-7xl"
            >
                {currentEmojiPuzzle.emoji}
            </motion.div>
            <HangmanWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} />
        </div>
    );
};

const ABC5DasarContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentLetter, currentCategory } = gameState;
    return (
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 mb-4">
            Kategori: <span className="text-amber-500">{currentCategory}</span>
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-300">Berawalan dengan huruf:</p>
        <div className="my-4 text-8xl font-bold text-amber-500 dark:text-amber-400 animate-pulse">
            {currentLetter}
        </div>
      </div>
    );
};

const GuessTheWordContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentWord, currentWordCategory, scrambledWord, isRoundActive, revealedIndices } = gameState;
    return (
      <>
        <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-3">
            Kategori: {currentWordCategory}
        </h2>
        <HangmanWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} />
        <AnimatePresence>
            {!isRoundActive && currentWord && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-center">
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">{currentWord}</p>
                 </motion.div>
            )}
        </AnimatePresence>
      </>
    );
};

const GuessTheCityContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCity, scrambledWord, isRoundActive, revealedIndices } = gameState;
    if (!currentCity) return null;
    return (
      <>
        <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-1">
            Tebak Kota
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-semibold italic text-center">
            Lokasi: {currentCity.region}
        </p>
        <HangmanWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} />
      </>
    );
};

const ZonaBolaContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentWord, currentStadium, currentWordCategory, scrambledWord, isRoundActive, revealedIndices } = gameState;
    return (
      <>
        <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-3">
            Zona Bola: {currentWordCategory}
        </h2>
        <HangmanWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} />
        <AnimatePresence>
            {!isRoundActive && (currentWord || currentStadium) && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-center">
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">
                        {currentWord || currentStadium?.name}
                    </p>
                 </motion.div>
            )}
        </AnimatePresence>
      </>
    );
};

const TriviaContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentTriviaQuestion, isRoundActive, scrambledWord, revealedIndices } = gameState;
    if (!currentTriviaQuestion) return null;
    return (
      <div className="text-center px-2 flex flex-col items-center justify-center gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-300 leading-tight">
            {currentTriviaQuestion.question}
        </h2>
        <HangmanWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} />
        <AnimatePresence>
        {!isRoundActive && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">Jawabannya:</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-300">{currentTriviaQuestion.answer}</p>
             </motion.div>
        )}
        </AnimatePresence>
      </div>
    );
};

const BikinEmosiContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentTriviaQuestion, isRoundActive, scrambledWord, revealedIndices } = gameState;
    if (!currentTriviaQuestion) return null;
    return (
      <div className="text-center px-2 flex flex-col items-center justify-center gap-3">
        <div className="bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full text-xs font-bold text-red-600 dark:text-red-400 mb-1 uppercase tracking-wide">
            ⚠️ Awas Jebakan!
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-200 leading-tight">
            {currentTriviaQuestion.question}
        </h2>
        <HangmanWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} />
        <AnimatePresence>
        {!isRoundActive && (
             <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-3 bg-amber-50 dark:bg-gray-700/50 rounded-lg border border-amber-200 dark:border-gray-600 w-full max-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Jawabannya:</p>
                <p className="text-xl font-extrabold text-green-600 dark:text-green-400 mb-2">{currentTriviaQuestion.answer}</p>
                {currentTriviaQuestion.explanation && (
                    <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-500">
                        <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 mb-0.5 uppercase">Kenapa gitu?</p>
                        <p className="text-xs italic text-slate-600 dark:text-slate-300">"{currentTriviaQuestion.explanation}"</p>
                    </div>
                )}
             </motion.div>
        )}
        </AnimatePresence>
      </div>
    );
};

const Top3List: React.FC<{ title: string; icon: React.ReactNode; data: LeaderboardEntry[]; emptyText: string; theme: 'like' | 'gift'; infoTooltip?: string }> = ({ title, icon, data, emptyText, theme, infoTooltip }) => {
    const top3 = data.slice(0, 3);
    const themeClasses = {
        like: { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-500/30', title: 'text-pink-600 dark:text-pink-400', score: 'text-pink-500 dark:text-pink-400' },
        gift: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-500/30', title: 'text-amber-600 dark:text-amber-400', score: 'text-amber-500 dark:text-amber-400' }
    };
    const currentTheme = themeClasses[theme];
    return (
        <div className={`rounded-xl p-2 ${currentTheme.bg} border ${currentTheme.border}`}>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
                {icon}
                <h3 className={`text-[10px] font-bold uppercase tracking-wider ${currentTheme.title}`}>{title}</h3>
            </div>
            {top3.length > 0 ? (
                <div className="space-y-1">
                    {top3.map((entry, index) => (
                        <motion.div key={entry.userId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center gap-2 text-[10px]">
                            <img src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'} alt={entry.nickname} className="w-4 h-4 rounded-full" />
                            <span className="font-semibold truncate flex-1 text-slate-700 dark:text-slate-300">{entry.nickname}</span>
                            <span className={`font-bold ${currentTheme.score}`}>{entry.score.toLocaleString()}</span>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 py-2">{emptyText}</p>
            )}
        </div>
    );
};

const GameTab: React.FC<GameTabProps> = ({ gameState, serverTime, gifterLeaderboard, likerLeaderboard, currentQuote }) => {
  const { round, totalRounds, roundWinners, roundTimer, gameMode, availableAnswersCount, maxWinners, gameStyle, knockoutBracket, currentBracketRoundIndex, currentMatchIndex, knockoutMatchPoints, chatMessages, revealedIndices } = gameState;
  const progressPercentage = (round / totalRounds) * 100;
  const { playSound } = useSound();
  const timerDuration = gameStyle === GameStyle.Knockout ? KNOCKOUT_ROUND_TIMER_SECONDS : ROUND_TIMER_SECONDS;
  const timerProgress = (roundTimer / timerDuration) * 100;

  useEffect(() => { if (currentQuote) playSound('quotePop'); }, [currentQuote, playSound]);

  const maxWinnersForThisRound = gameMode === GameMode.ABC5Dasar && availableAnswersCount != null ? Math.min(maxWinners, availableAnswersCount) : maxWinners;
    
  const getRoundTitle = () => {
    if (gameStyle === GameStyle.Knockout) return "Mode Knockout";
    if (gameMode === GameMode.GuessTheFlag) return 'Tebak Bendera';
    if (gameMode === GameMode.GuessTheEmoji) return 'Tebak Emoji';
    if (gameMode === GameMode.ABC5Dasar) return `ABC 5 Dasar`;
    if (gameMode === GameMode.Trivia) return 'Trivia Umum';
    if (gameMode === GameMode.FootballTrivia) return 'Trivia Bola';
    if (gameMode === GameMode.BikinEmosi) return 'Bikin Emosi';
    if (gameMode === GameMode.GuessTheCity) return 'Tebak Kota';
    if (gameMode === GameMode.ZonaBola) return 'Zona Bola';
    return 'Kuis Live';
  }

  const currentMatch = gameStyle === GameStyle.Knockout && knockoutBracket && currentBracketRoundIndex !== null && currentMatchIndex !== null ? knockoutBracket[currentBracketRoundIndex][currentMatchIndex] : null;

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-3 flex flex-col h-full relative">
      <div className="grid grid-cols-3 items-center text-[10px] text-gray-500 dark:text-gray-400 shrink-0 mb-1">
        <span className="text-left">{gameStyle === GameStyle.Classic ? `Ronde ${round}/${totalRounds}` : `🎯 Target ${KNOCKOUT_TARGET_SCORE}`}</span>
        <span className='font-bold text-center uppercase tracking-tighter'>{getRoundTitle()}</span>
        <div className="flex items-center gap-1 justify-self-end">
            <ServerIcon className="w-3 h-3" />
            <span className="font-mono font-bold">{formatServerTime(serverTime)}</span>
        </div>
      </div>

      <div className="w-full bg-sky-100 dark:bg-gray-700 rounded-full h-1.5 mb-2 shrink-0 overflow-hidden">
        <motion.div className="bg-gradient-to-r from-sky-500 to-teal-400 h-full" initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-2 shrink-0">
        <Top3List title="TOP LIKER" icon={<HeartIcon className="w-3 h-3 text-pink-500" />} data={likerLeaderboard} emptyText="..." theme="like" />
        <Top3List title="TOP GIFTER" icon={<GiftIcon className="w-3 h-3 text-amber-500" />} data={gifterLeaderboard} emptyText="..." theme="gift" />
      </div>

      <DanmakuBar messages={chatMessages} />
      
      <AnimatePresence>
        {currentQuote && <QuoteDisplay key={currentQuote.id} {...currentQuote} />}
      </AnimatePresence>

      <div className="flex-grow flex flex-col items-center justify-center">
        {currentMatch && currentMatch.player1 && currentMatch.player2 && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex justify-between items-center mb-4 px-2 gap-2">
                <div className="flex flex-col items-center flex-1 min-w-0">
                    <img src={currentMatch.player1.profilePictureUrl} className="w-12 h-12 rounded-full border-2 border-sky-400"/>
                    <p className="font-bold text-[10px] mt-1 truncate w-full text-center">{currentMatch.player1.nickname}</p>
                </div>
                <div className="text-center px-2">
                    <p className="text-2xl font-black text-red-500">{knockoutMatchPoints.player1} - {knockoutMatchPoints.player2}</p>
                </div>
                <div className="flex flex-col items-center flex-1 min-w-0">
                    <img src={currentMatch.player2.profilePictureUrl} className="w-12 h-12 rounded-full border-2 border-gray-400"/>
                    <p className="font-bold text-[10px] mt-1 truncate w-full text-center">{currentMatch.player2.nickname}</p>
                </div>
             </motion.div>
        )}
        
        {gameState.gameMode === GameMode.GuessTheFlag && <GuessTheFlagContent gameState={gameState} />}
        {gameState.gameMode === GameMode.GuessTheEmoji && <GuessTheEmojiContent gameState={gameState} />}
        {gameState.gameMode === GameMode.ABC5Dasar && <ABC5DasarContent gameState={gameState} />}
        {(gameState.gameMode === GameMode.Trivia || gameState.gameMode === GameMode.KpopTrivia || gameState.gameMode === GameMode.FootballTrivia) && <TriviaContent gameState={gameState} />}
        {gameState.gameMode === GameMode.BikinEmosi && <BikinEmosiContent gameState={gameState} />}
        {gameState.gameMode === GameMode.GuessTheCity && <GuessTheCityContent gameState={gameState} />}
        {gameState.gameMode === GameMode.ZonaBola && <ZonaBolaContent gameState={gameState} />}
        {(gameState.gameMode === GameMode.GuessTheWord || gameState.gameMode === GameMode.GuessTheFruit || gameState.gameMode === GameMode.GuessTheAnimal || gameState.gameMode === GameMode.ZonaFilm) && <GuessTheWordContent gameState={gameState} />}

        <div className="mt-4 w-full text-center min-h-[40px] shrink-0">
          <AnimatePresence mode="wait">
            {roundWinners.length > 0 && gameStyle === GameStyle.Classic ? (
              <motion.div key="winner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                 <p className="text-green-600 dark:text-green-300 font-bold text-xs">Jawaban Benar!</p>
                 <p className="text-gray-500 text-[10px]">Slot: <span className="font-bold">{roundWinners.length}/{maxWinnersForThisRound}</span></p>
              </motion.div>
            ) : (
              <motion.div key="no-winner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                 <p className="text-gray-400 text-[10px]">Menunggu jawaban dari chat...</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-full max-w-[100px] bg-sky-100 dark:bg-gray-700 rounded-full h-1 mx-auto mt-2 overflow-hidden">
            <motion.div className="bg-sky-500 h-full" animate={{ width: `${timerProgress}%` }} transition={{ duration: 0.5, ease: "linear" }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GameTab;
