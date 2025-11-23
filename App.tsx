import React, { useState, useCallback, useEffect, useRef } from 'react';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import ChampionScreen from './components/ChampionScreen';
import LiveFeedPanel from './components/LiveFeedPanel';
import PauseScreen from './components/PauseScreen';
import ThemeToggle from './components/ThemeToggle';
import SoundToggle from './components/SoundToggle';
import KnockoutRegistrationScreen from './components/KnockoutRegistrationScreen';
import KnockoutBracketScreen from './components/KnockoutBracketScreen';
import KnockoutPrepareMatchScreen from './components/KnockoutPrepareMatchScreen';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import SimulationPanel from './components/SimulationPanel';
import { useTheme } from './hooks/useTheme';
import { useGameLogic } from './hooks/useGameLogic';
import { useTikTokLive } from './hooks/useTikTokLive';
import { useKnockoutChampions } from './hooks/useKnockoutChampions';
import { GameState, GameStyle, GiftNotification as GiftNotificationType, ChatMessage, LiveFeedEvent, KnockoutCategory } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { CHAMPION_SCREEN_TIMEOUT_MS, DEFAULT_MAX_WINNERS_PER_ROUND } from './constants';
import { SkipForwardIcon } from './components/IconComponents';

const MODERATOR_USERNAMES = ['ahmadsyams.jpg', 'achmadsyams'];

const App: React.FC = () => {
  useTheme(); // Initialize theme logic
  const [gameState, setGameState] = useState<GameState>(GameState.Setup);
  const [username, setUsername] = useState<string>('');
  const [isSimulation, setIsSimulation] = useState<boolean>(false);
  const [maxWinners, setMaxWinners] = useState<number>(DEFAULT_MAX_WINNERS_PER_ROUND);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isDisconnected, setIsDisconnected] = useState(false);
  
  const [currentGift, setCurrentGift] = useState<GiftNotificationType | null>(null);
  const giftQueue = useRef<Omit<GiftNotificationType, 'id'>[]>([]);
  const [liveFeed, setLiveFeed] = useState<LiveFeedEvent[]>([]);

  const game = useGameLogic();
  const { champions, addChampion } = useKnockoutChampions();
  
  const handleGift = useCallback((gift: Omit<GiftNotificationType, 'id'>) => {
      const fullGift = { ...gift, id: `${new Date().getTime()}-${gift.nickname}` };
      giftQueue.current.push(gift);
      setLiveFeed(prev => [fullGift, ...prev].slice(0, 100));

      if (!currentGift) {
        const nextGift = giftQueue.current.shift();
        if (nextGift) {
            setCurrentGift({ ...nextGift, id: `${new Date().getTime()}-${nextGift.nickname}` });
        }
      }
  }, [currentGift]);

  useEffect(() => {
    if (currentGift) {
        const timer = setTimeout(() => {
            setCurrentGift(null);
        }, 5000); // gift shows for 5s
        return () => clearTimeout(timer);
    } else if (giftQueue.current.length > 0) {
        const nextGift = giftQueue.current.shift();
        if (nextGift) {
            const timer = setTimeout(() => {
              setCurrentGift({ ...nextGift, id: `${new Date().getTime()}-${nextGift.nickname}` });
            }, 300); // small delay between notifications
            return () => clearTimeout(timer);
        }
    }
  }, [currentGift]);

  const handleComment = useCallback((message: ChatMessage) => {
    setLiveFeed(prev => [message, ...prev].slice(0,100));
    const commentText = message.comment.trim().toLowerCase();
    const isModerator = MODERATOR_USERNAMES.includes(message.nickname.toLowerCase());

    if (isModerator) {
      if ((gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) && commentText === '!skip') {
        game.skipRound();
        return;
      }
      if ((gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) && commentText === '!pause') {
        game.pauseGame();
        return;
      }
      if (gameState === GameState.Paused && commentText === '!resume') {
        game.resumeGame();
        return;
      }
    }

    if (gameState === GameState.KnockoutRegistration && commentText === '!ikut') {
      game.registerPlayer({ nickname: message.nickname, profilePictureUrl: message.profilePictureUrl });
    } else if (gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) {
      game.processComment(message);
    } else if (gameState === GameState.Finished) {
      if (commentText === '!next') {
        setGameState(GameState.ModeSelection);
      }
    }
  }, [gameState, game]);


  const { connectionStatus, connect, disconnect, error } = useTikTokLive(handleComment, handleGift);

  const handleConnect = useCallback((tiktokUsername: string, isSimulating: boolean) => {
    setLiveFeed([]);
    setConnectionError(null);
    setIsDisconnected(false);
    setUsername(tiktokUsername);
    setIsSimulation(isSimulating);
    
    if (isSimulating) {
        setGameState(GameState.ModeSelection);
    } else {
        setGameState(GameState.Connecting);
        connect(tiktokUsername);
    }
  }, [connect]);

  const handleStartClassic = useCallback((winnersCount: number) => {
    setMaxWinners(winnersCount);
    game.startGame(GameStyle.Classic, winnersCount);
  }, [game]);

  const handleStartKnockout = useCallback((category: KnockoutCategory) => {
    game.startGame(GameStyle.Knockout, maxWinners, category);
  }, [game, maxWinners]);
  
  const handleBackToModeSelection = useCallback(() => {
    setGameState(GameState.ModeSelection);
  }, []);

  const handleReconnect = useCallback(() => {
    setConnectionError(null);
    setIsDisconnected(false);
    connect(username);
  }, [connect, username]);

  useEffect(() => {
    if (isSimulation) return; // Don't run connection effects in simulation mode

    if (connectionStatus === 'connected') {
      if (gameState === GameState.Connecting) {
        setGameState(GameState.ModeSelection);
      }
      setIsDisconnected(false);
    }
    
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      const errorMessage = error || "Koneksi terputus. Silakan coba lagi.";
      setConnectionError(errorMessage);
      
      if (gameState !== GameState.Setup && gameState !== GameState.Connecting) {
        setIsDisconnected(true);
      } else if (gameState === GameState.Connecting) {
        setGameState(GameState.Setup);
        disconnect();
      }
    }
  }, [connectionStatus, gameState, error, disconnect, isSimulation]);

  // Game logic state transitions
  useEffect(() => {
    if (game.state.gameState !== GameState.Setup && game.state.gameState !== gameState) {
        setGameState(game.state.gameState);
    }
  }, [game.state.gameState, gameState]);

  // Champion effect
  useEffect(() => {
    if (gameState === GameState.Champion) {
        if (game.state.gameStyle === GameStyle.Knockout) {
            const knockoutChampion = game.state.sessionLeaderboard?.[0];
            if (knockoutChampion) {
                addChampion(knockoutChampion.nickname);
            }
        }
    }
  }, [gameState, game.state.gameStyle, game.state.sessionLeaderboard, addChampion]);

  // Transition: Champion -> Finished (for Classic) or back to bracket (for Knockout)
  useEffect(() => {
    let timeoutId: number;
    if (gameState === GameState.Champion) {
      timeoutId = window.setTimeout(() => {
        if (game.state.gameStyle === GameStyle.Classic) {
          game.finishGame();
        } else {
          game.returnToBracket();
        }
      }, CHAMPION_SCREEN_TIMEOUT_MS);
    }
    return () => window.clearTimeout(timeoutId);
  }, [gameState, game.state.gameStyle, game]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName.toLowerCase() === 'input') {
        return;
      }
      if (event.key.toLowerCase() === 's' && (gameState === GameState.Playing || gameState === GameState.KnockoutPlaying)) {
        game.skipRound();
      }
      if (event.key.toLowerCase() === 'p') {
        if (gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) {
          game.pauseGame();
        } else if (gameState === GameState.Paused) {
          game.resumeGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, game]);


  const champion = game.state.sessionLeaderboard?.length > 0 ? game.state.sessionLeaderboard[0] : undefined;

  const renderContent = () => {
    switch (gameState) {
        case GameState.Setup:
        case GameState.Connecting:
            return (
                <motion.div
                    key="setup-connecting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                >
                    {gameState === GameState.Setup && <SetupScreen onStart={handleConnect} error={connectionError} />}
                    {gameState === GameState.Connecting && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-sky-400"></div>
                            <p className="mt-4 text-sky-500 dark:text-sky-300">Menghubungkan ke live @{username}...</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pastikan username benar dan streamer sedang live.</p>
                        </div>
                    )}
                </motion.div>
            );
        case GameState.ModeSelection:
            return <ModeSelectionScreen 
                      onStartClassic={handleStartClassic}
                      onStartKnockout={handleStartKnockout}
                   />;
        case GameState.Playing:
        case GameState.KnockoutPlaying:
             return (
              <motion.div
                key="playing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="h-full"
              >
                <GameScreen 
                  gameState={game.state} 
                  isDisconnected={isDisconnected}
                  onReconnect={handleReconnect}
                  connectionError={connectionError}
                  currentGift={currentGift}
                />
              </motion.div>
            );
        case GameState.KnockoutRegistration:
            return <KnockoutRegistrationScreen 
                      players={game.state.knockoutPlayers} 
                      onEndRegistration={game.endRegistrationAndDrawBracket} 
                      champions={champions} 
                      onResetRegistration={game.resetKnockoutRegistration}
                    />;
        case GameState.KnockoutDrawing:
        case GameState.KnockoutReadyToPlay:
        case GameState.KnockoutShowWinner:
            return <KnockoutBracketScreen 
                        bracket={game.state.knockoutBracket} 
                        currentMatchId={game.getCurrentKnockoutMatch()?.id ?? null}
                        isReadyToPlay={gameState === GameState.KnockoutReadyToPlay || gameState === GameState.KnockoutDrawing}
                        onStartMatch={game.prepareNextMatch}
                        onRedrawBracket={game.redrawBracket}
                        onRestartCompetition={game.restartKnockoutCompetition}
                        onDeclareWalkoverWinner={game.declareWalkoverWinner}
                        champions={champions}
                    />;
        case GameState.KnockoutPrepareMatch:
            return <KnockoutPrepareMatchScreen 
                        match={game.getCurrentKnockoutMatch()}
                        timeRemaining={game.state.countdownValue}
                        champions={champions}
                    />
        case GameState.Paused:
            return (
              <motion.div
                key="paused"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="h-full"
              >
                <PauseScreen />
              </motion.div>
            );
        case GameState.Champion:
            return (
              <motion.div
                key="champion"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="h-full"
              >
                <ChampionScreen champion={champion} isKnockout={game.state.gameStyle === GameStyle.Knockout} champions={champions} />
              </motion.div>
            );
        case GameState.Finished:
             return (
              <motion.div
                key="finished"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="h-full"
              >
                <GameOverScreen leaderboard={game.state.sessionLeaderboard} onRestart={handleBackToModeSelection} />
              </motion.div>
            );
        default:
            return null;
    }
  }

  const showSkipButton = gameState === GameState.Playing || gameState === GameState.KnockoutPlaying;
  const showLiveFeed = !isSimulation && (gameState !== GameState.Setup && gameState !== GameState.Connecting);

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-2 sm:p-4 relative">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <AnimatePresence>
              {showSkipButton && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={game.skipRound}
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-sky-500"
                  aria-label="Lewati Soal"
                  title="Lewati Soal (S)"
                >
                  <SkipForwardIcon className="w-5 h-5 text-sky-500" />
                </motion.button>
              )}
            </AnimatePresence>
            <SoundToggle />
            <ThemeToggle />
        </div>
      <div className="w-full max-w-5xl mx-auto flex flex-row items-start justify-center gap-4">
        {/* Left Column: Game Screen */}
        <div className="w-full max-w-sm h-[95vh] min-h-[600px] max-h-[800px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-sky-500/10 border border-sky-200 dark:border-gray-700 overflow-hidden flex flex-col relative transition-colors duration-300">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
        
        {/* Right Column: Feed or Simulation Panel */}
        <AnimatePresence>
        {showLiveFeed && <LiveFeedPanel feed={liveFeed} />}
        {isSimulation && gameState !== GameState.Setup && (
            <SimulationPanel onComment={handleComment} currentAnswer={game.currentAnswer} />
        )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;