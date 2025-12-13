
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
  
  // Gifter & Liker Leaderboard State
  const [gifterLeaderboard, setGifterLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [likerLeaderboard, setLikerLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Server Time Sync
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const serverTimeOffset = useRef<number>(0);
  const [isTimeSynced, setIsTimeSynced] = useState(false);

  // Deduplication Cache (Map for better performance and history)
  const processedGiftsCache = useRef<Map<string, number>>(new Map());
  const processedMsgIds = useRef<Map<string, number>>(new Map());

  const game = useGameLogic();
  const { champions, addChampion } = useKnockoutChampions();
  
  const handleGift = useCallback((gift: Omit<GiftNotificationType, 'id'>) => {
    // --- DATA NORMALIZATION ---
    const safeGiftCount = typeof gift.giftCount === 'number' ? gift.giftCount : parseInt(String(gift.giftCount || 1), 10) || 1;
    const safeGiftName = gift.giftName || 'Gift';
    const safeGiftId = gift.giftId || 0;
    const safeUserId = gift.userId || 'unknown';
    
    const normalizedGift = {
        ...gift,
        userId: safeUserId,
        giftCount: safeGiftCount,
        giftName: safeGiftName,
        giftId: safeGiftId
    };

    // --- MORE ROBUST DEDUPLICATION LOGIC ---
    const currentTimestamp = Date.now();
    const cleanupThreshold = 10000; // Keep history for 10 seconds.
    const duplicateThreshold = 1500; // 1.5 seconds for signature-based duplicates.

    // 1. Cleanup old entries from both caches
    for (const [key, timestamp] of processedMsgIds.current.entries()) {
        if (currentTimestamp - timestamp > cleanupThreshold) processedMsgIds.current.delete(key);
    }
    for (const [key, timestamp] of processedGiftsCache.current.entries()) {
        if (currentTimestamp - timestamp > cleanupThreshold) processedGiftsCache.current.delete(key);
    }

    // 2. PRIMARY CHECK: A time-sensitive signature.
    // This catches rapid, near-identical events from different sources (e.g., two servers sending the same gift).
    // We exclude giftName as it could be localized differently ("Rose" vs "Mawar").
    const giftSignature = `${normalizedGift.userId}-${normalizedGift.giftId}-${normalizedGift.giftCount}`;
    const lastSeenSignatureTime = processedGiftsCache.current.get(giftSignature);

    if (lastSeenSignatureTime && (currentTimestamp - lastSeenSignatureTime < duplicateThreshold)) {
        console.log(`[SIG] Duplicate blocked within ${duplicateThreshold}ms: ${giftSignature}`);
        return;
    }

    // 3. SECONDARY CHECK: The unique message ID from the server.
    // This catches an exact event being re-broadcast, even if it's after the signature threshold.
    const msgId = gift.msgId;
    if (typeof msgId === 'string' && msgId.length > 0) {
        if (processedMsgIds.current.has(msgId)) {
            console.log(`[ID] Duplicate blocked: ${msgId}`);
            return;
        }
    }

    // 4. If all checks pass, it's a unique gift. Update caches and process it.
    processedGiftsCache.current.set(giftSignature, currentTimestamp);
    if (typeof msgId === 'string' && msgId.length > 0) {
        processedMsgIds.current.set(msgId, currentTimestamp);
    }
    // --- END DEDUPLICATION LOGIC ---

    const fullGift = { ...normalizedGift, id: `${new Date().getTime()}-${normalizedGift.userId}` };
    
    // Add to queue and live feed using normalized data
    giftQueue.current.push(normalizedGift);
    setLiveFeed(prev => [fullGift, ...prev].slice(0, 100));

    // Update Gifter Leaderboard
    setGifterLeaderboard(prev => {
        const newBoard = [...prev];
        const existingIndex = newBoard.findIndex(p => p.userId === normalizedGift.userId);
        
        if (existingIndex > -1) {
            newBoard[existingIndex].score += normalizedGift.giftCount;
            newBoard[existingIndex].nickname = normalizedGift.nickname;
            newBoard[existingIndex].profilePictureUrl = normalizedGift.profilePictureUrl;
        } else {
            newBoard.push({
                userId: normalizedGift.userId,
                nickname: normalizedGift.nickname,
                profilePictureUrl: normalizedGift.profilePictureUrl,
                score: normalizedGift.giftCount
            });
        }
        return newBoard.sort((a, b) => b.score - a.score);
    });

    // Trigger the queue processing
    setCurrentGift(prevCurrentGift => {
        if (prevCurrentGift) return prevCurrentGift;
        const nextGift = giftQueue.current.shift();
        if (nextGift) {
            return { ...nextGift, id: `${new Date().getTime()}-${nextGift.userId}` };
        }
        return null;
    });

    // Gift Logic
    const giftNameLower = normalizedGift.giftName.toLowerCase();
    const giftId = normalizedGift.giftId;
    
    const isFingerHeart = 
        giftId === 6093 || 
        (giftNameLower.includes('finger') && giftNameLower.includes('heart')) || 
        giftNameLower.replace(/\s/g, '').includes('fingerheart') ||
        giftNameLower.includes('saranghaeyo');

    if (gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) {
        if (isFingerHeart) {
            game.skipRound();
        } else if (game.state.isHardMode) {
            for (let i = 0; i < normalizedGift.giftCount; i++) {
                game.revealClue();
            }
        }
    }
  }, [gameState, game]);
  
  const handleLike = useCallback((like: Omit<LeaderboardEntry, 'score'> & { score: number }) => {
    // Likes are cumulative
    setLikerLeaderboard(prev => {
        const newBoard = [...prev];
        const existingIndex = newBoard.findIndex(p => p.userId === like.userId);

        if (existingIndex > -1) {
            newBoard[existingIndex].score += like.score;
            // Update profile info in case it changes
            newBoard[existingIndex].nickname = like.nickname;
            newBoard[existingIndex].profilePictureUrl = like.profilePictureUrl;
        } else {
            newBoard.push({
                userId: like.userId,
                nickname: like.nickname,
                profilePictureUrl: like.profilePictureUrl,
                score: like.score
            });
        }
        // Sort and return the new board
        return newBoard.sort((a, b) => b.score - a.score);
    });
  }, []);
  
  const handleDonation = useCallback((donation: DonationEvent) => {
    const gift: Omit<GiftNotificationType, 'id'> = {
      userId: donation.from_name,
      nickname: donation.from_name,
      profilePictureUrl: `https://i.pravatar.cc/40?u=${donation.from_name}`,
      giftName: `${donation.message || `Donasi via ${donation.platform}`} (Rp ${donation.amount.toLocaleString()})`,
      // Use the donation amount as the score for the gifter leaderboard.
      giftCount: donation.amount,
      giftId: 99999, // generic ID for donations
      msgId: donation.id, // Use donation ID as msgId for deduplication
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

    setCurrentRank(prevCurrentRank => {
        if (prevCurrentRank) {
            return prevCurrentRank;
        }
        const nextRank = rankQueue.current.shift();
        if (nextRank) {
            return { ...nextRank, id: `${new Date().getTime()}-${nextRank.userId}` };
        }
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
    const commentText = (message.comment || '').trim().toLowerCase();
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
        timestamp: Date.now(),
    };
    handleComment(adminMessage);
    setShowAdminKeyboard(false);
  };

  const handleSyncTime = useCallback((serverTimestamp: number) => {
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


  const { connectionStatus, connect, disconnect, error } = useTikTokLive(handleComment, handleGift, handleLike, handleSyncTime);

  const handleConnect = useCallback((config: ServerConfig, isSimulating: boolean) => {
    setLiveFeed([]);
    setConnectionError(null);
    setIsDisconnected(false);
    setServerConfig(config);
    setIsSimulation(isSimulating);
    setIsTimeSynced(false);
    setServerTime(null);
    setGifterLeaderboard([]);
    setLikerLeaderboard([]);
    
    processedGiftsCache.current.clear();
    processedMsgIds.current.clear();
    
    game.setHostUsername(config.username);

    if (isSimulating) {
        serverTimeOffset.current = 0;
        setIsTimeSynced(true);
        setServerTime(new Date());
        game.returnToModeSelection();
    } else {
        setGameState(GameState.Connecting);
        connect(config);
    }
  }, [connect, game]);

  useEffect(() => {
    if (isSimulation) return;

    let fallbackTimer: number;
    if (connectionStatus === 'connected' && !isTimeSynced) {
      fallbackTimer = window.setTimeout(() => {
        if (!isTimeSynced) {
          console.warn("Server time sync did not receive a message. Using client time as fallback.");
          handleSyncTime(Date.now());
        }
      }, 5000);
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
    setGameState(GameState.Setup);
  };

  useEffect(() => {
    if (isSimulation) return;

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

  useEffect(() => {
    if (game.state.gameState !== gameState) {
        setGameState(game.state.gameState);
    }
  }, [game.state.gameState]);

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

  useEffect(() => {
    if (!isAuthenticated) return;
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
                  likerLeaderboard={likerLeaderboard}
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
                    />;
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
        <div className="w-full md:w-96 lg:w-[420px] h-[95vh] min-h-[600px] max-h-[800px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-sky-500/10 border border-sky-200 dark:border-gray-700 overflow-hidden flex flex-col relative transition-colors duration-300">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
        
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
