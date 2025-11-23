import React, { useReducer, useCallback, useEffect, useRef } from 'react';
import { Country, ChatMessage, LeaderboardEntry, RoundWinner, GameMode, AbcCategory, WordCategory, GameState, GameStyle, KnockoutPlayer, KnockoutBracket, KnockoutMatch, GameActionPayloads, KnockoutCategory, TriviaQuestion, GameAction } from '../types';
import { countries } from '../data/countries';
import { fruits } from '../data/fruits';
import { animals } from '../data/animals';
import { objects } from '../data/objects';
import { professions } from '../data/professions';
import { indonesianCities } from '../data/indonesian_cities';
import { plants } from '../data/plants';
import { footballPlayers } from '../data/football_players';
import { footballClubs } from '../data/football_clubs';
import { triviaQuestions } from '../data/trivia';
import { TOTAL_ROUNDS, ROUND_TIMER_SECONDS, BASE_POINTS, SPEED_BONUS_MULTIPLIER, WINNER_MODAL_TIMEOUT_MS, FLAG_ROUNDS_COUNT, UNIQUENESS_BONUS_POINTS, KNOCKOUT_TARGET_SCORE, KNOCKOUT_PREPARE_SECONDS, KNOCKOUT_WINNER_VIEW_SECONDS, KNOCKOUT_ROUND_TIMER_SECONDS } from '../constants';

interface LetterObject {
  id: string;
  letter: string;
}

export interface InternalGameState {
  gameState: GameState;
  gameStyle: GameStyle;
  round: number;
  gameMode: GameMode | null;
  currentCountry: Country | null;
  currentLetter: string | null;
  currentCategory: AbcCategory | null;
  currentWord: string | null;
  currentWordCategory: WordCategory | null;
  currentTriviaQuestion: TriviaQuestion | null;
  usedAnswers: string[];
  scrambledCountryName: LetterObject[][];
  leaderboard: LeaderboardEntry[];
  sessionLeaderboard: LeaderboardEntry[];
  roundWinners: RoundWinner[];
  isRoundActive: boolean;
  roundTimer: number;
  showWinnerModal: boolean;
  availableAnswersCount: number | null;
  allAnswersFoundInRound: boolean;
  maxWinners: number;
  isPausedByAdmin: boolean;
  countdownValue: number | null;
  chatMessages: ChatMessage[]; // Added for ChatTab

  // Knockout state
  knockoutCategory: KnockoutCategory | null;
  knockoutPlayers: KnockoutPlayer[];
  knockoutBracket: KnockoutBracket | null;
  currentBracketRoundIndex: number | null;
  currentMatchIndex: number | null;
  knockoutMatchPoints: { player1: number; player2: number };
}


const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const scrambleWord = (name: string): LetterObject[][] => {
  const words = name.toUpperCase().split(' ');
  return words.map(word => {
    const mappedLetters = shuffleArray(word.split('').filter(char => char.trim() !== '' && !['(', ')', '&', '-'].includes(char)).map((char, index) => ({
      id: `${word}-${index}-${char}`,
      letter: char,
    })));
    return mappedLetters;
  });
};

const createInitialState = (): InternalGameState => ({
  gameState: GameState.Setup,
  gameStyle: GameStyle.Classic,
  round: 0,
  gameMode: null,
  currentCountry: null,
  currentLetter: null,
  currentCategory: null,
  currentWord: null,
  currentWordCategory: null,
  currentTriviaQuestion: null,
  usedAnswers: [],
  scrambledCountryName: [],
  leaderboard: JSON.parse(localStorage.getItem('leaderboard') || '[]'),
  sessionLeaderboard: [],
  roundWinners: [],
  isRoundActive: false,
  roundTimer: ROUND_TIMER_SECONDS,
  showWinnerModal: false,
  availableAnswersCount: null,
  allAnswersFoundInRound: false,
  maxWinners: 5,
  isPausedByAdmin: false,
  countdownValue: null,
  chatMessages: [],
  knockoutCategory: null,
  knockoutPlayers: [],
  knockoutBracket: null,
  currentBracketRoundIndex: null,
  currentMatchIndex: null,
  knockoutMatchPoints: { player1: 0, player2: 0 },
});

// --- KNOCKOUT HELPER ---
const generateBracket = (players: KnockoutPlayer[]): KnockoutBracket => {
    const shuffledPlayers = shuffleArray(players);
    const numPlayers = shuffledPlayers.length;
    if (numPlayers < 2) return [];

    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
    const numByes = nextPowerOfTwo - numPlayers;
    const numFirstRoundMatches = (numPlayers - numByes) / 2;

    const bracket: KnockoutBracket = [];
    const firstRound: KnockoutMatch[] = [];
    
    let playerIndex = 0;

    for (let i = 0; i < numFirstRoundMatches; i++) {
        firstRound.push({
            id: `r0-m${i}`,
            player1: shuffledPlayers[playerIndex++],
            player2: shuffledPlayers[playerIndex++],
            winner: null,
            roundIndex: 0,
            matchIndex: i,
        });
    }

    for (let i = 0; i < numByes; i++) {
        const playerWithBye = shuffledPlayers[playerIndex++];
        firstRound.push({
            id: `r0-m${numFirstRoundMatches + i}`,
            player1: playerWithBye,
            player2: null,
            winner: playerWithBye, 
            roundIndex: 0,
            matchIndex: numFirstRoundMatches + i,
        });
    }

    bracket.push(firstRound);

    let currentRoundMatches = nextPowerOfTwo / 2;
    let roundIndex = 1;
    while (currentRoundMatches >= 1) {
        const nextRound: KnockoutMatch[] = [];
        if (currentRoundMatches < 1) break;
        for (let i = 0; i < currentRoundMatches / 2; i++) {
            nextRound.push({
                id: `r${roundIndex}-m${i}`,
                player1: null,
                player2: null,
                winner: null,
                roundIndex,
                matchIndex: i,
            });
        }
        if(nextRound.length > 0) bracket.push(nextRound);
        currentRoundMatches /= 2;
        roundIndex++;
    }
    
    // Auto-populate winners from BYE matches to the next round
    if (bracket.length > 1) {
        for(let i=0; i < bracket[0].length; i++) {
            const match = bracket[0][i];
            if (match.winner) {
                const nextRoundMatchIndex = Math.floor(i / 2);
                const nextMatch = bracket[1][nextRoundMatchIndex];
                if (nextMatch) {
                    if (!nextMatch.player1) nextMatch.player1 = match.winner;
                    else if (!nextMatch.player2) nextMatch.player2 = match.winner;
                }
            }
        }
    }

    return bracket;
};

const advanceWinnerInBracket = (bracket: KnockoutBracket, winner: KnockoutPlayer, roundIndex: number, matchIndex: number): KnockoutBracket => {
    const newBracket = JSON.parse(JSON.stringify(bracket));
    const currentMatch = newBracket[roundIndex][matchIndex];
    currentMatch.winner = winner;

    const nextRoundIndex = roundIndex + 1;
    if (newBracket[nextRoundIndex]) {
        const nextMatchIndex = Math.floor(currentMatch.matchIndex / 2);
        if (newBracket[nextRoundIndex][nextMatchIndex]) {
            const nextMatch = newBracket[nextRoundIndex][nextMatchIndex];
            if (!nextMatch.player1) {
                nextMatch.player1 = winner;
            } else if (!nextMatch.player2) {
                nextMatch.player2 = winner;
            }
        }
    }

    return newBracket;
};


const gameReducer = (state: InternalGameState, action: GameAction): InternalGameState => {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...createInitialState(),
        gameStyle: action.payload.gameStyle,
        maxWinners: action.payload.maxWinners,
        knockoutCategory: action.payload.knockoutCategory || null,
        gameState: action.payload.gameStyle === GameStyle.Classic ? GameState.Playing : GameState.KnockoutRegistration,
      };
    case 'START_CLASSIC_MODE': {
      const firstCountry = action.payload.firstCountry;
      return {
        ...state,
        round: 1,
        gameMode: GameMode.GuessTheFlag,
        currentCountry: firstCountry,
        scrambledCountryName: scrambleWord(firstCountry.name),
        isRoundActive: true,
        roundTimer: ROUND_TIMER_SECONDS,
      };
    }
    case 'NEXT_ROUND': {
      if (state.round >= TOTAL_ROUNDS) {
        return { ...state, gameState: GameState.Champion, isRoundActive: false };
      }
      const newRound = state.round + 1;
      
      let newGameMode: GameMode;
      if (action.payload.nextCountry) newGameMode = GameMode.GuessTheFlag;
      else if (action.payload.nextCategory) newGameMode = GameMode.ABC5Dasar;
      else newGameMode = GameMode.GuessTheWord;

      return {
        ...state,
        round: newRound,
        gameMode: newGameMode,
        currentCountry: newGameMode === GameMode.GuessTheFlag ? action.payload.nextCountry : null,
        currentLetter: newGameMode === GameMode.ABC5Dasar ? action.payload.nextLetter : null,
        currentCategory: newGameMode === GameMode.ABC5Dasar ? action.payload.nextCategory : null,
        currentWord: newGameMode === GameMode.GuessTheWord ? action.payload.nextWord : null,
        currentWordCategory: newGameMode === GameMode.GuessTheWord ? action.payload.nextWordCategory : null,
        availableAnswersCount: newGameMode === GameMode.ABC5Dasar ? action.payload.availableAnswersCount : null,
        scrambledCountryName: newGameMode === GameMode.GuessTheFlag && action.payload.nextCountry
            ? scrambleWord(action.payload.nextCountry.name) 
            : newGameMode === GameMode.GuessTheWord && action.payload.nextWord
            ? scrambleWord(action.payload.nextWord)
            : [],
        usedAnswers: [],
        isRoundActive: true,
        roundWinners: [],
        roundTimer: ROUND_TIMER_SECONDS,
        showWinnerModal: false,
        allAnswersFoundInRound: false,
        isPausedByAdmin: false,
        countdownValue: null,
      };
    }
    case 'PROCESS_COMMENT': {
        const message = action.payload;
        const newChatMessages = [message, ...state.chatMessages].slice(0, 100);
        if (!state.isRoundActive) return { ...state, chatMessages: newChatMessages };
        
        const comment = message.comment.trim().toLowerCase();
        
        if (state.gameStyle === GameStyle.Classic) {
            if (state.roundWinners.some(w => w.nickname === message.nickname)) return { ...state, chatMessages: newChatMessages };
            const currentMaxWinners = state.gameMode === GameMode.ABC5Dasar && state.availableAnswersCount != null 
                    ? Math.min(state.maxWinners, state.availableAnswersCount) 
                    : state.maxWinners;
            if (state.roundWinners.length >= currentMaxWinners) return { ...state, chatMessages: newChatMessages };
        } else { // Knockout
            const { currentBracketRoundIndex, currentMatchIndex, knockoutBracket } = state;
            if (currentBracketRoundIndex === null || currentMatchIndex === null || !knockoutBracket) return { ...state, chatMessages: newChatMessages };
            const match = knockoutBracket[currentBracketRoundIndex][currentMatchIndex];
            if (message.nickname !== match.player1?.nickname && message.nickname !== match.player2?.nickname) {
                return { ...state, chatMessages: newChatMessages };
            }
        }
        
        let isCorrect = false;
        let foundAnswer = '';
        if (state.gameMode === GameMode.GuessTheFlag && state.currentCountry) {
            if (comment === state.currentCountry.name.toLowerCase()) {
                isCorrect = true;
                foundAnswer = state.currentCountry.name;
            }
        } else if (state.gameMode === GameMode.GuessTheWord && state.currentWord) {
            if (comment === state.currentWord.toLowerCase()) {
                isCorrect = true;
                foundAnswer = state.currentWord;
            }
        } else if (state.gameMode === GameMode.ABC5Dasar && state.currentLetter && state.currentCategory) {
            if (comment.startsWith(state.currentLetter.toLowerCase())) {
                const validationList = getValidationList(state.currentCategory);
                const validItem = validationList.find(item => comment === item.toLowerCase());
                if (validItem && !state.usedAnswers.includes(validItem.toLowerCase())) {
                    isCorrect = true;
                    foundAnswer = validItem;
                }
            }
        } else if (state.gameMode === GameMode.Trivia && state.currentTriviaQuestion) {
            if (comment === state.currentTriviaQuestion.answer.toLowerCase()) {
                isCorrect = true;
                foundAnswer = state.currentTriviaQuestion.answer;
            }
        }

        if (isCorrect) {
            const winnerPlayer = { nickname: message.nickname, profilePictureUrl: message.profilePictureUrl };
            if (state.gameStyle === GameStyle.Classic) {
                const timeTaken = ROUND_TIMER_SECONDS - state.roundTimer;
                const score = BASE_POINTS + Math.max(0, (ROUND_TIMER_SECONDS - timeTaken) * SPEED_BONUS_MULTIPLIER);
                const newWinner: RoundWinner = { ...winnerPlayer, score, time: timeTaken, answer: state.gameMode === GameMode.ABC5Dasar ? foundAnswer : undefined };
                
                const updatedLeaderboard = [...state.leaderboard];
                const playerIndex = updatedLeaderboard.findIndex(p => p.nickname === message.nickname);
                if (playerIndex > -1) updatedLeaderboard[playerIndex].score += score;
                else updatedLeaderboard.push({ ...winnerPlayer, score });
                updatedLeaderboard.sort((a, b) => b.score - a.score);
                localStorage.setItem('leaderboard', JSON.stringify(updatedLeaderboard));
                
                const updatedSessionLeaderboard = [...state.sessionLeaderboard];
                const sessionPlayerIndex = updatedSessionLeaderboard.findIndex(p => p.nickname === message.nickname);
                if (sessionPlayerIndex > -1) updatedSessionLeaderboard[sessionPlayerIndex].score += score;
                else updatedSessionLeaderboard.push({ ...winnerPlayer, score });
                updatedSessionLeaderboard.sort((a, b) => b.score - a.score);

                return {
                    ...state,
                    chatMessages: [ { ...message, isWinner: true }, ...state.chatMessages].slice(0,100),
                    roundWinners: [...state.roundWinners, newWinner],
                    leaderboard: updatedLeaderboard,
                    sessionLeaderboard: updatedSessionLeaderboard,
                    usedAnswers: state.gameMode === GameMode.ABC5Dasar ? [...state.usedAnswers, foundAnswer.toLowerCase()] : state.usedAnswers,
                };
            } else { // Knockout mode point scored
                const { knockoutMatchPoints, currentBracketRoundIndex, currentMatchIndex, knockoutBracket } = state;
                const match = knockoutBracket![currentBracketRoundIndex!][currentMatchIndex!];
                
                const newPoints = {...knockoutMatchPoints};
                if(winnerPlayer.nickname === match.player1?.nickname) newPoints.player1++;
                else newPoints.player2++;
                
                return { 
                    ...state, 
                    isRoundActive: false,
                    knockoutMatchPoints: newPoints,
                    chatMessages: [ { ...message, isWinner: true }, ...state.chatMessages].slice(0,100),
                };
            }
        }
        return { ...state, chatMessages: newChatMessages };
    }
    case 'TICK_TIMER': {
        if (!state.isRoundActive) return state;
        if (state.roundTimer > 0) {
            return { ...state, roundTimer: state.roundTimer - 1 };
        }
        return state;
    }
    case 'END_ROUND': { 
        if (!state.isRoundActive) return state;
        let updatedWinners = [...state.roundWinners];
        let updatedSessionLeaderboard = [...state.sessionLeaderboard];
        if (state.gameMode === GameMode.ABC5Dasar) {
            const answerCounts = new Map<string, number>();
            updatedWinners.forEach(w => { if(w.answer) { answerCounts.set(w.answer.toLowerCase(), (answerCounts.get(w.answer.toLowerCase()) || 0) + 1); } });
            updatedWinners = updatedWinners.map(w => {
                if (w.answer && answerCounts.get(w.answer.toLowerCase()) === 1) {
                    const newScore = w.score + UNIQUENESS_BONUS_POINTS;
                    const sessionPlayer = updatedSessionLeaderboard.find(p => p.nickname === w.nickname);
                    if(sessionPlayer) sessionPlayer.score += UNIQUENESS_BONUS_POINTS;
                    return { ...w, score: newScore, bonus: UNIQUENESS_BONUS_POINTS };
                }
                return w;
            });
            updatedSessionLeaderboard.sort((a, b) => b.score - a.score);
        }
        return { ...state, isRoundActive: false, showWinnerModal: true, roundWinners: updatedWinners, sessionLeaderboard: updatedSessionLeaderboard };
    }
    case 'SHOW_WINNER_MODAL':
        return { ...state, showWinnerModal: true };
    case 'HIDE_WINNER_MODAL':
        return { ...state, showWinnerModal: false };
    case 'PAUSE_GAME':
        return { ...state, isRoundActive: false, isPausedByAdmin: true, gameState: GameState.Paused };
    case 'RESUME_GAME':
        return { ...state, isRoundActive: true, isPausedByAdmin: false, gameState: state.gameStyle === GameStyle.Classic ? GameState.Playing : GameState.KnockoutPlaying };
    case 'RESET_GAME':
      return createInitialState();
    case 'START_COUNTDOWN':
      return { ...state, countdownValue: 3 };
    case 'TICK_COUNTDOWN':
      if (state.countdownValue && state.countdownValue > 0) {
        return { ...state, countdownValue: state.countdownValue - 1 };
      }
      if (state.gameState === GameState.KnockoutPrepareMatch && state.countdownValue === 1) {
          return { ...state, countdownValue: 0, gameState: GameState.KnockoutPlaying }
      }
      return state;

    // --- KNOCKOUT REDUCERS ---
    case 'REGISTER_PLAYER':
        if (state.knockoutPlayers.some(p => p.nickname === action.payload.nickname)) return state;
        return { ...state, knockoutPlayers: [...state.knockoutPlayers, action.payload] };
    case 'RESET_KNOCKOUT_REGISTRATION':
        return { ...state, knockoutPlayers: [] };
    case 'END_REGISTRATION_AND_DRAW_BRACKET': {
        if(state.knockoutPlayers.length < 2) return state; // Do nothing if not enough players
        const bracket = generateBracket(state.knockoutPlayers);
        return { ...state, gameState: GameState.KnockoutDrawing, knockoutBracket: bracket };
    }
    case 'PREPARE_NEXT_MATCH': {
        const { roundIndex, matchIndex } = action.payload;
        const bracket = state.knockoutBracket;
        const matchToStart = bracket?.[roundIndex]?.[matchIndex];

        if (!matchToStart || !matchToStart.player1 || !matchToStart.player2) {
            console.error("BUG PREVENTED: Attempted to start an incomplete match.", matchToStart);
            return state; 
        }

        return {
            ...state,
            gameState: GameState.KnockoutPrepareMatch,
            countdownValue: KNOCKOUT_PREPARE_SECONDS,
            currentBracketRoundIndex: roundIndex,
            currentMatchIndex: matchIndex,
        };
    }
    case 'START_MATCH': {
        return {
            ...state,
            gameState: GameState.KnockoutPlaying,
            knockoutMatchPoints: { player1: 0, player2: 0 },
            currentCountry: null,
            currentTriviaQuestion: null,
        };
    }
    case 'FINISH_KNOCKOUT_MATCH': {
        const { winner } = action.payload;
        const { currentBracketRoundIndex, currentMatchIndex, knockoutBracket } = state;
        if (currentBracketRoundIndex === null || currentMatchIndex === null || !knockoutBracket) return state;

        const isFinalMatch = currentBracketRoundIndex === knockoutBracket.length - 1 && knockoutBracket[currentBracketRoundIndex].length === 1;

        if (isFinalMatch) {
            const newBracket = JSON.parse(JSON.stringify(knockoutBracket));
            newBracket[currentBracketRoundIndex][currentMatchIndex].winner = winner;
            return {
                ...state,
                isRoundActive: false,
                knockoutBracket: newBracket,
                sessionLeaderboard: [{ ...winner, score: 1 }],
                gameState: GameState.Champion,
            };
        } else {
            const newBracket = advanceWinnerInBracket(knockoutBracket, winner, currentBracketRoundIndex, currentMatchIndex);
            return {
                ...state,
                isRoundActive: false,
                knockoutBracket: newBracket,
                gameState: GameState.KnockoutShowWinner,
            };
        }
    }
    case 'DECLARE_WALKOVER_WINNER': {
        const { roundIndex, matchIndex, winner } = action.payload;
        if (!state.knockoutBracket) return state;
        
        const isFinalMatch = roundIndex === state.knockoutBracket.length - 1 && state.knockoutBracket[roundIndex].length === 1;

        if (isFinalMatch) {
            const newBracket = JSON.parse(JSON.stringify(state.knockoutBracket));
            newBracket[roundIndex][matchIndex].winner = winner;
            return {
                ...state,
                knockoutBracket: newBracket,
                sessionLeaderboard: [{ ...winner, score: 1 }],
                gameState: GameState.Champion,
            };
        } else {
            const newBracket = advanceWinnerInBracket(state.knockoutBracket, winner, roundIndex, matchIndex);
            return {
                ...state,
                knockoutBracket: newBracket,
                gameState: GameState.KnockoutReadyToPlay,
            };
        }
    }
    case 'SET_READY_TO_PLAY': {
        return { ...state, gameState: GameState.KnockoutReadyToPlay };
    }
    case 'RETURN_TO_BRACKET': {
        return { ...state, gameState: GameState.KnockoutReadyToPlay };
    }
    case 'REDRAW_BRACKET': {
        if (!state.knockoutPlayers || state.knockoutPlayers.length < 2) {
            return state; // Not enough players to redraw
        }
        const newBracket = generateBracket(state.knockoutPlayers);
        return {
            ...state,
            knockoutBracket: newBracket,
            currentBracketRoundIndex: null,
            currentMatchIndex: null,
            knockoutMatchPoints: { player1: 0, player2: 0 },
            gameState: GameState.KnockoutDrawing,
        };
    }
    case 'RESTART_KNOCKOUT_COMPETITION':
      return {
        ...state,
        gameState: GameState.KnockoutRegistration,
        knockoutPlayers: [],
        knockoutBracket: null,
        currentBracketRoundIndex: null,
        currentMatchIndex: null,
        knockoutMatchPoints: { player1: 0, player2: 0 },
        sessionLeaderboard: [],
      };
    case 'SET_KNOCKOUT_COUNTRY': {
        return {
            ...state,
            gameMode: GameMode.GuessTheFlag,
            currentCountry: action.payload.country,
            scrambledCountryName: scrambleWord(action.payload.country.name),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'SET_KNOCKOUT_TRIVIA': {
        return {
            ...state,
            gameMode: GameMode.Trivia,
            currentTriviaQuestion: action.payload.question,
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'KNOCKOUT_QUESTION_TIMEOUT': {
        return { ...state, isRoundActive: false };
    }
    case 'SKIP_KNOCKOUT_MATCH': {
        return {
            ...state,
            isRoundActive: false,
            gameState: GameState.KnockoutReadyToPlay,
            knockoutMatchPoints: { player1: 0, player2: 0 },
            currentCountry: null,
            currentTriviaQuestion: null,
        };
    }
    case 'FINISH_GAME':
        return { ...state, gameState: GameState.Finished };
    case 'RETURN_TO_MODE_SELECTION':
        return {
            ...createInitialState(),
            leaderboard: state.leaderboard, // Keep global leaderboard
            gameState: GameState.ModeSelection,
        };
    default:
      return state;
  }
};

const abcCategories: AbcCategory[] = ['Negara', 'Buah', 'Hewan', 'Benda', 'Profesi', 'Kota di Indonesia', 'Tumbuhan'];
const getValidationList = (category: AbcCategory): string[] => {
    switch(category){
        case 'Negara': return countries.map(c => c.name);
        case 'Buah': return fruits;
        case 'Hewan': return animals;
        case 'Benda': return objects;
        case 'Profesi': return professions;
        case 'Kota di Indonesia': return indonesianCities;
        case 'Tumbuhan': return plants;
        default: return [];
    }
};

export const useGameLogic = () => {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  const countryDeck = useRef<Country[]>([]);
  const knockoutCountryDeck = useRef<Country[]>([]);
  const triviaDeck = useRef<TriviaQuestion[]>([]);
  const footballPlayerDeck = useRef<string[]>([]);
  const footballClubDeck = useRef<string[]>([]);
  const usedAbcCombinations = useRef<Set<string>>(new Set());
  const getRandomLetter = () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];

  const prepareNewDecks = useCallback(() => {
    countryDeck.current = shuffleArray(countries);
    knockoutCountryDeck.current = shuffleArray(countries);
    triviaDeck.current = shuffleArray(triviaQuestions);
    footballPlayerDeck.current = shuffleArray(footballPlayers);
    footballClubDeck.current = shuffleArray(footballClubs);
    usedAbcCombinations.current.clear();
  }, []);

  const getNextCountry = useCallback(() => {
    if(countryDeck.current.length === 0) {
        countryDeck.current = shuffleArray(countries);
    }
    return countryDeck.current.pop() as Country
  }, []);

  const getNewKnockoutCountry = useCallback(() => {
    if (knockoutCountryDeck.current.length === 0) {
        knockoutCountryDeck.current = shuffleArray(countries);
    }
    return knockoutCountryDeck.current.pop()!;
  }, []);

  const getNewKnockoutTriviaQuestion = useCallback(() => {
    if (triviaDeck.current.length === 0) {
        triviaDeck.current = shuffleArray(triviaQuestions);
    }
    return triviaDeck.current.pop()!;
  }, []);
  
  const startGame = useCallback((gameStyle: GameStyle, maxWinners: number, knockoutCategory?: KnockoutCategory) => {
    prepareNewDecks();
    dispatch({ type: 'START_GAME', payload: { gameStyle, maxWinners, knockoutCategory } });
    if (gameStyle === GameStyle.Classic) {
        const firstCountry = getNextCountry();
        dispatch({ type: 'START_CLASSIC_MODE', payload: { firstCountry } });
    }
  }, [prepareNewDecks, getNextCountry]);
  
  const nextRound = useCallback(() => {
    const nextRoundNumber = state.round + 1;
    if (nextRoundNumber > TOTAL_ROUNDS) return;

    const nextPayload: Partial<GameActionPayloads['NEXT_ROUND']> = {};
    
    if (nextRoundNumber <= FLAG_ROUNDS_COUNT) {
      nextPayload.nextCountry = getNextCountry();
    } else {
        const modeChoice = Math.random() < 0.5 ? GameMode.ABC5Dasar : GameMode.GuessTheWord;
        if(modeChoice === GameMode.ABC5Dasar) {
            let letter: string, category: AbcCategory, combo: string, attempts = 0;
            do {
                letter = getRandomLetter();
                category = abcCategories[Math.floor(Math.random() * abcCategories.length)];
                combo = `${letter}-${category}`;
                attempts++;
            } while (usedAbcCombinations.current.has(combo) && attempts < 100);
            usedAbcCombinations.current.add(combo);
            const validationList = getValidationList(category);
            const availableAnswers = validationList.filter(item => item.toLowerCase().startsWith(letter.toLowerCase()));
            
            nextPayload.nextLetter = letter;
            nextPayload.nextCategory = category;
            nextPayload.availableAnswersCount = availableAnswers.length;
        } else {
            const category = Math.random() < 0.5 ? 'Pemain Bola' : 'Klub Bola';
            let word: string;
            if (category === 'Pemain Bola') {
                if (footballPlayerDeck.current.length === 0) footballPlayerDeck.current = shuffleArray(footballPlayers);
                word = footballPlayerDeck.current.pop()!;
            } else {
                if (footballClubDeck.current.length === 0) footballClubDeck.current = shuffleArray(footballClubs);
                word = footballClubDeck.current.pop()!;
            }
            nextPayload.nextWord = word;
            nextPayload.nextWordCategory = category;
        }
    }
    dispatch({ type: 'NEXT_ROUND', payload: nextPayload as GameActionPayloads['NEXT_ROUND'] });
  }, [state.round, getNextCountry]);

  const resetGame = useCallback(() => dispatch({ type: 'RESET_GAME' }), []);
  
  const processComment = useCallback((message: ChatMessage) => {
    dispatch({ type: 'PROCESS_COMMENT', payload: message });
  }, []);

  const skipRound = useCallback(() => {
    if (state.isRoundActive || state.gameState === GameState.KnockoutPlaying) {
        if (state.gameStyle === GameStyle.Classic) {
            dispatch({ type: 'END_ROUND' });
        } else if (state.gameStyle === GameStyle.Knockout) {
            dispatch({ type: 'SKIP_KNOCKOUT_MATCH' });
        }
    }
  }, [state.isRoundActive, state.gameStyle, state.gameState]);

  const registerPlayer = useCallback((player: KnockoutPlayer) => {
    if(state.gameState === GameState.KnockoutRegistration) {
      dispatch({ type: 'REGISTER_PLAYER', payload: player });
    }
  }, [state.gameState]);
  
  const resetKnockoutRegistration = useCallback(() => {
    dispatch({ type: 'RESET_KNOCKOUT_REGISTRATION' });
  }, []);

  const endRegistrationAndDrawBracket = useCallback(() => {
    if(state.gameState === GameState.KnockoutRegistration) {
        dispatch({ type: 'END_REGISTRATION_AND_DRAW_BRACKET' });
    }
  }, [state.gameState]);

  const prepareNextMatch = useCallback((payload: { roundIndex: number; matchIndex: number }) => {
      if(state.gameState === GameState.KnockoutReadyToPlay) {
          dispatch({ type: 'PREPARE_NEXT_MATCH', payload });
      }
  }, [state.gameState]);
  
  const declareWalkoverWinner = useCallback((payload: GameActionPayloads['DECLARE_WALKOVER_WINNER']) => {
    dispatch({ type: 'DECLARE_WALKOVER_WINNER', payload });
  }, []);
  
  const returnToBracket = useCallback(() => dispatch({ type: 'RETURN_TO_BRACKET' }), []);
  const redrawBracket = useCallback(() => dispatch({ type: 'REDRAW_BRACKET' }), []);
  const finishGame = useCallback(() => dispatch({ type: 'FINISH_GAME' }), []);
  const restartKnockoutCompetition = useCallback(() => dispatch({ type: 'RESTART_KNOCKOUT_COMPETITION' }), []);
  const returnToModeSelection = useCallback(() => dispatch({ type: 'RETURN_TO_MODE_SELECTION' }), []);

  const pauseGame = useCallback(() => dispatch({ type: 'PAUSE_GAME' }), []);
  const resumeGame = useCallback(() => dispatch({ type: 'RESUME_GAME' }), []);
  
  const getCurrentKnockoutMatch = useCallback(() => {
      const { knockoutBracket, currentBracketRoundIndex, currentMatchIndex } = state;
      if (knockoutBracket && currentBracketRoundIndex !== null && currentMatchIndex !== null) {
          return knockoutBracket[currentBracketRoundIndex][currentMatchIndex];
      }
      return null;
  }, [state.knockoutBracket, state.currentBracketRoundIndex, state.currentMatchIndex]);

  useEffect(() => { prepareNewDecks(); }, [prepareNewDecks]);

  // Timers for timed transitions
  useEffect(() => {
    let timerId: number;
    if (state.isRoundActive && state.roundTimer > 0) {
      timerId = window.setInterval(() => dispatch({ type: 'TICK_TIMER' }), 1000);
    } else if (state.roundTimer <= 0) {
      if (state.gameStyle === GameStyle.Classic && state.isRoundActive) {
          dispatch({ type: 'END_ROUND' });
      } else if (state.gameStyle === GameStyle.Knockout && state.isRoundActive) {
          dispatch({ type: 'KNOCKOUT_QUESTION_TIMEOUT' });
      }
    }
    return () => clearInterval(timerId);
  }, [state.isRoundActive, state.roundTimer, state.gameState, state.gameStyle]);

  useEffect(() => {
    let timerId: number;
    if (state.countdownValue && state.countdownValue > 0) {
      timerId = window.setInterval(() => dispatch({ type: 'TICK_COUNTDOWN' }), 1000);
    } else if (state.countdownValue === 0) {
        if(state.gameState === GameState.KnockoutPrepareMatch) {
            dispatch({ type: 'START_MATCH' });
        } else {
            nextRound();
        }
    }
    return () => clearInterval(timerId);
  }, [state.countdownValue, state.gameState, nextRound]);
  
  useEffect(() => {
    if(state.gameState === GameState.KnockoutDrawing) {
        const timer = setTimeout(() => dispatch({ type: 'SET_READY_TO_PLAY' }), 2000); // 2 seconds to view the bracket
        return () => clearTimeout(timer);
    }
    if(state.gameState === GameState.KnockoutShowWinner) {
        const timer = setTimeout(() => dispatch({ type: 'SET_READY_TO_PLAY' }), KNOCKOUT_WINNER_VIEW_SECONDS * 1000);
        return () => clearTimeout(timer);
    }
  }, [state.gameState]);

  // Logic triggers based on state changes
  useEffect(() => {
    if (state.gameState === GameState.KnockoutPlaying && !state.currentCountry && !state.currentTriviaQuestion) {
        if(state.knockoutCategory === 'GuessTheCountry') {
            const country = getNewKnockoutCountry();
            dispatch({ type: 'SET_KNOCKOUT_COUNTRY', payload: { country } });
        } else if (state.knockoutCategory === 'Trivia') {
            const question = getNewKnockoutTriviaQuestion();
            dispatch({ type: 'SET_KNOCKOUT_TRIVIA', payload: { question } });
        }
    }
  }, [state.gameState, state.currentCountry, state.currentTriviaQuestion, state.knockoutCategory, getNewKnockoutCountry, getNewKnockoutTriviaQuestion]);

  // This effect handles advancing the knockout game after a question is finished
  useEffect(() => {
    if (state.gameState === GameState.KnockoutPlaying && !state.isRoundActive && (state.currentCountry || state.currentTriviaQuestion)) {
      const timeoutId = setTimeout(() => {
        const { player1, player2 } = state.knockoutMatchPoints;
        const match = getCurrentKnockoutMatch();
        if (match && (player1 >= KNOCKOUT_TARGET_SCORE || player2 >= KNOCKOUT_TARGET_SCORE)) {
          const winner = player1 >= KNOCKOUT_TARGET_SCORE ? match.player1! : match.player2!;
          dispatch({ type: 'FINISH_KNOCKOUT_MATCH', payload: { winner } });
        } else {
          // Start next question
          if(state.knockoutCategory === 'GuessTheCountry') {
              const country = getNewKnockoutCountry();
              dispatch({ type: 'SET_KNOCKOUT_COUNTRY', payload: { country } });
          } else if (state.knockoutCategory === 'Trivia') {
              const question = getNewKnockoutTriviaQuestion();
              dispatch({ type: 'SET_KNOCKOUT_TRIVIA', payload: { question } });
          }
        }
      }, 3000); // 3-second delay to show the answer

      return () => clearTimeout(timeoutId);
    }
  }, [state.isRoundActive, state.gameState, state.knockoutMatchPoints, state.currentCountry, state.currentTriviaQuestion, state.knockoutCategory, getCurrentKnockoutMatch, getNewKnockoutCountry, getNewKnockoutTriviaQuestion]);
  
  useEffect(() => {
    if (state.gameStyle === GameStyle.Classic && state.isRoundActive) {
        const currentMaxWinners = state.gameMode === GameMode.ABC5Dasar && state.availableAnswersCount != null 
              ? Math.min(state.maxWinners, state.availableAnswersCount) 
              : state.maxWinners;
        if (state.roundWinners.length >= currentMaxWinners) {
            dispatch({ type: 'END_ROUND' });
        }
    }
  }, [state.roundWinners.length, state.isRoundActive, state.gameStyle, state.maxWinners, state.gameMode, state.availableAnswersCount]);
  
  useEffect(() => {
      if (state.showWinnerModal) {
          const timeoutId = setTimeout(() => {
              dispatch({ type: 'HIDE_WINNER_MODAL' });
              if (state.round < TOTAL_ROUNDS) {
                  dispatch({ type: 'START_COUNTDOWN' });
              } else {
                  // This ensures we transition to the Champion screen after the final round's modal
                  dispatch({ type: 'NEXT_ROUND', payload: {} as GameActionPayloads['NEXT_ROUND'] });
              }
          }, WINNER_MODAL_TIMEOUT_MS);
          return () => clearTimeout(timeoutId);
      }
  }, [state.showWinnerModal, state.round]);

  const getCurrentAnswer = () => {
    switch (state.gameMode) {
      case GameMode.GuessTheFlag:
        return state.currentCountry?.name || '';
      case GameMode.GuessTheWord:
        return state.currentWord || '';
      case GameMode.ABC5Dasar:
        return `(Jawaban Kategori ${state.currentCategory} diawali huruf ${state.currentLetter})`;
      case GameMode.Trivia:
        return state.currentTriviaQuestion?.answer || '';
      default:
        return 'Tidak ada soal aktif';
    }
  };

  return { state, startGame, resetGame, processComment, skipRound, pauseGame, resumeGame, registerPlayer, endRegistrationAndDrawBracket, prepareNextMatch, getCurrentKnockoutMatch, returnToBracket, redrawBracket, declareWalkoverWinner, finishGame, resetKnockoutRegistration, restartKnockoutCompetition, returnToModeSelection, currentAnswer: getCurrentAnswer() };
};