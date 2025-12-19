
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOTAL_ROUNDS, ROUND_TIMER_SECONDS, KNOCKOUT_ROUND_TIMER_SECONDS, KNOCKOUT_TARGET_SCORE } from '../constants';
import { GameMode, GameStyle, LetterObject, LeaderboardEntry, ChatMessage, QuoteNotification, ColorTheme } from '../types';
import { InternalGameState } from '../hooks/useGameLogic';
import { ServerIcon, HeartIcon, GiftIcon, MessageCircleIcon } from './IconComponents';
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

// UKURAN DIOPTIMALKAN: Lebih kecil agar muat banyak baris
const getLetterBoxSizeClasses = (maxWordLength: number): string => {
  if (maxWordLength > 16) return 'w-3.5 h-5 min-w-[0.875rem] min-h-[1.25rem] text-[9px]';
  if (maxWordLength > 12) return 'w-4 h-6 min-w-[1rem] min-h-[1.5rem] text-[10px]';
  if (maxWordLength > 9) return 'w-6 h-8 min-w-[1.5rem] min-h-[2rem] text-xs';
  if (maxWordLength > 7) return 'w-8 h-10 min-w-[2rem] min-h-[2.5rem] text-base sm:text-lg';
  return 'w-9 h-12 min-w-[2.25rem] min-h-[3rem] text-xl sm:text-2xl';
};

const DanmakuBar: React.FC<{ messages: ChatMessage[] }> = ({ messages }) => {
    const displayMessages = messages.slice(0, 8); 
    return (
        <div className="w-full h-8 mb-1.5 relative flex items-center overflow-hidden bg-sky-50/50 dark:bg-gray-800/50 rounded-xl border border-sky-100 dark:border-gray-700 shrink-0">
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
                                className="flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-700 rounded-full shadow-sm border border-sky-100 dark:border-gray-600 shrink-0 whitespace-nowrap"
                            >
                                <img 
                                    src={msg.profilePictureUrl || 'https://i.pravatar.cc/40'} 
                                    alt="avatar" 
                                    className="w-3.5 h-3.5 rounded-full" 
                                />
                                <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 max-w-[50px] truncate">
                                    {msg.nickname}
                                </span>
                                <span className="text-[9px] text-slate-600 dark:text-slate-300 max-w-[100px] truncate">
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

const FlipCard: React.FC<{ letter: string, isRevealed: boolean, sizeClasses: string, delay: number, theme: ColorTheme }> = ({ letter, isRevealed, sizeClasses, delay, theme }) => {
    
    const getThemeGradient = (t: ColorTheme) => {
        switch(t) {
            case 'emerald': return 'from-emerald-400 to-teal-600';
            case 'rose': return 'from-rose-400 to-pink-600';
            case 'amber': return 'from-amber-400 to-orange-600';
            case 'purple': return 'from-purple-400 to-fuchsia-600';
            case 'cyan': return 'from-cyan-400 to-sky-600';
            case 'indigo': return 'from-indigo-500 to-purple-700';
            case 'orange': return 'from-orange-400 to-red-600';
            case 'teal': return 'from-teal-400 to-cyan-600';
            default: return 'from-sky-400 to-blue-600';
        }
    };

    return (
        <div className={`relative ${sizeClasses} perspective-1000 group m-0.5 shrink-0`}>
            <motion.div
                initial={false}
                animate={{ rotateY: isRevealed ? 180 : 0 }}
                transition={{ 
                    duration: 0.8, 
                    delay: isRevealed ? 0 : delay, 
                    type: "spring", 
                    stiffness: 180, 
                    damping: 18 
                }}
                className="w-full h-full relative preserve-3d"
            >
                {/* Sisi Depan (Tertutup) */}
                <div className={`absolute inset-0 backface-hidden flex items-center justify-center rounded-lg shadow-md border-t border-l border-white/20 bg-gradient-to-br ${getThemeGradient(theme)} overflow-hidden`}>
                   <div className="absolute inset-0 bg-white/5 opacity-40 backdrop-blur-[1px]"></div>
                   <div className="relative text-white/40 font-black select-none italic text-[0.8em]">?</div>
                </div>

                {/* Sisi Belakang (Terbuka) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center rounded-lg shadow-inner bg-white dark:bg-gray-800 border-[1.5px] border-sky-400 dark:border-sky-500">
                    <span className="font-black text-slate-800 dark:text-white drop-shadow-sm leading-none">{letter}</span>
                </div>
            </motion.div>
        </div>
    );
};

const FlipWordDisplay: React.FC<{ scrambledWord: LetterObject[][], isRoundActive: boolean, revealedIndices: number[], theme: ColorTheme }> = ({ scrambledWord, isRoundActive, revealedIndices, theme }) => {
    const maxWordLength = Math.max(...scrambledWord.map(word => word.length), 0);
    const sizeClasses = getLetterBoxSizeClasses(maxWordLength);
    
    let globalIndex = 0;

    return (
        <div className="flex flex-col items-center gap-1.5 px-1 relative py-1 w-full">
            {scrambledWord.map((word, wordIndex) => (
                <div key={wordIndex} className="flex justify-center gap-0.5 w-full flex-nowrap">
                    {word.map((item: LetterObject) => {
                        const currentIndex = globalIndex;
                        const isRevealed = !isRoundActive || revealedIndices.includes(currentIndex);
                        globalIndex++;
                        
                        return (
                            <FlipCard 
                                key={item.id}
                                letter={item.letter}
                                isRevealed={isRevealed}
                                sizeClasses={sizeClasses}
                                delay={wordIndex * 0.12 + (currentIndex % 6) * 0.05}
                                theme={theme}
                            />
                        );
                    })}
                </div>
            ))}
            
            {isRoundActive && revealedIndices.length < (scrambledWord.flat().length) && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="mt-2 flex items-center justify-center gap-1.5 bg-white/30 dark:bg-black/30 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm"
                >
                    <img 
                        src="https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp" 
                        alt="Mawar" 
                        className="w-4 h-4 animate-bounce" 
                    />
                    <span className="text-slate-600 dark:text-gray-200 text-[9px] font-black uppercase tracking-wider">= 1 HURUF</span>
                </motion.div>
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
                                className="bg-slate-300 dark:bg-slate-700 border border-slate-400/30 flex items-center justify-center"
                            >
                                <span className="text-[8px] text-slate-500 dark:text-slate-400 font-black">?</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                );
            })}
        </div>
    );
};

const GuessTheFlagContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCountry, scrambledWord, isRoundActive, isHardMode, revealedIndices, currentRoundTheme } = gameState;
    if (!currentCountry) return null;
    return (
        <>
            <motion.h2 
                className="text-base font-black text-sky-600 dark:text-sky-400 text-center mb-1 uppercase tracking-tighter"
            >
                TEBAK BENDERA
            </motion.h2>
            <div 
                className="my-1 relative inline-block rounded-lg overflow-hidden shadow-xl border-2 border-white dark:border-gray-800"
            >
                <img 
                    src={`https://flagcdn.com/w320/${currentCountry.code}.png`} 
                    alt="Bendera" 
                    className="h-20 sm:h-24 w-auto object-cover" 
                />
                <FlagOverlay isRoundActive={isRoundActive} isHardMode={isHardMode} revealedCount={revealedIndices.length} />
            </div>
            <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        </>
    );
};

const GuessTheEmojiContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentEmojiPuzzle, scrambledWord, isRoundActive, revealedIndices, currentRoundTheme, currentWordCategory } = gameState;
    if (!currentEmojiPuzzle) return null;
    return (
        <div className="flex flex-col items-center w-full px-2">
            <h2 className="text-sm sm:text-base font-black text-sky-600 dark:text-sky-400 text-center mb-0.5 uppercase tracking-tighter">
                TEBAK APA INI?
            </h2>
            {currentWordCategory && (
                <div className="mb-2 px-2 py-0.5 bg-amber-100/60 dark:bg-amber-900/30 rounded-full border border-amber-300/30 shadow-sm backdrop-blur-sm">
                    <span className="text-[8px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">{currentWordCategory}</span>
                </div>
            )}
            <motion.div 
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-[1.5rem] border-b-4 border-amber-500 mb-2 flex items-center justify-center text-4xl sm:text-5xl min-h-[80px] min-w-[110px]"
            >
                {currentEmojiPuzzle.emoji}
            </motion.div>
            <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        </div>
    );
};

const ABC5DasarContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentLetter, currentCategory } = gameState;
    return (
      <div className="text-center">
        <h2 className="text-base sm:text-lg font-black text-sky-600 dark:text-sky-400 mb-1 uppercase tracking-tight">
            KATEGORI: <span className="text-amber-500">{currentCategory}</span>
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">HURUF DEPAN:</p>
        <motion.div 
            animate={{ 
                scale: [1, 1.2, 1],
                filter: ["drop-shadow(0 0 10px #fbbf24)", "drop-shadow(0 0 30px #fbbf24)", "drop-shadow(0 0 10px #fbbf24)"]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="my-3 sm:my-5 text-[60px] sm:text-[80px] font-black text-amber-500 dark:text-amber-400 drop-shadow-xl"
        >
            {currentLetter}
        </motion.div>
      </div>
    );
};

const GuessTheWordContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentWord, currentWordCategory, scrambledWord, isRoundActive, revealedIndices, currentRoundTheme } = gameState;
    return (
      <>
        <h2 className="text-base font-black text-sky-600 dark:text-sky-400 text-center mb-2 uppercase tracking-tighter">
            KATEGORI: {currentWordCategory}
        </h2>
        <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        <AnimatePresence>
            {!isRoundActive && currentWord && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center">
                    <p className="text-sm font-black text-green-600 dark:text-green-400 px-5 py-1.5 bg-green-100/40 dark:bg-green-900/20 rounded-full border border-green-400/30 uppercase tracking-wider">{currentWord}</p>
                 </motion.div>
            )}
        </AnimatePresence>
      </>
    );
};

const GuessTheCityContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCity, scrambledWord, isRoundActive, revealedIndices, currentRoundTheme } = gameState;
    if (!currentCity) return null;
    return (
      <>
        <h2 className="text-base font-black text-sky-600 dark:text-sky-400 text-center mb-1 uppercase tracking-tighter">
            TEBAK KOTA
        </h2>
        <p className="text-[9px] text-gray-500 dark:text-gray-400 mb-2 font-black italic text-center px-3 py-0.5 bg-sky-100/40 dark:bg-sky-900/30 rounded-full uppercase tracking-tight">
            LOKASI: {currentCity.region}
        </p>
        <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
      </>
    );
};

const ZonaBolaContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentWord, currentStadium, currentWordCategory, scrambledWord, isRoundActive, revealedIndices, currentRoundTheme } = gameState;
    return (
      <>
        <h2 className="text-base font-black text-sky-600 dark:text-sky-400 text-center mb-2 uppercase tracking-tighter">
            ZONA BOLA: {currentWordCategory}
        </h2>
        <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        <AnimatePresence>
            {!isRoundActive && (currentWord || currentStadium) && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center">
                    <p className="text-sm font-black text-green-600 dark:text-green-400 px-5 py-1.5 bg-green-100/40 dark:bg-green-900/20 rounded-full uppercase tracking-wider">
                        {currentWord || currentStadium?.name}
                    </p>
                 </motion.div>
            )}
        </AnimatePresence>
      </>
    );
};

const TriviaContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentTriviaQuestion, isRoundActive, scrambledWord, revealedIndices, currentRoundTheme } = gameState;
    if (!currentTriviaQuestion) return null;
    return (
      <div className="text-center px-2 flex flex-col items-center justify-center gap-2">
        <h2 className="text-sm sm:text-base font-black text-sky-600 dark:text-sky-300 leading-tight bg-white/40 dark:bg-gray-800/40 p-3 sm:p-4 rounded-2xl shadow-lg border border-white/20">
            {currentTriviaQuestion.question}
        </h2>
        <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        <AnimatePresence>
        {!isRoundActive && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1">
                <p className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase mb-0.5">JAWABAN:</p>
                <p className="text-base font-black text-green-600 dark:text-green-400 uppercase tracking-widest">{currentTriviaQuestion.answer}</p>
             </motion.div>
        )}
        </AnimatePresence>
      </div>
    );
};

const BikinEmosiContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentTriviaQuestion, isRoundActive, scrambledWord, revealedIndices, currentRoundTheme } = gameState;
    if (!currentTriviaQuestion) return null;
    return (
      <div className="text-center px-2 flex flex-col items-center justify-center gap-1.5">
        <div className="bg-red-600 px-4 py-0.5 rounded-full text-[9px] font-black text-white mb-1 uppercase tracking-widest shadow-lg">
            ⚠️ AWAS JEBAKAN! ⚠️
        </div>
        <h2 className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-100 leading-tight p-1 sm:p-2">
            {currentTriviaQuestion.question}
        </h2>
        <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        <AnimatePresence>
        {!isRoundActive && (
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-1 p-3 sm:p-4 bg-amber-50/60 dark:bg-gray-800/60 rounded-[1.5rem] border-2 border-amber-400/40 w-full shadow-xl backdrop-blur-sm">
                <p className="text-[9px] text-amber-700 dark:text-amber-400 mb-0.5 font-black uppercase tracking-widest">JAWABAN NYELENEH:</p>
                <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-300 mb-1 sm:mb-2 uppercase">{currentTriviaQuestion.answer}</p>
                {currentTriviaQuestion.explanation && (
                    <div className="pt-1 sm:pt-2 border-t border-dashed border-amber-300/40">
                        <p className="text-[8px] font-black text-sky-600 dark:text-sky-400 mb-0.5 uppercase tracking-widest">LOGIKA ADMIN:</p>
                        <p className="text-[10px] sm:text-xs italic text-slate-700 dark:text-slate-200 font-bold">"{currentTriviaQuestion.explanation}"</p>
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
        like: { bg: 'bg-pink-50/40 dark:bg-pink-900/10', border: 'border-pink-200/40 dark:border-pink-500/20', title: 'text-pink-600 dark:text-pink-400', score: 'text-pink-500 dark:text-pink-400' },
        gift: { bg: 'bg-amber-50/40 dark:bg-amber-900/10', border: 'border-amber-200/40 dark:border-amber-500/20', title: 'text-amber-600 dark:text-amber-400', score: 'text-amber-500 dark:text-amber-400' }
    };
    const currentTheme = themeClasses[theme];
    return (
        <div className={`rounded-xl p-1.5 ${currentTheme.bg} border backdrop-blur-sm shadow-sm ${currentTheme.border}`}>
            <div className="flex items-center gap-1 mb-1 px-1">
                {icon}
                <h3 className={`text-[9px] font-black uppercase tracking-wider ${currentTheme.title}`}>{title}</h3>
            </div>
            {top3.length > 0 ? (
                <div className="space-y-0.5">
                    {top3.map((entry, index) => (
                        <motion.div key={entry.userId} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center gap-1.5 text-[9px]">
                            <img src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'} alt={entry.nickname} className="w-4 h-4 rounded-full border border-white/50" />
                            <span className="font-bold truncate flex-1 text-slate-700 dark:text-slate-300">{entry.nickname}</span>
                            <span className={`font-black ${currentTheme.score}`}>{entry.score.toLocaleString()}</span>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-[8px] text-slate-400 dark:text-slate-500 py-1 font-bold italic">{emptyText}</p>
            )}
        </div>
    );
};

const GameTab: React.FC<GameTabProps> = ({ gameState, serverTime, gifterLeaderboard, likerLeaderboard, currentQuote }) => {
  const { round, totalRounds, roundWinners, roundTimer, gameMode, availableAnswersCount, maxWinners, gameStyle, knockoutBracket, currentBracketRoundIndex, currentMatchIndex, knockoutMatchPoints, chatMessages, revealedIndices, currentRoundTheme } = gameState;
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
    return 'Tebak-tebakan Live';
  }

  const currentMatch = gameStyle === GameStyle.Knockout && knockoutBracket && currentBracketRoundIndex !== null && currentMatchIndex !== null ? knockoutBracket[currentBracketRoundIndex][currentMatchIndex] : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2 flex flex-col h-full relative overflow-hidden">
      <div className="grid grid-cols-3 items-center text-[9px] text-gray-500 dark:text-gray-400 shrink-0 mb-1 px-1">
        <span className="text-left font-black">{gameStyle === GameStyle.Classic ? `RONDE ${round}/${totalRounds}` : `🎯 TARGET ${KNOCKOUT_TARGET_SCORE}`}</span>
        <span className='font-black text-center uppercase tracking-widest text-sky-500 truncate'>{getRoundTitle()}</span>
        <div className="flex items-center gap-1 justify-self-end">
            <ServerIcon className="w-2.5 h-2.5 animate-pulse" />
            <span className="font-mono font-black">{formatServerTime(serverTime)}</span>
        </div>
      </div>

      <div className="w-full bg-sky-100 dark:bg-gray-700 rounded-full h-1.5 mb-2 shrink-0 overflow-hidden">
        <motion.div className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full" initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} />
      </div>
      
      <div className="grid grid-cols-2 gap-1.5 mb-1.5 shrink-0">
        <Top3List title="TOP LIKER" icon={<HeartIcon className="w-2.5 h-2.5 text-pink-500" />} data={likerLeaderboard} emptyText="..." theme="like" />
        <Top3List title="TOP GIFTER" icon={<GiftIcon className="w-2.5 h-2.5 text-amber-500" />} data={gifterLeaderboard} emptyText="..." theme="gift" />
      </div>

      <DanmakuBar messages={chatMessages} />
      
      <AnimatePresence>
        {currentQuote && <QuoteDisplay key={currentQuote.id} {...currentQuote} />}
      </AnimatePresence>

      <div className="flex-grow flex flex-col items-center justify-center relative min-h-0">
        {currentMatch && currentMatch.player1 && currentMatch.player2 && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex justify-between items-center mb-3 px-2 gap-2 bg-white/20 dark:bg-gray-900/20 p-2 rounded-2xl backdrop-blur-sm border border-white/10">
                <div className="flex flex-col items-center flex-1 min-w-0">
                    <img src={currentMatch.player1.profilePictureUrl} className="w-10 h-10 rounded-full border-2 border-sky-400 shadow-md"/>
                    <p className="font-black text-[9px] mt-1 truncate w-full text-center text-slate-700 dark:text-white">{currentMatch.player1.nickname}</p>
                </div>
                <div className="text-center px-1">
                    <p className="text-[14px] font-black text-red-500">{knockoutMatchPoints.player1} - {knockoutMatchPoints.player2}</p>
                </div>
                <div className="flex flex-col items-center flex-1 min-w-0">
                    <img src={currentMatch.player2.profilePictureUrl} className="w-10 h-10 rounded-full border-2 border-gray-400 shadow-md"/>
                    <p className="font-black text-[9px] mt-1 truncate w-full text-center text-slate-700 dark:text-white">{currentMatch.player2.nickname}</p>
                </div>
             </motion.div>
        )}
        
        <div className="w-full flex flex-col items-center justify-center">
            {gameState.gameMode === GameMode.GuessTheFlag && <GuessTheFlagContent gameState={gameState} />}
            {gameState.gameMode === GameMode.GuessTheEmoji && <GuessTheEmojiContent gameState={gameState} />}
            {gameState.gameMode === GameMode.ABC5Dasar && <ABC5DasarContent gameState={gameState} />}
            {(gameState.gameMode === GameMode.Trivia || gameState.gameMode === GameMode.KpopTrivia || gameState.gameMode === GameMode.FootballTrivia) && <TriviaContent gameState={gameState} />}
            {gameState.gameMode === GameMode.BikinEmosi && <BikinEmosiContent gameState={gameState} />}
            {gameState.gameMode === GameMode.GuessTheCity && <GuessTheCityContent gameState={gameState} />}
            {gameState.gameMode === GameMode.ZonaBola && <ZonaBolaContent gameState={gameState} />}
            {(gameState.gameMode === GameMode.GuessTheWord || gameState.gameMode === GameMode.GuessTheFruit || gameState.gameMode === GameMode.GuessTheAnimal || gameState.gameMode === GameMode.ZonaFilm) && <GuessTheWordContent gameState={gameState} />}
        </div>

        <div className="mt-4 w-full text-center min-h-[40px] shrink-0">
          <AnimatePresence mode="wait">
            {roundWinners.length > 0 && gameStyle === GameStyle.Classic ? (
              <motion.div key="winner" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                 <div className="px-4 py-0.5 bg-green-500 text-white rounded-full text-[9px] font-black shadow-md animate-bounce uppercase tracking-wider">Jawaban Benar!</div>
                 <p className="text-gray-500 text-[9px] mt-0.5 font-bold">Terisi: <span className="text-sky-500">{roundWinners.length}/{maxWinnersForThisRound} SLOT</span></p>
              </motion.div>
            ) : (
              <motion.div key="no-winner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                 <p className="text-gray-400 text-[9px] font-black uppercase tracking-wider animate-pulse">Menunggu jawaban dari chat...</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-full max-w-[100px] bg-sky-100 dark:bg-gray-700 rounded-full h-1 mx-auto mt-2 overflow-hidden">
            <motion.div 
                className="bg-sky-500 h-full" 
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
