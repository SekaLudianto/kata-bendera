
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

const getLetterBoxSizeClasses = (maxWordLength: number): string => {
  // Penskalaan agresif untuk memastikan kartu mengecil sesuai panjang kata (1 kata 1 baris)
  if (maxWordLength > 30) return 'w-2.5 h-4 min-w-[0.6rem] min-h-[1rem] text-[7px] m-[0.5px]';
  if (maxWordLength > 24) return 'w-3 h-5 min-w-[0.75rem] min-h-[1.25rem] text-[9px] m-[1px]';
  if (maxWordLength > 19) return 'w-4 h-6 min-w-[1rem] min-h-[1.5rem] text-[10px] m-[1px]';
  if (maxWordLength > 15) return 'w-5 h-7 min-w-[1.25rem] min-h-[1.75rem] text-[11px] m-[1.5px]';
  if (maxWordLength > 11) return 'w-7 h-9 min-w-[1.75rem] min-h-[2.25rem] text-sm m-[2px]';
  if (maxWordLength > 8) return 'w-9 h-11 min-w-[2.25rem] min-h-[2.75rem] text-lg sm:text-xl m-[2px]';
  return 'w-10 h-14 min-w-[2.5rem] min-h-[3.5rem] text-2xl sm:text-3xl m-[3px]';
};

const DanmakuBar: React.FC<{ messages: ChatMessage[] }> = ({ messages }) => {
    const displayMessages = messages.slice(0, 8); 
    return (
        <div className="w-full h-8 mb-2 relative flex items-center overflow-hidden bg-slate-900/40 rounded-xl border border-white/5 shrink-0">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none"></div>
            <div className="flex items-center gap-2 px-2 overflow-hidden w-full">
                <div className="bg-sky-500/20 p-1 rounded-full shrink-0">
                    <MessageCircleIcon className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {displayMessages.map((msg) => (
                            <motion.div 
                                key={msg.id}
                                layout
                                initial={{ opacity: 0, x: 30, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0, width: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800/80 rounded-full border border-white/10 shrink-0 whitespace-nowrap"
                            >
                                <img 
                                    src={msg.profilePictureUrl || 'https://i.pravatar.cc/40'} 
                                    alt="avatar" 
                                    className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20" 
                                />
                                <span className="text-[10px] font-bold text-sky-300 max-w-[60px] truncate">
                                    {msg.nickname}
                                </span>
                                <span className="text-[10px] text-slate-300 max-w-[110px] truncate font-medium">
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
            case 'emerald': return 'from-emerald-500 to-teal-700';
            case 'rose': return 'from-rose-500 to-pink-700';
            case 'amber': return 'from-amber-500 to-orange-700';
            case 'purple': return 'from-purple-500 to-fuchsia-700';
            case 'cyan': return 'from-cyan-500 to-sky-700';
            case 'indigo': return 'from-indigo-600 to-violet-800';
            case 'orange': return 'from-orange-500 to-red-700';
            case 'teal': return 'from-teal-500 to-cyan-700';
            default: return 'from-sky-500 to-blue-700';
        }
    };

    return (
        <div className={`relative ${sizeClasses} perspective-1000 group shrink-0`}>
            <motion.div
                initial={false}
                animate={{ rotateY: isRevealed ? 180 : 0 }}
                transition={{ 
                    duration: 0.7, 
                    delay: isRevealed ? 0 : delay, 
                    type: "spring", 
                    stiffness: 200, 
                    damping: 20 
                }}
                className="w-full h-full relative preserve-3d"
            >
                {/* Front (Hidden) */}
                <div className={`absolute inset-0 backface-hidden flex items-center justify-center rounded-lg shadow-lg border border-white/20 bg-gradient-to-br ${getThemeGradient(theme)}`}>
                   <span className="text-white/40 font-black italic text-[1.1em]">?</span>
                </div>

                {/* Back (Revealed) - Putih Solid untuk keterbacaan maksimal */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center rounded-lg bg-slate-50 border-2 border-sky-400 shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]">
                    <span className="font-black text-slate-900 drop-shadow-sm leading-none uppercase">{letter}</span>
                </div>
            </motion.div>
        </div>
    );
};

const FlipWordDisplay: React.FC<{ scrambledWord: LetterObject[][], isRoundActive: boolean, revealedIndices: number[], theme: ColorTheme }> = ({ scrambledWord, isRoundActive, revealedIndices, theme }) => {
    // Cari panjang kata terpanjang di antara semua kata untuk menentukan ukuran kotak global
    const maxWordLength = Math.max(...scrambledWord.map(word => word.length), 0);
    const sizeClasses = getLetterBoxSizeClasses(maxWordLength);
    
    let globalIndex = 0;

    return (
        <div className="flex flex-col items-center gap-3 px-1 relative py-1 w-full max-w-full">
            {scrambledWord.map((word, wordIndex) => (
                // flex-nowrap memastikan satu kata selalu satu baris horizontal, tidak terpotong margin
                <div key={wordIndex} className="flex justify-center w-full flex-nowrap overflow-visible">
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
                                delay={wordIndex * 0.1 + (currentIndex % 5) * 0.05}
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
                    className="mt-4 flex items-center justify-center gap-2 bg-slate-900/60 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md"
                >
                    <img 
                        src="https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp" 
                        alt="Mawar" 
                        className="w-4 h-4 animate-bounce" 
                    />
                    <span className="text-amber-400 text-[10px] font-extrabold uppercase tracking-widest">+1 HURUF</span>
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
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 w-full h-full bg-slate-900/20 backdrop-blur-[2px]">
            {blocks.map((index) => {
                const isRevealed = index < blocksToReveal;
                return (
                    <AnimatePresence key={index}>
                        {!isRevealed && (
                            <motion.div
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="bg-slate-800 border border-white/5 flex items-center justify-center"
                            >
                                <span className="text-[10px] text-slate-500 font-bold">?</span>
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
        <div className="flex flex-col items-center w-full">
            <motion.h2 
                className="text-sm font-black text-sky-400 text-center mb-2 uppercase tracking-[0.2em]"
            >
                TEBAK NEGARA
            </motion.h2>
            <div 
                className="mb-6 relative inline-block rounded-xl overflow-hidden shadow-2xl border-4 border-slate-700 ring-4 ring-sky-500/20"
            >
                <img 
                    src={`https://flagcdn.com/w320/${currentCountry.code}.png`} 
                    alt="Bendera" 
                    className="h-24 sm:h-28 w-auto object-cover" 
                />
                <FlagOverlay isRoundActive={isRoundActive} isHardMode={isHardMode} revealedCount={revealedIndices.length} />
            </div>
            <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        </div>
    );
};

const GuessTheEmojiContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentEmojiPuzzle, scrambledWord, isRoundActive, revealedIndices, currentRoundTheme, currentWordCategory } = gameState;
    if (!currentEmojiPuzzle) return null;
    return (
        <div className="flex flex-col items-center w-full px-2">
            <h2 className="text-sm font-black text-sky-400 text-center mb-1 uppercase tracking-[0.2em]">
                TEBAK APA INI?
            </h2>
            {currentWordCategory && (
                <div className="mb-4 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/30">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{currentWordCategory}</span>
                </div>
            )}
            <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="bg-slate-800/80 p-5 rounded-[2rem] border-2 border-white/10 mb-6 flex items-center justify-center text-5xl sm:text-6xl min-h-[100px] shadow-xl"
            >
                <span className="drop-shadow-lg">{currentEmojiPuzzle.emoji}</span>
            </motion.div>
            <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        </div>
    );
};

const ABC5DasarContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentLetter, currentCategory } = gameState;
    return (
      <div className="text-center py-4">
        <h2 className="text-sm font-black text-sky-400 mb-2 uppercase tracking-[0.2em]">
            KATEGORI: <span className="text-amber-400">{currentCategory}</span>
        </h2>
        <p className="text-xs text-slate-400 font-bold tracking-widest mb-2">HURUF DEPAN:</p>
        <motion.div 
            animate={{ 
                scale: [1, 1.15, 1],
                filter: ["drop-shadow(0 0 10px rgba(251,191,36,0.2))", "drop-shadow(0 0 30px rgba(251,191,36,0.4))", "drop-shadow(0 0 10px rgba(251,191,36,0.2))"]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="my-4 text-[100px] sm:text-[120px] font-black text-amber-400 drop-shadow-2xl leading-none italic"
        >
            {currentLetter}
        </motion.div>
      </div>
    );
};

const GuessTheWordContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentWord, currentWordCategory, scrambledWord, isRoundActive, revealedIndices, currentRoundTheme } = gameState;
    return (
      <div className="flex flex-col items-center w-full">
        <h2 className="text-sm font-black text-sky-400 text-center mb-4 uppercase tracking-[0.2em]">
            KATEGORI: <span className="text-white">{currentWordCategory}</span>
        </h2>
        <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        <AnimatePresence>
            {!isRoundActive && currentWord && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
                    <p className="text-sm font-black text-emerald-400 px-6 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/30 uppercase tracking-[0.2em]">{currentWord}</p>
                 </motion.div>
            )}
        </AnimatePresence>
      </div>
    );
};

const GuessTheCityContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCity, scrambledWord, isRoundActive, revealedIndices, currentRoundTheme } = gameState;
    if (!currentCity) return null;
    return (
      <div className="flex flex-col items-center w-full">
        <h2 className="text-sm font-black text-sky-400 text-center mb-2 uppercase tracking-[0.2em]">
            TEBAK KOTA
        </h2>
        <p className="text-[11px] text-slate-200 mb-6 font-extrabold italic text-center px-4 py-1 bg-slate-800 rounded-full border border-white/5 uppercase tracking-wider">
            LOKASI: <span className="text-sky-400">{currentCity.region}</span>
        </p>
        <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
      </div>
    );
};

const TriviaContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentTriviaQuestion, isRoundActive, scrambledWord, revealedIndices, currentRoundTheme } = gameState;
    if (!currentTriviaQuestion) return null;
    return (
      <div className="text-center px-4 flex flex-col items-center justify-center gap-6 w-full">
        <div className="bg-slate-800/80 p-5 rounded-2xl shadow-2xl border border-white/5 w-full">
            <h2 className="text-sm sm:text-base font-bold text-slate-100 leading-relaxed tracking-wide">
                {currentTriviaQuestion.question}
            </h2>
        </div>
        <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        <AnimatePresence>
        {!isRoundActive && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">JAWABAN:</p>
                <p className="text-lg font-black text-emerald-400 uppercase tracking-[0.2em]">{currentTriviaQuestion.answer}</p>
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
      <div className="text-center px-4 flex flex-col items-center justify-center gap-4 w-full">
        <div className="bg-red-600 px-5 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg animate-pulse">
            ⚠️ AWAS JEBAKAN! ⚠️
        </div>
        <div className="bg-slate-800/80 p-4 rounded-2xl border-l-4 border-red-500 w-full shadow-xl">
            <h2 className="text-sm sm:text-base font-bold text-slate-100 leading-relaxed">
                {currentTriviaQuestion.question}
            </h2>
        </div>
        <FlipWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} revealedIndices={revealedIndices} theme={currentRoundTheme} />
        <AnimatePresence>
        {!isRoundActive && (
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-2 p-5 bg-amber-500/10 rounded-[2rem] border-2 border-amber-500/20 w-full shadow-2xl backdrop-blur-sm">
                <p className="text-[10px] text-amber-500 mb-1 font-black uppercase tracking-widest">JAWABAN NYELENEH:</p>
                <p className="text-2xl font-black text-amber-400 mb-2 uppercase italic tracking-tighter">{currentTriviaQuestion.answer}</p>
                {currentTriviaQuestion.explanation && (
                    <div className="pt-3 border-t border-dashed border-white/10">
                        <p className="text-[9px] font-black text-sky-400 mb-1 uppercase tracking-widest">LOGIKA ADMIN:</p>
                        <p className="text-[11px] italic text-slate-200 font-medium">"{currentTriviaQuestion.explanation}"</p>
                    </div>
                )}
             </motion.div>
        )}
        </AnimatePresence>
      </div>
    );
};

const Top3List: React.FC<{ title: string; icon: React.ReactNode; data: LeaderboardEntry[]; emptyText: string; theme: 'like' | 'gift' }> = ({ title, icon, data, emptyText, theme }) => {
    const top3 = data.slice(0, 3);
    const themeClasses = {
        like: { bg: 'bg-pink-500/5', border: 'border-pink-500/20', title: 'text-pink-400', score: 'text-pink-400' },
        gift: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', title: 'text-amber-400', score: 'text-amber-400' }
    };
    const currentTheme = themeClasses[theme];
    return (
        <div className={`rounded-2xl p-2 ${currentTheme.bg} border backdrop-blur-md shadow-inner ${currentTheme.border}`}>
            <div className="flex items-center gap-1.5 mb-2 px-1">
                {icon}
                <h3 className={`text-[10px] font-black uppercase tracking-[0.15em] ${currentTheme.title}`}>{title}</h3>
            </div>
            {top3.length > 0 ? (
                <div className="space-y-1">
                    {top3.map((entry, index) => (
                        <motion.div key={entry.userId} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center gap-2 text-[10px]">
                            <img src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'} alt={entry.nickname} className="w-5 h-5 rounded-full border border-white/10 ring-1 ring-white/5" />
                            <span className="font-bold truncate flex-1 text-slate-100">{entry.nickname}</span>
                            <span className={`font-black ${currentTheme.score}`}>{entry.score.toLocaleString()}</span>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-[9px] text-slate-500 py-2 font-bold italic tracking-wider">{emptyText}</p>
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
    if (gameStyle === GameStyle.Knockout) return "KNOCKOUT MATCH";
    if (gameMode === GameMode.GuessTheFlag) return 'TEBAK BENDERA';
    if (gameMode === GameMode.GuessTheEmoji) return 'TEBAK EMOJI';
    if (gameMode === GameMode.ABC5Dasar) return `ABC 5 DASAR`;
    if (gameMode === GameMode.Trivia) return 'TRIVIA UMUM';
    if (gameMode === GameMode.FootballTrivia) return 'TRIVIA BOLA';
    if (gameMode === GameMode.BikinEmosi) return 'BIKIN EMOSI';
    if (gameMode === GameMode.GuessTheCity) return 'TEBAK KOTA';
    if (gameMode === GameMode.ZonaBola) return 'ZONA BOLA';
    return 'GAME TRIVIA';
  }

  const currentMatch = gameStyle === GameStyle.Knockout && knockoutBracket && currentBracketRoundIndex !== null && currentMatchIndex !== null ? knockoutBracket[currentBracketRoundIndex][currentMatchIndex] : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 flex flex-col h-full relative overflow-hidden bg-slate-950/20">
      <div className="grid grid-cols-3 items-center text-[10px] text-slate-400 shrink-0 mb-2 px-1">
        <span className="text-left font-black tracking-widest">{gameStyle === GameStyle.Classic ? `RONDE ${round}/${totalRounds}` : `🎯 TARGET ${KNOCKOUT_TARGET_SCORE}`}</span>
        <span className='font-black text-center uppercase tracking-[0.25em] text-sky-400 truncate'>{getRoundTitle()}</span>
        <div className="flex items-center gap-1.5 justify-self-end">
            <ServerIcon className="w-3 h-3 text-emerald-400" />
            <span className="font-mono font-bold text-slate-300">{formatServerTime(serverTime)}</span>
        </div>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3 shrink-0 overflow-hidden shadow-inner">
        <motion.div className="bg-gradient-to-r from-sky-400 to-emerald-400 h-full shadow-[0_0_10px_rgba(56,189,248,0.5)]" initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
        <Top3List title="TOP LIKER" icon={<HeartIcon className="w-3 h-3 text-pink-500" />} data={likerLeaderboard} emptyText="Mulai tap tap..." theme="like" />
        <Top3List title="TOP GIFTER" icon={<GiftIcon className="w-3 h-3 text-amber-500" />} data={gifterLeaderboard} emptyText="Tunggu mawar..." theme="gift" />
      </div>

      <DanmakuBar messages={chatMessages} />
      
      <AnimatePresence>
        {currentQuote && <QuoteDisplay key={currentQuote.id} {...currentQuote} />}
      </AnimatePresence>

      <div className="flex-grow flex flex-col items-center justify-center relative min-h-0">
        {currentMatch && currentMatch.player1 && currentMatch.player2 && (
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex justify-between items-center mb-6 px-4 py-3 bg-slate-900/60 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-md">
                <div className="flex flex-col items-center flex-1 min-w-0">
                    <img src={currentMatch.player1.profilePictureUrl} className="w-12 h-12 rounded-full border-2 border-sky-400 shadow-lg ring-2 ring-sky-400/20"/>
                    <p className="font-black text-[11px] mt-2 truncate w-full text-center text-slate-100 uppercase tracking-wider">{currentMatch.player1.nickname}</p>
                </div>
                <div className="text-center px-4">
                    <p className="text-xl font-black text-red-500 italic drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">{knockoutMatchPoints.player1} - {knockoutMatchPoints.player2}</p>
                </div>
                <div className="flex flex-col items-center flex-1 min-w-0">
                    <img src={currentMatch.player2.profilePictureUrl} className="w-12 h-12 rounded-full border-2 border-slate-400 shadow-lg ring-2 ring-slate-400/20"/>
                    <p className="font-black text-[11px] mt-2 truncate w-full text-center text-slate-100 uppercase tracking-wider">{currentMatch.player2.nickname}</p>
                </div>
             </motion.div>
        )}
        
        <div className="w-full flex flex-col items-center justify-center min-h-[220px]">
            {gameState.gameMode === GameMode.GuessTheFlag && <GuessTheFlagContent gameState={gameState} />}
            {gameState.gameMode === GameMode.GuessTheEmoji && <GuessTheEmojiContent gameState={gameState} />}
            {gameState.gameMode === GameMode.ABC5Dasar && <ABC5DasarContent gameState={gameState} />}
            {(gameState.gameMode === GameMode.Trivia || gameState.gameMode === GameMode.KpopTrivia || gameState.gameMode === GameMode.FootballTrivia) && <TriviaContent gameState={gameState} />}
            {gameState.gameMode === GameMode.BikinEmosi && <BikinEmosiContent gameState={gameState} />}
            {gameState.gameMode === GameMode.GuessTheCity && <GuessTheCityContent gameState={gameState} />}
            {gameState.gameMode === GameMode.ZonaBola && <GuessTheWordContent gameState={gameState} />}
            {(gameState.gameMode === GameMode.GuessTheWord || gameState.gameMode === GameMode.GuessTheFruit || gameState.gameMode === GameMode.GuessTheAnimal || gameState.gameMode === GameMode.ZonaFilm) && <GuessTheWordContent gameState={gameState} />}
        </div>

        <div className="mt-8 w-full text-center min-h-[50px] shrink-0">
          <AnimatePresence mode="wait">
            {roundWinners.length > 0 && gameStyle === GameStyle.Classic ? (
              <motion.div key="winner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                 <div className="px-6 py-1.5 bg-emerald-500 text-white rounded-full text-[11px] font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-bounce uppercase tracking-[0.2em]">JAWABAN BENAR!</div>
                 <p className="text-slate-400 text-[10px] mt-2 font-bold tracking-widest">SLOT TERISI: <span className="text-sky-400 font-black">{roundWinners.length}/{maxWinnersForThisRound}</span></p>
              </motion.div>
            ) : (
              <motion.div key="no-winner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Menunggu Jawaban Di Chat...</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-full max-w-[120px] bg-slate-800 rounded-full h-1.5 mx-auto mt-4 overflow-hidden border border-white/5">
            <motion.div 
                className="bg-sky-400 h-full shadow-[0_0_10px_rgba(56,189,248,0.5)]" 
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
