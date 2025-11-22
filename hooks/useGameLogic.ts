
import { useReducer, useCallback, useEffect, useRef } from 'react';
import { Country, ChatMessage, LeaderboardEntry, RoundWinner, GameMode, AbcCategory, WordCategory, GameState, GameStyle, KnockoutPlayer, KnockoutBracket, KnockoutMatch, GameActionPayloads } from '../types';
import { countries } from '../data/countries';
import { fruits } from '../data/fruits';
import { animals } from '../data/animals';
import { objects } from '../data/objects';
import { professions } from '../data/professions';
import { indonesianCities } from '../data/indonesian_cities';
import { plants } from '../data/plants';
import { footballPlayers } from '../data/football_players';
import { footballClubs } from '../data/football_clubs';
import { TOTAL_ROUNDS, ROUND_TIMER_SECONDS, BASE_POINTS, SPEED_BONUS_MULTIPLIER, WINNER_MODAL_TIMEOUT_MS, FLAG_ROUNDS_COUNT, UNIQUENESS_BONUS_POINTS, KNOCKOUT_REGISTRATION_SECONDS } from '../constants';

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
  knockoutPlayers: KnockoutPlayer[];
  knockoutBracket: KnockoutBracket | null;
  currentBracketRoundIndex: number | null;
  currentMatchIndex: number | null;
}

// FIX: Correctly define the GameAction discriminated union type
// using a mapped type for actions with payloads, and add END_ROUND
// to the list of actions without a payload.
type GameAction = 
    | { [K in keyof GameActionPayloads]: { type: K; payload: GameActionPayloads[K] } }[keyof GameActionPayloads]
    | { type: 'END_ROUND' | 'TICK_TIMER' | 'SHOW_WINNER_MODAL' | 'HIDE_WINNER_MODAL' | 'PAUSE_GAME' | 'RESUME_GAME' | 'RESET_GAME' | 'START_COUNTDOWN' | 'TICK_COUNTDOWN' | 'END_REGISTRATION_AND_DRAW_BRACKET' | 'START_KNOCKOUT_GAME' | 'ADVANCE_KNOCKOUT_MATCH' };


const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const scrambleWord = (name: string): LetterObject[][] => {
  const words = name.toUpperCase().split(' ');
  return words.map(word => {
    const mappedLetters = shuffleArray(word.split('').map((char, index) => ({
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
  knockoutPlayers: [],
  knockoutBracket: null,
  currentBracketRoundIndex: null,
  currentMatchIndex: null,
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
    
    if (bracket.length > 1) {
        for(let i=0; i < bracket[0].length; i++) {
            const match = bracket[0][i];
            if (match.winner) {
                const nextRoundMatchIndex = Math.floor(match.matchIndex / 2);
                const nextMatch = bracket[1][nextRoundMatchIndex];
                if (!nextMatch.player1) nextMatch.player1 = match.winner;
                else nextMatch.player2 = match.winner;
            }
        }
    }

    return bracket;
};


const gameReducer = (state: InternalGameState, action: GameAction): InternalGameState => {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...createInitialState(),
        gameStyle: action.payload.gameStyle,
        maxWinners: action.payload.maxWinners,
        gameState: action.payload.gameStyle === GameStyle.Classic ? GameState.Playing : GameState.KnockoutRegistration,
      };
    case 'START_CLASSIC_MODE': {
      const firstCountry = action.payload.deck[0];
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

        if (state.gameStyle === GameStyle.Classic) {
            const currentMaxWinners = state.gameMode === GameMode.ABC5Dasar && state.availableAnswersCount != null 
                    ? Math.min(state.maxWinners, state.availableAnswersCount) 
                    : state.maxWinners;
            if (state.roundWinners.length >= currentMaxWinners || state.roundWinners.some(w => w.nickname === message.nickname)) {
                return { ...state, chatMessages: newChatMessages };
            }
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
        const comment = message.comment.trim().toLowerCase();

        if ((state.gameMode === GameMode.GuessTheFlag && state.currentCountry) || (state.gameMode === GameMode.GuessTheWord && state.currentWord)) {
            const answer = state.gameMode === GameMode.GuessTheFlag ? state.currentCountry!.name : state.currentWord!;
            if (comment.startsWith(answer.toLowerCase())) {
                isCorrect = true;
                foundAnswer = answer;
            }
        } else if (state.gameMode === GameMode.ABC5Dasar && state.currentLetter && state.currentCategory) {
            if (comment.startsWith(state.currentLetter.toLowerCase())) {
                const validationList = getValidationList(state.currentCategory);
                const validItem = validationList.find(item => comment.startsWith(item.toLowerCase()));
                if (validItem && !state.usedAnswers.includes(validItem.toLowerCase())) {
                    isCorrect = true;
                    foundAnswer = validItem;
                }
            }
        }

        if (isCorrect) {
            const timeTaken = ROUND_TIMER_SECONDS - state.roundTimer;
            const score = BASE_POINTS + Math.max(0, (ROUND_TIMER_SECONDS - timeTaken) * SPEED_BONUS_MULTIPLIER);
            const winnerPlayer = { nickname: message.nickname, profilePictureUrl: message.profilePictureUrl };

            if (state.gameStyle === GameStyle.Classic) {
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
            } else { // Knockout mode winner
                 return { ...state, chatMessages: newChatMessages, isRoundActive: false }; 
            }
        }
        return { ...state, chatMessages: newChatMessages };
    }
    case 'TICK_TIMER': {
        if (!state.isRoundActive && state.gameState !== GameState.KnockoutRegistration) return state;
        if (state.roundTimer > 0) {
            return { ...state, roundTimer: state.roundTimer - 1 };
        }
        return state;
    }
    case 'END_ROUND': { 
        if (!state.isRoundActive) return state;
        // Logic for uniqueness bonus in ABC 5 Dasar
        let updatedWinners = [...state.roundWinners];
        let updatedSessionLeaderboard = [...state.sessionLeaderboard];

        if (state.gameMode === GameMode.ABC5Dasar) {
            const answerCounts = new Map<string, number>();
            updatedWinners.forEach(w => {
                if(w.answer) {
                    const ans = w.answer.toLowerCase();
                    answerCounts.set(ans, (answerCounts.get(ans) || 0) + 1);
                }
            });

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
      return state;

    // --- KNOCKOUT REDUCERS ---
    case 'REGISTER_PLAYER':
        if (state.knockoutPlayers.some(p => p.nickname === action.payload.nickname)) {
            return state; // Already registered
        }
        return { ...state, knockoutPlayers: [...state.knockoutPlayers, action.payload] };
    case 'END_REGISTRATION_AND_DRAW_BRACKET': {
        if(state.knockoutPlayers.length < 2) {
            return { ...createInitialState(), gameState: GameState.Setup };
        }
        const bracket = generateBracket(state.knockoutPlayers);
        return { ...state, gameState: GameState.KnockoutDrawing, knockoutBracket: bracket, roundTimer: 0 };
    }
    case 'START_KNOCKOUT_GAME': {
        const firstMatch = state.knockoutBracket?.[0].find(m => !m.winner);
        if (!firstMatch) {
            const secondRound = state.knockoutBracket?.[1];
            if (secondRound && secondRound.length > 0) {
                 return {
                    ...state,
                    gameState: GameState.KnockoutPlaying,
                    currentBracketRoundIndex: 1,
                    currentMatchIndex: 0,
                    isRoundActive: true,
                    roundTimer: ROUND_TIMER_SECONDS,
                 }
            }
            return { ...state, gameState: GameState.Champion }; 
        }
        
        return {
            ...state,
            gameState: GameState.KnockoutPlaying,
            currentBracketRoundIndex: 0,
            currentMatchIndex: firstMatch.matchIndex,
            isRoundActive: true,
            roundTimer: ROUND_TIMER_SECONDS,
        };
    }
    case 'SET_KNOCKOUT_WORD': {
        return {
            ...state,
            gameMode: GameMode.GuessTheWord,
            currentWord: action.payload.word,
            currentWordCategory: action.payload.category,
            scrambledCountryName: scrambleWord(action.payload.word),
            currentCountry: null,
            currentLetter: null,
            currentCategory: null,
        };
    }
    case 'FINISH_KNOCKOUT_MATCH': {
        const { winner } = action.payload;
        const { currentBracketRoundIndex, currentMatchIndex, knockoutBracket } = state;
        if (currentBracketRoundIndex === null || currentMatchIndex === null || !knockoutBracket) return state;
        
        const newBracket = JSON.parse(JSON.stringify(knockoutBracket));
        const currentMatch = newBracket[currentBracketRoundIndex][currentMatchIndex];
        currentMatch.winner = winner;

        const champion = { nickname: winner.nickname, score: 1, profilePictureUrl: winner.profilePictureUrl };

        if (currentBracketRoundIndex === newBracket.length - 1) {
            return { ...state, knockoutBracket: newBracket, sessionLeaderboard: [champion], gameState: GameState.Champion };
        }

        const nextRoundIndex = currentBracketRoundIndex + 1;
        const nextMatchIndex = Math.floor(currentMatchIndex / 2);
        const nextMatch = newBracket[nextRoundIndex][nextMatchIndex];

        if (!nextMatch.player1) {
            nextMatch.player1 = winner;
        } else {
            nextMatch.player2 = winner;
        }
        
        return { ...state, knockoutBracket: newBracket, sessionLeaderboard: [champion], isRoundActive: false };
    }
    case 'ADVANCE_KNOCKOUT_MATCH': {
        const { currentBracketRoundIndex, currentMatchIndex, knockoutBracket } = state;
        if (currentBracketRoundIndex === null || currentMatchIndex === null || !knockoutBracket) return state;
        
        const currentRound = knockoutBracket[currentBracketRoundIndex];
        const nextMatchInRound = currentRound.find(m => m.matchIndex > currentMatchIndex && !m.winner);

        if (nextMatchInRound) {
            return { 
                ...state,
                currentMatchIndex: nextMatchInRound.matchIndex,
                isRoundActive: true,
                roundTimer: ROUND_TIMER_SECONDS
            };
        }
        
        const nextRoundIndex = currentBracketRoundIndex + 1;
        if (nextRoundIndex >= knockoutBracket.length) {
            return state;
        }
        
        const firstMatchOfNextRound = knockoutBracket[nextRoundIndex].find(m => !m.winner);
         if (firstMatchOfNextRound) {
            return {
                ...state,
                currentBracketRoundIndex: nextRoundIndex,
                currentMatchIndex: firstMatchOfNextRound.matchIndex,
                isRoundActive: true,
                roundTimer: ROUND_TIMER_SECONDS,
            };
        }

        // End of tournament
        return state;
    }
    default:
      return state;
  }
};

const abcCategories: AbcCategory[] = ['Negara', 'Buah', 'Hewan', 'Benda', 'Profesi', 'Kota di Indonesia', 'Tumbuhan'];
const wordCategories: WordCategory[] = ['Pemain Bola', 'Klub Bola'];
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
  const footballPlayerDeck = useRef<string[]>([]);
  const footballClubDeck = useRef<string[]>([]);
  const usedAbcCombinations = useRef<Set<string>>(new Set());
  const getRandomLetter = () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];

  const prepareNewDecks = useCallback(() => {
    countryDeck.current = shuffleArray(countries);
    footballPlayerDeck.current = shuffleArray(footballPlayers);
    footballClubDeck.current = shuffleArray(footballClubs);
    usedAbcCombinations.current.clear();
  }, []);

  const getNextCountry = useCallback(() => countryDeck.current.pop() as Country, []);
  
  const startGame = useCallback((gameStyle: GameStyle, maxWinners: number) => {
    prepareNewDecks();
    dispatch({ type: 'START_GAME', payload: { gameStyle, maxWinners } });
    if (gameStyle === GameStyle.Classic) {
        const deck = Array.from({ length: FLAG_ROUNDS_COUNT }, getNextCountry);
        countryDeck.current = deck; // Set deck for the first 10 rounds
        dispatch({ type: 'START_CLASSIC_MODE', payload: { deck } });
    }
  }, [prepareNewDecks, getNextCountry]);
  
  const nextRound = useCallback(() => {
    const nextRoundNumber = state.round + 1;
    if (nextRoundNumber > TOTAL_ROUNDS) return;

    const nextPayload: Partial<GameActionPayloads['NEXT_ROUND']> = {};
    
    if (nextRoundNumber <= FLAG_ROUNDS_COUNT) {
      nextPayload.nextCountry = countryDeck.current[nextRoundNumber - 1];
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
            const category = wordCategories[Math.floor(Math.random() * wordCategories.length)];
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
  }, [state.round]);

  const resetGame = useCallback(() => dispatch({ type: 'RESET_GAME' }), []);
  
  const processComment = useCallback((message: ChatMessage) => {
    if(state.isRoundActive) {
        const originalState = state;
        dispatch({ type: 'PROCESS_COMMENT', payload: message });
        
        if (originalState.gameStyle === GameStyle.Knockout) {
            const comment = message.comment.trim().toLowerCase();
            const answer = originalState.currentWord?.toLowerCase();
            if (answer && comment.startsWith(answer)) {
                dispatch({ type: 'FINISH_KNOCKOUT_MATCH', payload: { winner: { nickname: message.nickname, profilePictureUrl: message.profilePictureUrl }}});
            }
        }
    } else {
       dispatch({ type: 'PROCESS_COMMENT', payload: message });
    }
  }, [state]);

  const skipRound = useCallback(() => {
    if (state.isRoundActive) {
      if(state.gameStyle === GameStyle.Classic) {
        dispatch({ type: 'END_ROUND' });
      } else {
        dispatch({ type: 'ADVANCE_KNOCKOUT_MATCH' });
      }
    }
  }, [state.isRoundActive, state.gameStyle]);

  const registerPlayer = useCallback((player: KnockoutPlayer) => {
    if(state.gameState === GameState.KnockoutRegistration) {
      dispatch({ type: 'REGISTER_PLAYER', payload: player });
    }
  }, [state.gameState]);

  const pauseGame = useCallback(() => dispatch({ type: 'PAUSE_GAME' }), []);
  const resumeGame = useCallback(() => dispatch({ type: 'RESUME_GAME' }), []);

  useEffect(() => { prepareNewDecks(); }, [prepareNewDecks]);

  useEffect(() => {
    let timerId: number;
    if ((state.isRoundActive || state.gameState === GameState.KnockoutRegistration) && state.roundTimer > 0) {
      timerId = window.setInterval(() => dispatch({ type: 'TICK_TIMER' }), 1000);
    } else if (state.roundTimer <= 0) {
      if (state.gameState === GameState.KnockoutRegistration) {
          dispatch({ type: 'END_REGISTRATION_AND_DRAW_BRACKET' });
      } else if (state.gameStyle === GameStyle.Classic && state.isRoundActive) {
          dispatch({ type: 'END_ROUND' });
      } else if (state.gameStyle === GameStyle.Knockout && state.isRoundActive) { 
          dispatch({ type: 'ADVANCE_KNOCKOUT_MATCH' });
      }
    }
    return () => clearInterval(timerId);
  }, [state.isRoundActive, state.roundTimer, state.gameState, state.gameStyle]);

  useEffect(() => {
    if (state.gameState === GameState.KnockoutDrawing) {
        const timer = setTimeout(() => dispatch({ type: 'START_KNOCKOUT_GAME' }), 5000); 
        return () => clearTimeout(timer);
    }
  }, [state.gameState]);

  useEffect(() => {
    if (state.gameState === GameState.KnockoutPlaying && state.isRoundActive) {
        const category = wordCategories[Math.floor(Math.random() * wordCategories.length)];
        let word: string;
        if (category === 'Pemain Bola') {
            if (footballPlayerDeck.current.length === 0) footballPlayerDeck.current = shuffleArray(footballPlayers);
            word = footballPlayerDeck.current.pop()!;
        } else {
            if (footballClubDeck.current.length === 0) footballClubDeck.current = shuffleArray(footballClubs);
            word = footballClubDeck.current.pop()!;
        }
        dispatch({ type: 'SET_KNOCKOUT_WORD', payload: { word, category }});
    }
  }, [state.gameState, state.isRoundActive, state.currentMatchIndex, state.currentBracketRoundIndex]);
  
  useEffect(() => {
      if (state.gameState === GameState.KnockoutPlaying && !state.isRoundActive && !state.isPausedByAdmin) {
          const timer = setTimeout(() => dispatch({ type: 'ADVANCE_KNOCKOUT_MATCH' }), 3000); 
          return () => clearTimeout(timer);
      }
  }, [state.gameState, state.isRoundActive, state.isPausedByAdmin, state.currentMatchIndex]);

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
              }
          }, WINNER_MODAL_TIMEOUT_MS);
          return () => clearTimeout(timeoutId);
      }
  }, [state.showWinnerModal, state.round]);

  useEffect(() => {
    let timerId: number;
    if (state.countdownValue && state.countdownValue > 0) {
      timerId = window.setInterval(() => dispatch({ type: 'TICK_COUNTDOWN' }), 1000);
    } else if (state.countdownValue === 0) {
      nextRound();
    }
    return () => clearInterval(timerId);
  }, [state.countdownValue, nextRound]);

  return { state, startGame, resetGame, processComment, skipRound, pauseGame, resumeGame, registerPlayer };
};