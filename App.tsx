
import React, { useState, useCallback, useEffect, useRef } from 'react';
import LoginScreen from './components/LoginScreen';
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
import GlobalLeaderboardModal from './components/GlobalLeaderboardModal';
import ConfirmModal from './components/ConfirmModal';
import { useTheme } from './hooks/useTheme';
import { useGameLogic } from './hooks/useGameLogic';
import { useTikTokLive } from './hooks/useTikTokLive';
import { useKnockoutChampions } from './hooks/useKnockoutChampions';
import { GameState, GameStyle, GiftNotification as GiftNotificationType, ChatMessage, LiveFeedEvent, KnockoutCategory, RankNotification as RankNotificationType, InfoNotification as InfoNotificationType, ServerConfig, DonationEvent, GameMode, LeaderboardEntry } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { DEFAULT_MAX_WINNERS_PER_ROUND, TOTAL_ROUNDS, ADMIN_PASSWORD_HASH } from './constants';
import { KeyboardIcon, ServerIcon, SkipForwardIcon, SwitchIcon, EyeIcon, LogOutIcon } from './components/IconComponents';
import AdminInputPanel from './components/AdminInputPanel';

const MODERATOR_USERNAMES = ['ahmadsyams.jpg', 'achmadsyams'];

const infoTips: (() => React.ReactNode)[] = [
  () => <>Ketik <b className="text-sky-300">!myrank</b> di chat untuk melihat peringkat & skormu!</>,
  () => (
    <div className="flex items-center justify-center gap-3 text-xs sm:text-sm">
      <div className="flex items-center gap-1">
         <span>Buka Clue:</span>
         <img 
            src="https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp" 
            alt="Mawar" 
            className="w-5 h-5" 
         />
      </div>
      <span className="text-white/30">|</span>
      <div className="flex items-center gap-1">
         <span>Skip Soal:</span>
         <img 
            src="https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/a4c4dc437fd3a6632aba149769491f49.png~tplv-obj.webp" 
            alt="Finger Heart" 
            className="w-5 h-5" 
         />
      </div>
    </div>
  ),
  () => (
    <div className="flex items-center justify-center gap-1.5">
        <ServerIcon className="w-4 h-4" />
        <span>Jawaban dinilai berdasarkan Waktu Server.</span>
    </div>
  ),
];


const App: React.FC = () => {
  useTheme(); // Initialize theme logic
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check localStorage for persisted auth on initial load
    const savedAuth = localStorage.getItem('tiktok-quiz-auth');
    return savedAuth === ADMIN_PASSWORD_HASH;
  });
  const [gameState, setGameState] = useState<GameState>(GameState.Setup);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [isSimulation, setIsSimulation] = useState<boolean>(false);
  const [maxWinners, setMaxWinners] = useState<number>(DEFAULT_MAX_WINNERS_PER_ROUND);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);
  const [showAdminKeyboard, setShowAdminKeyboard] = useState(false);
  const [isSwitchModeModalOpen, setIsSwitchModeModalOpen] = useState(false);
  const [isResetLeaderboardModalOpen, setIsResetLeaderboardModalOpen] = useState(false);
  
  // State to remember classic game settings for auto-restart
  const [lastClassicCategories, setLastClassicCategories] = useState<GameMode[]>([]);
  const [lastUseImportedOnly, setLastUseImportedOnly] = useState<boolean>(false);
  const [lastTotalRounds, setLastTotalRounds] = useState<number>(TOTAL_ROUNDS);
  const [lastIsHardMode, setLastIsHardMode] = useState<boolean>(false);
  
  const [currentGift, setCurrentGift] = useState<GiftNotificationType | null>(null);
  const giftQueue = useRef<Omit<GiftNotificationType, 'id'>[]>([]);
  const [currentRank, setCurrentRank] = useState<RankNotificationType | null>(null);
  const rankQueue = useRef<Omit<RankNotificationType, 'id'>[]>([]);
  const [currentInfo, setCurrentInfo] = useState<InfoNotificationType | null>(null);
  const infoTipIndex = useRef(0);

  const [liveFeed, setLiveFeed] = useState<LiveFeedEvent[]>([]);
  
  // Gifter Leaderboard State
  const [gifterLeaderboard, setGifterLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Server Time Sync
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const serverTimeOffset = useRef<number>(0);
  const [isTimeSynced, setIsTimeSynced] = useState(false);

  const game = useGameLogic();
  const { champions, addChampion } = useKnockoutChampions();
  
  const handleGift = useCallback((gift: Omit<GiftNotificationType, 'id'>) => {
    const fullGift = { ...gift, id: `${new Date().getTime()}-${gift.userId}` };
    
    // Add to queue and live feed
    giftQueue.current.push(gift);
    setLiveFeed(prev => [fullGift, ...prev].slice(0, 100));

    // Update Gifter Leaderboard (Track all gifts, even if game not playing)
    setGifterLeaderboard(prev => {
        const newBoard = [...prev];
        const existingIndex = newBoard.findIndex(p => p.userId === gift.userId);
        // Use a safe gift count
        const giftValue = parseInt(String(gift.giftCount || 1), 10) || 1;

        if (existingIndex > -1) {
            newBoard[existingIndex].score += giftValue;
            // Update profile details if changed
            newBoard[existingIndex].nickname = gift.nickname;
            newBoard[existingIndex].profilePictureUrl = gift.profilePictureUrl;
        } else {
            newBoard.push({
                userId: gift.userId,
                nickname: gift.nickname,
                profilePictureUrl: gift.profilePictureUrl,
                score: giftValue
            });
        }
        return newBoard.sort((a, b) => b.score - a.score);
    });

    // Trigger the queue processing using a functional update to prevent race conditions
    setCurrentGift(prevCurrentGift => {
        // If a gift is already showing, do nothing. The useEffect will handle it later.
        if (prevCurrentGift) {
            return prevCurrentGift;
        }
        // If no gift is showing, pull from the queue.
        const nextGift = giftQueue.current.shift();
        if (nextGift) {
            return { ...nextGift, id: `${new Date().getTime()}-${nextGift.userId}` };
        }
        // If queue is somehow empty, return null.
        return null;
    });

    // Gift Logic
    const giftNameLower = gift.giftName.toLowerCase();
    const giftId = gift.giftId;
    
    // Enhanced Finger Heart Detection
    // ID 6093 is standard for Finger Heart.
    // Also checking for 'finger', 'heart', 'saranghaeyo' (Indonesian context often uses this for finger heart symbol).
    const isFingerHeart = 
        giftId === 6093 || 
        (giftNameLower.includes('finger') && giftNameLower.includes('heart')) || 
        giftNameLower.replace(/\s/g, '').includes('fingerheart') ||
        giftNameLower.includes('saranghaeyo');

    if (gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) {
        if (isFingerHeart) {
            game.skipRound();
        } else if (game.state.isHardMode) {
            // Fix: Robust gift count parsing. Defaults to 1 if invalid/missing/zero.
            // This ensures "1 coin" (e.g. 1 Rose) always triggers at least 1 clue reveal.
            let count = parseInt(String(gift.giftCount || 1), 10);
            if (isNaN(count) || count < 1) count = 1;

            // Any other gift (Rose, Coin, etc) triggers clue reveal
            // Loop based on count, so 10 Roses = 10 Reveal calls
            for (let i = 0; i < count; i++) {
                game.revealClue();
            }
        }
    }
  }, [gameState, game]);
  
  const handleDonation = useCallback((donation: DonationEvent) => {
    // Convert donation to a gift notification for UI display
    // FIX: Replaced 'GiftNotification' with its imported alias 'GiftNotificationType' to resolve a type error.
    const gift: Omit<GiftNotificationType, 'id'> = {
      userId: donation.from_name,
      nickname: donation.from_name,
      profilePictureUrl: `https://i.pravatar.cc/40?u=${donation.from_name}`,
      giftName: `${donation.message || `Donasi via ${donation.platform}`} (Rp ${donation.amount.toLocaleString()})`,
      giftCount: 1,
      giftId: 99999, // generic ID for donations
    };
    handleGift(gift);
  }, [handleGift]);

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
              setCurrentGift({ ...nextGift, id: `${new Date().getTime()}-${nextGift.userId}` });
            }, 300); // small delay between notifications
            return () => clearTimeout(timer);
        }
    }
  }, [currentGift]);
  
  const handleRankCheck = useCallback((rankInfo: Omit<RankNotificationType, 'id'>) => {
    rankQueue.current.push(rankInfo);

    // Trigger the queue processing using a functional update to prevent race conditions
    setCurrentRank(prevCurrentRank => {
        // If a rank notification is already showing, do nothing.
        if (prevCurrentRank) {
            return prevCurrentRank;
        }
        // If no notification is showing, pull from the queue.
        const nextRank = rankQueue.current.shift();
        if (nextRank) {
            return { ...nextRank, id: `${new Date().getTime()}-${nextRank.userId}` };
        }
        // If queue is somehow empty, return null.
        return null;
    });
  }, []);

  useEffect(() => {
    if (currentRank) {
        const timer = setTimeout(() => {
            setCurrentRank(null);
        }, 5000); // rank notification shows for 5s
        return () => clearTimeout(timer);
    } else if (rankQueue.current.length > 0) {
        const nextRank = rankQueue.current.shift();
        if (nextRank) {
            const timer = setTimeout(() => {
              setCurrentRank({ ...nextRank, id: `${new Date().getTime()}-${nextRank.userId}` });
            }, 300); // small delay between notifications
            return () => clearTimeout(timer);
        }
    }
  }, [currentRank]);

  // Periodic Info Notification Logic
  useEffect(() => {
      const activeGameStates = [
          GameState.Playing, 
          GameState.KnockoutPlaying,
          GameState.ClassicAnswerReveal,
          GameState.KnockoutRegistration,
          GameState.KnockoutReadyToPlay,
      ];
      if (!activeGameStates.includes(gameState)) {
          setCurrentInfo(null); // Clear info when not in active game
          return;
      }

      const infoInterval = setInterval(() => {
          const tipContent = infoTips[infoTipIndex.current]();
          setCurrentInfo({
              id: `${new Date().getTime()}-info`,
              content: tipContent,
          });
          infoTipIndex.current = (infoTipIndex.current + 1) % infoTips.length;
      }, 25000); // Show an info tip every 25 seconds

      return () => clearInterval(infoInterval);
  }, [gameState]);

  useEffect(() => {
      if (currentInfo) {
          const timer = setTimeout(() => {
              setCurrentInfo(null);
          }, 7000); // Info shows for 7s
          return () => clearTimeout(timer);
      }
  }, [currentInfo]);

  const handleComment = useCallback((message: ChatMessage) => {
    setLiveFeed(prev => [message, ...prev].slice(0,100));
    const commentText = message.comment.trim().toLowerCase();
    const isModerator = MODERATOR_USERNAMES.includes(message.userId.toLowerCase().replace(/^@/, ''));
    
    if (commentText === '!myrank') {
      const playerRank = game.state.leaderboard.findIndex(p => p.userId === message.userId);
      if (playerRank !== -1) {
          const playerScore = game.state.leaderboard[playerRank].score;
          handleRankCheck({
              userId: message.userId,
              nickname: message.nickname,
              profilePictureUrl: message.profilePictureUrl || `https://i.pravatar.cc/40?u=${message.userId}`,
              rank: playerRank + 1,
              score: playerScore,
          });
      } else {
          handleRankCheck({
              userId: message.userId,
              nickname: message.nickname,
              profilePictureUrl: message.profilePictureUrl || `https://i.pravatar.cc/40?u=${message.userId}`,
              rank: -1, // -1 indicates not ranked
              score: 0,
          });
      }
      return;
    }

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
      game.registerPlayer({ userId: message.userId, nickname: message.nickname, profilePictureUrl: message.profilePictureUrl });
    } else if (gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) {
      game.processComment(message);
    }
  }, [gameState, game, handleRankCheck]);
  
  const handleAdminSubmit = (commentText: string) => {
    if (!serverConfig?.username && !isSimulation) return;
    const hostUsername = serverConfig?.username || 'admin';
    const adminMessage: ChatMessage = {
        id: `admin-${Date.now()}`,
        userId: hostUsername,
        nickname: `${hostUsername} (Host)`,
        comment: commentText,
        profilePictureUrl: `https://i.pravatar.cc/40?u=admin-${hostUsername}`,
        isWinner: false,
        timestamp: Date.now(), // Admin timestamp is client-side
    };
    handleComment(adminMessage);
    setShowAdminKeyboard(false);
  };

  const handleSyncTime = useCallback((serverTimestamp: number) => {
    // Only set the offset once per connection session
    if (!isTimeSynced) {
        serverTimeOffset.current = serverTimestamp - Date.now();
        setServerTime(new Date(serverTimestamp));
        setIsTimeSynced(true);
    }
  }, [isTimeSynced]);

  useEffect(() => {
    if (!isTimeSynced) return;

    const intervalId = setInterval(() => {
        setServerTime(new Date(Date.now() + serverTimeOffset.current));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isTimeSynced]);


  const { connectionStatus, connect, disconnect, error } = useTikTokLive(handleComment, handleGift, handleSyncTime);

  const handleConnect = useCallback((config: ServerConfig, isSimulating: boolean) => {
    setLiveFeed([]);
    setConnectionError(null);
    setIsDisconnected(false);
    setServerConfig(config);
    setIsSimulation(isSimulating);
    setIsTimeSynced(false); // Reset time sync flag
    setServerTime(null);
    setGifterLeaderboard([]); // Reset gifter leaderboard on new connection
    
    game.setHostUsername(config.username);

    if (isSimulating) {
        // For simulation, sync time immediately with client's local time
        serverTimeOffset.current = 0;
        setIsTimeSynced(true);
        setServerTime(new Date());
        game.returnToModeSelection();
    } else {
        setGameState(GameState.Connecting);
        connect(config);
    }
  }, [connect, game]);

  // Fallback timer for live connections to ensure the clock always starts.
  useEffect(() => {
    if (isSimulation) return;

    let fallbackTimer: number;
    if (connectionStatus === 'connected' && !isTimeSynced) {
      fallbackTimer = window.setTimeout(() => {
        if (!isTimeSynced) {
          console.warn("Server time sync did not receive a message. Using client time as fallback.");
          handleSyncTime(Date.now()); // Sync with current client time
        }
      }, 5000); // 5-second timeout
    }

    return () => clearTimeout(fallbackTimer);
  }, [connectionStatus, isTimeSynced, isSimulation, handleSyncTime]);

  const handleStartClassic = useCallback((winnersCount: number, categories: GameMode[], useImportedOnly: boolean, rounds: number, isHardMode: boolean) => {
    setMaxWinners(winnersCount);
    setLastClassicCategories(categories);
    setLastUseImportedOnly(useImportedOnly);
    setLastTotalRounds(rounds);
    setLastIsHardMode(isHardMode);
    game.startGame(GameStyle.Classic, winnersCount, { classicCategories: categories, useImportedOnly, totalRounds: rounds, isHardMode });
  }, [game]);

  const handleStartKnockout = useCallback((category: KnockoutCategory, useImportedOnly: boolean) => {
    game.startGame(GameStyle.Knockout, maxWinners, { knockoutCategory: category, useImportedOnly });
  }, [game, maxWinners]);
  
  const handleBackToModeSelection = useCallback(() => {
    game.returnToModeSelection();
  }, [game]);
  
  const handleAutoRestart = useCallback(() => {
    // Use stored settings for auto-restart, fallback to defaults if somehow empty
    const categoriesToUse = lastClassicCategories.length > 0 
        ? lastClassicCategories 
        : [GameMode.GuessTheFlag, GameMode.ABC5Dasar, GameMode.Trivia, GameMode.GuessTheCity];
        
    game.startGame(GameStyle.Classic, maxWinners, {
      classicCategories: categoriesToUse,
      useImportedOnly: lastUseImportedOnly,
      totalRounds: lastTotalRounds,
      isHardMode: lastIsHardMode,
    });
  }, [game, maxWinners, lastClassicCategories, lastUseImportedOnly, lastTotalRounds, lastIsHardMode]);

  const handleReconnect = useCallback(() => {
    if (!serverConfig) return;
    setConnectionError(null);
    setIsDisconnected(false);
    connect(serverConfig);
  }, [connect, serverConfig]);
  
  const handleSwitchMode = () => {
    setIsSwitchModeModalOpen(true);
  };

  const confirmSwitchMode = () => {
    game.returnToModeSelection();
    setIsSwitchModeModalOpen(false);
  };

  const handleOpenResetModal = () => setIsResetLeaderboardModalOpen(true);
  const confirmResetLeaderboard = () => {
      game.resetGlobalLeaderboard();
      setIsResetLeaderboardModalOpen(false);
  };

  const handleLoginSuccess = () => {
    localStorage.setItem('tiktok-quiz-auth', ADMIN_PASSWORD_HASH);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('tiktok-quiz-auth');
    setIsAuthenticated(false);
    setGameState(GameState.Setup); // Reset to setup on logout
  };

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
    if (game.state.gameState !== gameState) {
        setGameState(game.state.gameState);
    }
  }, [game.state.gameState]);

  // Champion effect
  useEffect(() => {
    if (gameState === GameState.Champion) {
        if (game.state.gameStyle === GameStyle.Knockout) {
            const knockoutChampion = game.state.sessionLeaderboard?.[0];
            if (knockoutChampion) {
                addChampion(knockoutChampion);
            }
        }
    }
  }, [gameState, game.state.gameStyle, game.state.sessionLeaderboard, addChampion]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isAuthenticated) return; // Disable shortcuts if not logged in
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
  }, [gameState, game, isAuthenticated]);


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
                    {gameState === GameState.Setup && <SetupScreen onConnect={handleConnect} error={connectionError} />}
                    {gameState === GameState.Connecting && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-sky-400"></div>
                            <p className="mt-4 text-sky-500 dark:text-sky-300">Menghubungkan ke @{serverConfig?.username}...</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pastikan username benar dan streamer sedang live.</p>
                        </div>
                    )}
                </motion.div>
            );
        case GameState.ModeSelection:
            return <ModeSelectionScreen 
                      onStartClassic={handleStartClassic}
                      onStartKnockout={handleStartKnockout}
                      onShowLeaderboard={() => setShowGlobalLeaderboard(true)}
                      onResetGlobalLeaderboard={handleOpenResetModal}
                   />;
        case GameState.Playing:
        case GameState.KnockoutPlaying:
        case GameState.ClassicAnswerReveal:
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
                  currentRank={currentRank}
                  currentInfo={currentInfo}
                  onFinishWinnerDisplay={game.finishWinnerDisplay}
                  serverTime={serverTime}
                  gifterLeaderboard={gifterLeaderboard}
                />
              </motion.div>
            );
        case GameState.KnockoutRegistration:
            return <KnockoutRegistrationScreen 
                      players={game.state.knockoutPlayers} 
                      onEndRegistration={game.endRegistrationAndDrawBracket} 
                      champions={champions} 
                      onResetRegistration={game.resetKnockoutRegistration}
                      isSimulation={isSimulation}
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
                        onReturnToModeSelection={game.returnToModeSelection}
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
                <GameOverScreen
                    leaderboard={game.state.sessionLeaderboard}
                    globalLeaderboard={game.state.leaderboard}
                    onBackToMenu={handleBackToModeSelection}
                    onAutoRestart={handleAutoRestart}
                />
              </motion.div>
            );
        default:
            return null;
    }
  }

  const showAdminButtons = isAuthenticated && (gameState === GameState.Playing || gameState === GameState.KnockoutPlaying);
  const showLiveFeed = isAuthenticated && !isSimulation && (gameState !== GameState.Setup && gameState !== GameState.Connecting);

  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-2 sm:p-4">
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-2 sm:p-4 relative">
      <AnimatePresence>
        {showGlobalLeaderboard && (
          <GlobalLeaderboardModal 
            leaderboard={game.state.leaderboard} 
            onClose={() => setShowGlobalLeaderboard(false)} 
          />
        )}
        {isSwitchModeModalOpen && (
          <ConfirmModal
              title="Pindah Mode Permainan?"
              message="Permainan saat ini akan dihentikan dan semua progres akan hilang. Apakah Anda yakin?"
              onConfirm={confirmSwitchMode}
              onClose={() => setIsSwitchModeModalOpen(false)}
          />
        )}
        {isResetLeaderboardModalOpen && (
          <ConfirmModal
              title="Reset Peringkat Global?"
              message="Semua data skor global akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
              onConfirm={confirmResetLeaderboard}
              onClose={() => setIsResetLeaderboardModalOpen(false)}
          />
        )}
      </AnimatePresence>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <AnimatePresence>
              {isAuthenticated && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={handleLogout}
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-red-500"
                  aria-label="Logout"
                  title="Keluar"
                >
                  <LogOutIcon className="w-5 h-5" />
                </motion.button>
              )}
              {showAdminButtons && (
                <>
                {game.state.isHardMode && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        onClick={game.revealClue}
                        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-sky-500"
                        aria-label="Buka 1 Clue"
                        title="Buka 1 Clue (Admin)"
                    >
                        <EyeIcon className="w-5 h-5 text-purple-500" />
                    </motion.button>
                )}
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={() => setShowAdminKeyboard(prev => !prev)}
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-sky-500"
                  aria-label="Buka Keyboard Admin"
                  title="Buka Keyboard Admin"
                >
                  <KeyboardIcon className="w-5 h-5" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={handleSwitchMode}
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-sky-500"
                  aria-label="Pindah Mode"
                  title="Pindah Mode Permainan"
                >
                  <SwitchIcon className="w-5 h-5" />
                </motion.button>
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
                </>
              )}
            </AnimatePresence>
            <SoundToggle />
            <ThemeToggle />
        </div>
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-center gap-4">
        {/* Left Column: Game Screen */}
        <div className="w-full md:w-96 lg:w-[420px] h-[95vh] min-h-[600px] max-h-[800px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-sky-500/10 border border-sky-200 dark:border-gray-700 overflow-hidden flex flex-col relative transition-colors duration-300">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
        
        {/* Right Column: Feed or Simulation Panel */}
        <div className="hidden md:flex flex-1">
            <AnimatePresence>
            {showLiveFeed && <LiveFeedPanel feed={liveFeed} />}
            {isSimulation && gameState !== GameState.Setup && (
                <SimulationPanel 
                    onComment={handleComment} 
                    onGift={handleGift}
                    onDonation={handleDonation}
                    currentAnswer={game.currentAnswer} 
                    gameState={gameState}
                    onRegisterPlayer={game.registerPlayer}
                    knockoutPlayers={game.state.knockoutPlayers}
                />
            )}
            </AnimatePresence>
        </div>
      </div>

       <AnimatePresence>
        {showAdminKeyboard && (
          <AdminInputPanel
            onSubmit={handleAdminSubmit}
            onClose={() => setShowAdminKeyboard(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
