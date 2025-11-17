
import { useReducer, useCallback, useEffect, useRef } from 'react';
import { Country, ChatMessage, LeaderboardEntry, RoundWinner, GameMode, AbcCategory, WordCategory } from '../types';
import { countries } from '../data/countries';
import { fruits } from '../data/fruits';
import { animals } from '../data/animals';
import { objects } from '../data/objects';
import { professions } from '../data/professions';
import { indonesianCities } from '../data/indonesian_cities';
import { plants } from '../data/plants';
import { footballPlayers } from '../data/football_players';
import { footballClubs } from '../data/football_clubs';
import { TOTAL_ROUNDS, ROUND_TIMER_SECONDS, DEFAULT_MAX_WINNERS_PER_ROUND, BASE_POINTS, SPEED_BONUS_MULTIPLIER, WINNER_MODAL_TIMEOUT_MS, ABC_5_DASAR_START_ROUND, UNIQUENESS_BONUS_POINTS } from '../constants';

interface LetterObject {
  id: string;
  letter: string;
}

interface GameState {
  round: number;
  gameMode: GameMode;
  currentCountry: Country | null;
  currentLetter: string | null;
  currentCategory: AbcCategory | null;
  currentWord: string | null;
  currentWordCategory: WordCategory | null;
  usedAnswers: string[]; // For ABC 5 Dasar to prevent duplicate country names
  scrambledCountryName: LetterObject[][];
  chatMessages: ChatMessage[];
  leaderboard: LeaderboardEntry[];
  sessionLeaderboard: LeaderboardEntry[];
  roundWinners: RoundWinner[];
  isRoundActive: boolean;
  roundTimer: number;
  isGameOver: boolean;
  showWinnerModal: boolean;
  availableAnswersCount: number | null;
  allAnswersFoundInRound: boolean;
  maxWinners: number;
  isPausedByAdmin: boolean;
}

type GameAction =
  | { type: 'START_GAME'; payload: Country[] }
  | { type: 'NEXT_ROUND'; payload: { 
      nextCountry?: Country, 
      nextLetter?: string, 
      nextCategory?: AbcCategory, 
      availableAnswersCount?: number,
      nextWord?: string,
      nextWordCategory?: WordCategory,
    } }
  | { type: 'PROCESS_COMMENT'; payload: ChatMessage }
  | { type: 'END_ROUND'; payload?: { allAnswersFound: boolean } }
  | { type: 'TICK_TIMER' }
  | { type: 'SHOW_WINNER_MODAL' }
  | { type: 'HIDE_WINNER_MODAL' }
  | { type: 'SET_MAX_WINNERS'; payload: number }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESET_GAME' };

const createInitialState = (maxWinners: number): GameState => ({
  round: 0,
  gameMode: GameMode.GuessTheFlag,
  currentCountry: null,
  currentLetter: null,
  currentCategory: null,
  currentWord: null,
  currentWordCategory: null,
  usedAnswers: [],
  scrambledCountryName: [],
  chatMessages: [],
  leaderboard: JSON.parse(localStorage.getItem('leaderboard') || '[]'),
  sessionLeaderboard: [],
  roundWinners: [],
  isRoundActive: false,
  roundTimer: ROUND_TIMER_SECONDS,
  isGameOver: false,
  showWinnerModal: false,
  availableAnswersCount: null,
  allAnswersFoundInRound: false,
  maxWinners: maxWinners,
  isPausedByAdmin: false,
});

const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const scrambleWord = (name: string): LetterObject[][] => {
  const words = name.toUpperCase().split(' ');
  return words.map(word => {
    const letters = word.replace(/[^A-Z]/g, '').split('');
    const mappedLetters = letters.map((char, index) => ({
      id: `${word}-${index}-${char}`, // ID stabil berdasarkan kata dan posisi asli
      letter: char,
    }));
    return shuffleArray(mappedLetters);
  });
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_GAME': {
      const firstCountry = action.payload[0];
      return {
        ...createInitialState(state.maxWinners),
        leaderboard: state.leaderboard,
        round: 1,
        gameMode: GameMode.GuessTheFlag,
        currentCountry: firstCountry,
        scrambledCountryName: scrambleWord(firstCountry.name),
        isRoundActive: true,
      };
    }
    case 'NEXT_ROUND': {
      if (state.round >= TOTAL_ROUNDS) {
        return { ...state, isGameOver: true, isRoundActive: false };
      }
      const newRound = state.round + 1;
      
      let newGameMode: GameMode;
      if (action.payload.nextCountry) {
        newGameMode = GameMode.GuessTheFlag;
      } else if (action.payload.nextCategory) {
        newGameMode = GameMode.ABC5Dasar;
      } else {
        newGameMode = GameMode.GuessTheWord;
      }

      return {
        ...state,
        round: newRound,
        gameMode: newGameMode,
        currentCountry: newGameMode === GameMode.GuessTheFlag ? action.payload.nextCountry! : null,
        currentLetter: newGameMode === GameMode.ABC5Dasar ? action.payload.nextLetter! : null,
        currentCategory: newGameMode === GameMode.ABC5Dasar ? action.payload.nextCategory! : null,
        currentWord: newGameMode === GameMode.GuessTheWord ? action.payload.nextWord! : null,
        currentWordCategory: newGameMode === GameMode.GuessTheWord ? action.payload.nextWordCategory! : null,
        availableAnswersCount: newGameMode === GameMode.ABC5Dasar ? action.payload.availableAnswersCount! : null,
        scrambledCountryName: newGameMode === GameMode.GuessTheFlag 
            ? scrambleWord(action.payload.nextCountry!.name) 
            : newGameMode === GameMode.GuessTheWord 
            ? scrambleWord(action.payload.nextWord!)
            : [],
        usedAnswers: [],
        isRoundActive: true,
        roundWinners: [],
        roundTimer: ROUND_TIMER_SECONDS,
        showWinnerModal: false,
        allAnswersFoundInRound: false, // Reset for new round
        isPausedByAdmin: false, // Ensure not paused on new round
      };
    }
    case 'PROCESS_COMMENT': {
      const message = action.payload;
      let newChatMessages = [message, ...state.chatMessages];
      if (newChatMessages.length > 50) newChatMessages = newChatMessages.slice(0, 50);

      const currentMaxWinners = state.gameMode === GameMode.ABC5Dasar && state.availableAnswersCount != null 
            ? Math.min(state.maxWinners, state.availableAnswersCount) 
            : state.maxWinners;

      if (
        !state.isRoundActive ||
        state.roundWinners.length >= currentMaxWinners ||
        state.roundWinners.some(w => w.nickname === message.nickname)
      ) {
        return { ...state, chatMessages: newChatMessages };
      }

      let isCorrect = false;
      let foundAnswer = '';
      const comment = message.comment.trim().toLowerCase();

      if (state.gameMode === GameMode.GuessTheFlag && state.currentCountry) {
        if (comment.startsWith(state.currentCountry.name.toLowerCase())) {
          isCorrect = true;
          foundAnswer = state.currentCountry.name;
        }
      } else if (state.gameMode === GameMode.GuessTheWord && state.currentWord) {
          if (comment.startsWith(state.currentWord.toLowerCase())) {
              isCorrect = true;
              foundAnswer = state.currentWord;
          }
      } else if (state.gameMode === GameMode.ABC5Dasar && state.currentLetter && state.currentCategory) {
          const startsWithCorrectLetter = comment.startsWith(state.currentLetter.toLowerCase());
          
          if (startsWithCorrectLetter) {
            let validationList: string[] = [];
            switch (state.currentCategory) {
                case 'Negara':
                    validationList = countries.map(c => c.name);
                    break;
                case 'Buah':
                    validationList = fruits;
                    break;
                case 'Hewan':
                    validationList = animals;
                    break;
                case 'Benda':
                    validationList = objects;
                    break;
                case 'Profesi':
                    validationList = professions;
                    break;
                case 'Kota di Indonesia':
                    validationList = indonesianCities;
                    break;
                case 'Tumbuhan':
                    validationList = plants;
                    break;
            }

            // Find the first valid item that the comment starts with
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

        const newWinner: RoundWinner = {
          nickname: message.nickname,
          score,
          profilePictureUrl: message.profilePictureUrl,
          time: timeTaken,
          answer: state.gameMode === GameMode.ABC5Dasar ? foundAnswer : undefined,
        };
        
        const updatedLeaderboard = [...state.leaderboard];
        const playerIndex = updatedLeaderboard.findIndex(p => p.nickname === message.nickname);
        if (playerIndex > -1) {
          updatedLeaderboard[playerIndex].score += score;
        } else {
          updatedLeaderboard.push({ nickname: message.nickname, score, profilePictureUrl: message.profilePictureUrl });
        }
        updatedLeaderboard.sort((a, b) => b.score - a.score);
        localStorage.setItem('leaderboard', JSON.stringify(updatedLeaderboard));

        const updatedSessionLeaderboard = [...state.sessionLeaderboard];
        const sessionPlayerIndex = updatedSessionLeaderboard.findIndex(p => p.nickname === message.nickname);
         if (sessionPlayerIndex > -1) {
          updatedSessionLeaderboard[sessionPlayerIndex].score += score;
        } else {
          updatedSessionLeaderboard.push({ nickname: message.nickname, score, profilePictureUrl: message.profilePictureUrl });
        }
        updatedSessionLeaderboard.sort((a, b) => b.score - a.score);

        return {
          ...state,
          chatMessages: [{...message, isWinner: true}, ...state.chatMessages.slice(0,49)],
          roundWinners: [...state.roundWinners, newWinner],
          leaderboard: updatedLeaderboard,
          sessionLeaderboard: updatedSessionLeaderboard,
          usedAnswers: state.gameMode === GameMode.ABC5Dasar ? [...state.usedAnswers, foundAnswer.toLowerCase()] : state.usedAnswers,
        };
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
        if (!state.isRoundActive) return state; // Prevent multiple calls

        let finalRoundWinners = [...state.roundWinners];
        let finalSessionLeaderboard = [...state.sessionLeaderboard];
        let finalLeaderboard = [...state.leaderboard];
        let didUpdateScores = false;

        // Uniqueness bonus logic for ABC 5 Dasar
        if (state.gameMode === GameMode.ABC5Dasar && state.roundWinners.length > 0) {
            const answerCounts = state.roundWinners.reduce((acc, winner) => {
                if (winner.answer) {
                    const lowerAnswer = winner.answer.toLowerCase();
                    acc[lowerAnswer] = (acc[lowerAnswer] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

            const winnersWithBonus = new Map<string, number>(); // nickname -> bonus

            state.roundWinners.forEach(winner => {
                if (winner.answer && answerCounts[winner.answer.toLowerCase()] === 1) {
                    winnersWithBonus.set(winner.nickname, UNIQUENESS_BONUS_POINTS);
                }
            });

            if (winnersWithBonus.size > 0) {
                didUpdateScores = true;
                
                // Update roundWinners with bonus info and new total score
                finalRoundWinners = finalRoundWinners.map(w => {
                    const bonus = winnersWithBonus.get(w.nickname);
                    if (bonus) {
                        return { ...w, bonus, score: w.score + bonus };
                    }
                    return w;
                });

                // Apply bonus to leaderboards
                winnersWithBonus.forEach((bonus, nickname) => {
                    const sessionPlayerIndex = finalSessionLeaderboard.findIndex(p => p.nickname === nickname);
                    if (sessionPlayerIndex > -1) {
                        finalSessionLeaderboard[sessionPlayerIndex].score += bonus;
                    }
                    const globalPlayerIndex = finalLeaderboard.findIndex(p => p.nickname === nickname);
                    if (globalPlayerIndex > -1) {
                        finalLeaderboard[globalPlayerIndex].score += bonus;
                    }
                });

                finalSessionLeaderboard.sort((a, b) => b.score - a.score);
                finalLeaderboard.sort((a, b) => b.score - a.score);
                localStorage.setItem('leaderboard', JSON.stringify(finalLeaderboard));
            }
        }
        
        // Reveal animation logic for Guess The Flag
        let revealedAnswer = state.scrambledCountryName;
        if ((state.gameMode === GameMode.GuessTheFlag && state.currentCountry) || (state.gameMode === GameMode.GuessTheWord && state.currentWord)) {
            const wordToReveal = state.gameMode === GameMode.GuessTheFlag ? state.currentCountry!.name : state.currentWord!;
            const words = wordToReveal.toUpperCase().split(' ');
            revealedAnswer = words.map(word => {
                const letters = word.replace(/[^A-Z]/g, '').split('');
                return letters.map((char, index) => ({
                    id: `${word}-${index}-${char}`,
                    letter: char
                }));
            });
        }
        
        return { 
            ...state, 
            isRoundActive: false, 
            scrambledCountryName: revealedAnswer,
            allAnswersFoundInRound: action.payload?.allAnswersFound || false,
            isPausedByAdmin: false, // Round ended, so not paused anymore
            ...(didUpdateScores ? {
                roundWinners: finalRoundWinners,
                sessionLeaderboard: finalSessionLeaderboard,
                leaderboard: finalLeaderboard,
            } : {})
        };
    }
    case 'SHOW_WINNER_MODAL':
        return { ...state, showWinnerModal: true };
    case 'HIDE_WINNER_MODAL':
        return { ...state, showWinnerModal: false };
    case 'SET_MAX_WINNERS':
        return { ...state, maxWinners: action.payload };
    case 'PAUSE_GAME':
        return { ...state, isRoundActive: false, isPausedByAdmin: true };
    case 'RESUME_GAME':
        return { ...state, isRoundActive: true, isPausedByAdmin: false };
    case 'RESET_GAME':
      return { ...createInitialState(state.maxWinners), leaderboard: JSON.parse(localStorage.getItem('leaderboard') || '[]') };
    default:
      return state;
  }
};

const abcCategories: AbcCategory[] = ['Negara', 'Buah', 'Hewan', 'Benda', 'Profesi', 'Kota di Indonesia', 'Tumbuhan'];
const wordCategories: WordCategory[] = ['Pemain Bola', 'Klub Bola'];

const getValidationList = (category: AbcCategory): string[] => {
    switch (category) {
        case 'Negara':
            return countries.map(c => c.name);
        case 'Buah':
            return fruits;
        case 'Hewan':
            return animals;
        case 'Benda':
            return objects;
        case 'Profesi':
            return professions;
        case 'Kota di Indonesia':
            return indonesianCities;
        case 'Tumbuhan':
            return plants;
        default:
             return [];
    }
};

export const useGameLogic = (maxWinners: number = DEFAULT_MAX_WINNERS_PER_ROUND) => {
  const [state, dispatch] = useReducer(gameReducer, createInitialState(maxWinners));
  const countryDeck = useRef<Country[]>([]);

  useEffect(() => {
    dispatch({ type: 'SET_MAX_WINNERS', payload: maxWinners });
  }, [maxWinners]);

  const prepareNewDeck = useCallback(() => {
    countryDeck.current = shuffleArray(countries);
  }, []);

  const getNextCountry = useCallback(() => {
    if (countryDeck.current.length === 0) {
      prepareNewDeck();
    }
    return countryDeck.current.pop() as Country;
  }, [prepareNewDeck]);
  
  const getRandomLetter = () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];

  const startGame = useCallback(() => {
    prepareNewDeck();
    const firstCountries = Array.from({ length: TOTAL_ROUNDS }, getNextCountry);
    countryDeck.current = firstCountries; // Use this deck for the session
    dispatch({ type: 'START_GAME', payload: firstCountries });
  }, [prepareNewDeck, getNextCountry]);
  
  const nextRound = useCallback(() => {
    const currentRound = state.round + 1;
    const nextPayload: { 
        nextCountry?: Country, 
        nextLetter?: string, 
        nextCategory?: AbcCategory, 
        availableAnswersCount?: number,
        nextWord?: string,
        nextWordCategory?: WordCategory,
    } = {};

    if (currentRound < ABC_5_DASAR_START_ROUND) {
      nextPayload.nextCountry = getNextCountry();
    } else {
      const modeChoice = Math.random() < 0.5 ? GameMode.ABC5Dasar : GameMode.GuessTheWord;
      
      if (modeChoice === GameMode.ABC5Dasar) {
        let letter: string;
        let category: AbcCategory;
        let availableAnswersCount = 0;
        let retries = 0;
        const maxRetries = 50; // Safeguard against potential infinite loops

        do {
          letter = getRandomLetter();
          category = abcCategories[Math.floor(Math.random() * abcCategories.length)];
          const validationList = getValidationList(category);
          
          availableAnswersCount = validationList.filter(item => 
              item.trim().toLowerCase().startsWith(letter.toLowerCase())
          ).length;
          retries++;
        } while (availableAnswersCount === 0 && retries < maxRetries);

        nextPayload.nextLetter = letter;
        nextPayload.nextCategory = category;
        nextPayload.availableAnswersCount = availableAnswersCount;
      } else { // GameMode.GuessTheWord
        const category = wordCategories[Math.floor(Math.random() * wordCategories.length)];
        const wordList = category === 'Pemain Bola' ? footballPlayers : footballClubs;
        const word = wordList[Math.floor(Math.random() * wordList.length)];
        
        nextPayload.nextWord = word;
        nextPayload.nextWordCategory = category;
      }
    }
    
    dispatch({ type: 'NEXT_ROUND', payload: nextPayload });
  }, [getNextCountry, state.round]);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
    prepareNewDeck();
  }, [prepareNewDeck]);
  
  const processComment = useCallback((message: ChatMessage) => dispatch({ type: 'PROCESS_COMMENT', payload: message }), []);

  const skipRound = useCallback(() => {
    if (state.isRoundActive) {
      dispatch({ type: 'END_ROUND', payload: { allAnswersFound: false } });
    }
  }, [state.isRoundActive]);

  const pauseGame = useCallback(() => dispatch({ type: 'PAUSE_GAME' }), []);
  const resumeGame = useCallback(() => dispatch({ type: 'RESUME_GAME' }), []);

  useEffect(() => {
    prepareNewDeck();
  }, [prepareNewDeck]);

  // Starts timer as soon as round is active
  useEffect(() => {
    let timerId: number;
    if (state.isRoundActive) {
      timerId = window.setInterval(() => {
        dispatch({ type: 'TICK_TIMER' });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [state.isRoundActive]);
  
  // Ends round when timer hits 0 or max winners is reached
  useEffect(() => {
      const currentMaxWinners = state.gameMode === GameMode.ABC5Dasar && state.availableAnswersCount != null 
            ? Math.min(state.maxWinners, state.availableAnswersCount) 
            : state.maxWinners;

      if (state.isRoundActive && (state.roundTimer <= 0 || state.roundWinners.length >= currentMaxWinners)) {
          const allAnswersFound = state.gameMode === GameMode.ABC5Dasar &&
                                  state.availableAnswersCount != null &&
                                  state.roundWinners.length > 0 && // Make sure there's at least one winner
                                  state.roundWinners.length === state.availableAnswersCount;
          dispatch({ type: 'END_ROUND', payload: { allAnswersFound } });
      }
  }, [state.roundTimer, state.roundWinners.length, state.isRoundActive, state.gameMode, state.availableAnswersCount, state.maxWinners]);

  // Shows winner modal when a round ends, after a delay for the reveal animation
  useEffect(() => {
      if (!state.isRoundActive && !state.isPausedByAdmin && state.round > 0 && !state.isGameOver) {
          const timeoutId = setTimeout(() => {
              dispatch({ type: 'SHOW_WINNER_MODAL' });
          }, 3000); // Delay to let reveal animation play and be seen
          return () => clearTimeout(timeoutId);
      }
  }, [state.isRoundActive, state.isPausedByAdmin, state.round, state.isGameOver]);

  // Hides modal and proceeds to next round after a delay
  useEffect(() => {
      if (state.showWinnerModal) {
          const timeoutId = setTimeout(() => {
              dispatch({ type: 'HIDE_WINNER_MODAL' });
              nextRound();
          }, WINNER_MODAL_TIMEOUT_MS);
          return () => clearTimeout(timeoutId);
      }
  }, [state.showWinnerModal, nextRound]);

  return {
    state,
    startGame,
    resetGame,
    processComment,
    skipRound,
    nextRound,
    pauseGame,
    resumeGame,
  };
};