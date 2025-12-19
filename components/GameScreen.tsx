
import React, { useState, useEffect, useRef } from 'react';
import GameTab from './GameTab';
import ChatTab from './ChatTab';
import LeaderboardTab from './LeaderboardTab';
import CountdownOverlay from './CountdownOverlay';
import { GamepadIcon, MessageCircleIcon, TrophyIcon, InfoIcon } from './IconComponents';
import { AnimatePresence, motion } from 'framer-motion';
import RoundWinnerModal from './RoundWinnerModal';
import ReconnectOverlay from './ReconnectOverlay';
import { useSound } from '../hooks/useSound';
import { GiftNotification as GiftNotificationType, RankNotification as RankNotificationType, GameMode, GameStyle, InfoNotification as InfoNotificationType, LeaderboardEntry, QuoteNotification } from '../types';
import { InternalGameState } from '../hooks/useGameLogic';
import GiftNotification from './GiftNotification';
import RankNotification from './RankNotification';
import InfoNotification from './InfoNotification';

type Tab = 'game' | 'chat' | 'leaderboard';

interface GameScreenProps {
  gameState: InternalGameState;
  isDisconnected: boolean;
  onReconnect: () => void;
  connectionError: string | null;
  currentGift: GiftNotificationType | null;
  currentRank: RankNotificationType | null;
  currentQuote: QuoteNotification | null;
  currentInfo: InfoNotificationType | null;
  onFinishWinnerDisplay: () => void;
  serverTime: Date | null;
  gifterLeaderboard: LeaderboardEntry[];
  likerLeaderboard: LeaderboardEntry[];
}

const GameScreen: React.FC<GameScreenProps> = ({ gameState, isDisconnected, onReconnect, connectionError, currentGift, currentRank, currentQuote, currentInfo, onFinishWinnerDisplay, serverTime, gifterLeaderboard, likerLeaderboard }) => {
  const [activeTab, setActiveTab] = useState<Tab>('game');
  const { playSound, playBgm, stopBgm } = useSound();
  const lastTimerRef = useRef(gameState.roundTimer);

  useEffect(() => {
    if (gameState.isRoundActive) {
      playBgm();
    } else {
      stopBgm();
    }
    return () => { stopBgm(); };
  }, [gameState.isRoundActive, playBgm, stopBgm]);

  useEffect(() => {
    if (gameState.isRoundActive) {
      playSound('roundStart');
    }
  }, [gameState.round, gameState.isRoundActive, playSound, gameState.currentMatchIndex]);

  useEffect(() => {
    if (gameState.gameStyle === GameStyle.Classic && gameState.roundWinners.length === 1) {
      playSound('correctAnswer');
    }
  }, [gameState.roundWinners.length, gameState.gameStyle, playSound]);

  useEffect(() => {
    if (gameState.isRoundActive && gameState.roundTimer <= 5 && gameState.roundTimer > 0 && gameState.roundTimer !== lastTimerRef.current) {
        playSound('timerTick');
    }
    lastTimerRef.current = gameState.roundTimer;
  }, [gameState.roundTimer, gameState.isRoundActive, playSound]);

  const handleTabChange = (tab: Tab) => {
      if (tab !== activeTab) {
          playSound('tabSwitch');
          setActiveTab(tab);
      }
  };

  const navItems = [
    { id: 'game', label: 'Game', icon: GamepadIcon },
    { id: 'chat', label: 'Chat', icon: MessageCircleIcon },
    { id: 'leaderboard', label: 'Peringkat', icon: TrophyIcon },
  ];
  
  const getHeaderTitle = () => {
    if (gameState.gameStyle === GameStyle.Knockout) return "Mode Knockout";
    return "Trivia Kata & Bendera Live";
  }

  return (
    <div className="flex flex-col h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl transition-colors duration-300 relative z-10 border border-white/20 dark:border-gray-700/50">
      {/* Dynamic Marquee Ticker - Anti-Static Content Solution */}
      <div className="w-full bg-sky-500/10 dark:bg-sky-400/5 border-b border-sky-200/20 py-1 overflow-hidden whitespace-nowrap shrink-0">
          <motion.div 
            animate={{ x: ["100%", "-100%"] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-8 text-[10px] font-bold text-sky-600 dark:text-sky-300 uppercase tracking-widest"
          >
             <span className="flex items-center gap-1"><InfoIcon className="w-3 h-3"/> Follow untuk join game berikutnya!</span>
             <span className="flex items-center gap-1"><InfoIcon className="w-3 h-3"/> Kirim <img src="https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp" className="w-4 h-4" /> untuk buka 1 huruf!</span>
             <span className="flex items-center gap-1"><InfoIcon className="w-3 h-3"/> Ketik !myrank untuk cek skormu</span>
             <span className="flex items-center gap-1"><InfoIcon className="w-3 h-3"/> Jawab cepat dapat bonus poin!</span>
          </motion.div>
      </div>

      <header className="p-3 text-center border-b border-sky-100 dark:border-gray-700 shrink-0">
        <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-teal-400">
          {getHeaderTitle()}
        </h1>
      </header>

      <main className="flex-grow overflow-hidden relative">
        <div className="absolute top-2 left-0 right-0 px-3 z-50 pointer-events-none space-y-2">
          <AnimatePresence>
            {currentGift && <GiftNotification key={currentGift.id} {...currentGift} />}
          </AnimatePresence>
          <AnimatePresence>
            {currentRank && <RankNotification key={currentRank.id} {...currentRank} />}
          </AnimatePresence>
          <AnimatePresence>
             {currentInfo && <InfoNotification key={currentInfo.id} id={currentInfo.id} content={currentInfo.content} />}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {gameState.countdownValue && gameState.countdownValue > 0 && (
            <CountdownOverlay count={gameState.countdownValue} />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
            {activeTab === 'game' && <GameTab key="game" gameState={gameState} serverTime={serverTime} gifterLeaderboard={gifterLeaderboard} likerLeaderboard={likerLeaderboard} currentQuote={currentQuote} />}
            {activeTab === 'chat' && <ChatTab key="chat" messages={gameState.chatMessages} />}
            {activeTab === 'leaderboard' && <LeaderboardTab key="leaderboard" leaderboard={gameState.leaderboard} gifterLeaderboard={gifterLeaderboard} />}
        </AnimatePresence>
        <AnimatePresence>
          {gameState.showWinnerModal && gameState.gameStyle === GameStyle.Classic && <RoundWinnerModal 
              winners={gameState.roundWinners} 
              round={gameState.round} 
              gameMode={gameState.gameMode!}
              allAnswersFound={gameState.allAnswersFoundInRound}
              onScrollComplete={onFinishWinnerDisplay}
            />}
        </AnimatePresence>
        <AnimatePresence>
          {isDisconnected && <ReconnectOverlay onReconnect={onReconnect} error={connectionError} />}
        </AnimatePresence>
      </main>

      <nav className="flex md:hidden justify-around p-1 border-t border-sky-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 rounded-b-3xl shrink-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabChange(item.id as Tab)}
            className={`flex flex-col items-center justify-center w-20 h-14 rounded-lg transition-colors duration-200 ${
              activeTab === item.id ? 'text-sky-500 bg-sky-500/10 dark:text-sky-400 dark:bg-sky-400/10' : 'text-gray-500 hover:bg-sky-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <item.icon className="w-5 h-5 mb-0.5" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default GameScreen;
